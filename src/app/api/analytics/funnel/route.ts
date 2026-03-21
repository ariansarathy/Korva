import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode, DEMO_FUNNEL } from "@/lib/demo";

/**
 * GET /api/analytics/funnel?days=30
 * Returns order status funnel with drop-off rates.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json(DEMO_FUNNEL);
  }

  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const days = Math.min(
      365,
      Math.max(1, parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10))
    );
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    const supabase = await createClient();

    const { data: orders, error } = await supabase
      .from("orders")
      .select("status")
      .eq("store_id", store.id)
      .gte("created_at", since);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    const allOrders = orders ?? [];
    const total = allOrders.length;

    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const order of allOrders) {
      statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    }

    // Define funnel stages (cumulative — paid includes fulfilled)
    const pendingCount = statusCounts["pending"] ?? 0;
    const paidCount = statusCounts["paid"] ?? 0;
    const fulfilledCount = statusCounts["fulfilled"] ?? 0;
    const cancelledCount = statusCounts["cancelled"] ?? 0;
    const refundedCount = statusCounts["refunded"] ?? 0;

    // Funnel: all orders → paid+fulfilled → fulfilled
    const stageAllOrders = total;
    const stagePaid = paidCount + fulfilledCount; // paid or beyond
    const stageFulfilled = fulfilledCount;

    const stages = [
      {
        name: "All Orders",
        count: stageAllOrders,
        conversion_pct: 100,
        dropoff_pct: 0,
      },
      {
        name: "Paid",
        count: stagePaid,
        conversion_pct: stageAllOrders > 0 ? Math.round((stagePaid / stageAllOrders) * 100) : 0,
        dropoff_pct: stageAllOrders > 0 ? Math.round(((stageAllOrders - stagePaid) / stageAllOrders) * 100) : 0,
      },
      {
        name: "Fulfilled",
        count: stageFulfilled,
        conversion_pct: stageAllOrders > 0 ? Math.round((stageFulfilled / stageAllOrders) * 100) : 0,
        dropoff_pct: stagePaid > 0 ? Math.round(((stagePaid - stageFulfilled) / stagePaid) * 100) : 0,
      },
    ];

    return NextResponse.json({
      stages,
      summary: {
        total,
        cancelled: cancelledCount,
        refunded: refundedCount,
      },
      period_days: days,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
