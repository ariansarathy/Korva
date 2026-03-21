import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/dispatcher";
import { renderInventoryAlertEmail } from "@/lib/notifications/templates";

const LOW_STOCK_THRESHOLD = 10;

/**
 * POST /api/cron/inventory-alerts
 * Protected by CRON_SECRET. Checks for low-inventory products across all active stores.
 * Sends alerts to users with inventory_alerts enabled.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Get all active stores
    const { data: stores } = await adminSupabase
      .from("stores")
      .select("id, user_id, name")
      .eq("sync_status", "synced");

    if (!stores || stores.length === 0) {
      return NextResponse.json({ processed: 0, alerts: 0 });
    }

    let totalAlerts = 0;

    for (const store of stores) {
      try {
        // Find low-stock products
        const { data: lowStockProducts } = await adminSupabase
          .from("products")
          .select("title, inventory_qty, sku")
          .eq("store_id", store.id)
          .eq("status", "active")
          .lte("inventory_qty", LOW_STOCK_THRESHOLD)
          .order("inventory_qty", { ascending: true })
          .limit(20);

        if (!lowStockProducts || lowStockProducts.length === 0) continue;

        totalAlerts++;

        const emailHtml = renderInventoryAlertEmail(store.name, lowStockProducts);

        await sendNotification(store.user_id, store.id, {
          type: "inventory_alert",
          subject: `Low Inventory Alert — ${store.name}`,
          emailHtml,
          slackMessage: {
            title: `📦 Low Inventory Alert — ${store.name}`,
            fallbackText: `${lowStockProducts.length} product(s) running low in ${store.name}`,
            sections: lowStockProducts.slice(0, 5).map((p) => ({
              text: `*${p.title}*: ${p.inventory_qty} units remaining${p.sku ? ` (SKU: ${p.sku})` : ""}`,
              type: (p.inventory_qty <= 0 ? "critical" : "warning") as "warning" | "critical",
            })),
            footer: `${lowStockProducts.length > 5 ? `+ ${lowStockProducts.length - 5} more products` : ""} • Korva Analytics`,
          },
        });
      } catch (err) {
        console.error(`Inventory check failed for store ${store.id}:`, err);
      }
    }

    return NextResponse.json({
      processed: stores.length,
      alerts: totalAlerts,
    });
  } catch (error) {
    console.error("Cron inventory-alerts error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
