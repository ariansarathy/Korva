import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/segment-recalculation
 * Daily cron: re-classify customers based on order recency.
 *
 * Segments:
 * - churned: last order > 180 days ago
 * - at_risk: last order 90-180 days ago
 * - active: last order 30-90 days ago with 2+ orders
 * - new: last order < 30 days ago with 1 order
 * - vip: high LTV (top 10%) or 10+ orders
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get all active stores
    const { data: stores } = await supabase
      .from("stores")
      .select("id")
      .in("sync_status", ["synced", "syncing"]);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ message: "No stores to process" });
    }

    let totalUpdated = 0;

    for (const store of stores) {
      try {
        // Fetch all customers for this store
        const { data: customers } = await supabase
          .from("customers")
          .select("id, order_count, lifetime_value, last_order_date, segment")
          .eq("store_id", store.id);

        if (!customers || customers.length === 0) continue;

        // Compute VIP threshold (top 10% by lifetime_value)
        const sortedByLTV = [...customers]
          .filter((c) => (c.lifetime_value ?? 0) > 0)
          .sort((a, b) => (b.lifetime_value ?? 0) - (a.lifetime_value ?? 0));
        const vipThreshold =
          sortedByLTV.length > 0
            ? sortedByLTV[Math.floor(sortedByLTV.length * 0.1)]
                ?.lifetime_value ?? 0
            : Infinity;

        const now = Date.now();

        for (const customer of customers) {
          const orderCount = customer.order_count ?? 0;
          const ltv = customer.lifetime_value ?? 0;
          const lastOrderDate = customer.last_order_date;

          let newSegment: string;

          // VIP check first — high LTV or 10+ orders
          if (orderCount >= 10 || (ltv >= vipThreshold && vipThreshold > 0)) {
            newSegment = "vip";
          } else if (!lastOrderDate) {
            // No orders at all
            newSegment = "new";
          } else {
            const daysSinceLastOrder = Math.floor(
              (now - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceLastOrder > 180) {
              newSegment = "churned";
            } else if (daysSinceLastOrder > 90) {
              newSegment = "at_risk";
            } else if (daysSinceLastOrder <= 30 && orderCount <= 1) {
              newSegment = "new";
            } else {
              newSegment = "active";
            }
          }

          // Only update if segment changed
          if (newSegment !== customer.segment) {
            await supabase
              .from("customers")
              .update({ segment: newSegment })
              .eq("id", customer.id);
            totalUpdated++;
          }
        }
      } catch (storeError) {
        console.error(
          `Segment recalculation error for store ${store.id}:`,
          storeError
        );
      }
    }

    return NextResponse.json({
      success: true,
      stores_processed: stores.length,
      customers_updated: totalUpdated,
    });
  } catch (error) {
    console.error("Segment recalculation cron error:", error);
    return NextResponse.json(
      { error: "Segment recalculation failed" },
      { status: 500 }
    );
  }
}
