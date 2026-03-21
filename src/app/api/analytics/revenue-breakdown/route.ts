import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode, DEMO_REVENUE_BREAKDOWN } from "@/lib/demo";

/**
 * GET /api/analytics/revenue-breakdown?breakdown=category|channel|hour&days=30
 * Returns revenue segmented by category, channel, or hour-of-day.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    const breakdown = request.nextUrl.searchParams.get("breakdown") ?? "category";
    const data = DEMO_REVENUE_BREAKDOWN[breakdown as keyof typeof DEMO_REVENUE_BREAKDOWN] ?? DEMO_REVENUE_BREAKDOWN.category;
    return NextResponse.json(data);
  }

  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const breakdown = request.nextUrl.searchParams.get("breakdown") ?? "category";
    const validBreakdowns = ["category", "channel", "hour"];
    if (!validBreakdowns.includes(breakdown)) {
      return NextResponse.json(
        { error: "Invalid breakdown type. Use: category, channel, or hour" },
        { status: 400 }
      );
    }

    const days = Math.min(
      365,
      Math.max(1, parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10))
    );
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    const supabase = await createClient();

    if (breakdown === "category") {
      // Join order_items → products for category grouping
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total")
        .eq("store_id", store.id)
        .gte("created_at", since)
        .in("status", ["paid", "fulfilled"]);

      const orderIds = (orders ?? []).map((o) => o.id);

      if (orderIds.length === 0) {
        return NextResponse.json({ segments: [], type: breakdown, period_days: days });
      }

      const { data: items } = await supabase
        .from("order_items")
        .select("total_price, product_id")
        .in("order_id", orderIds);

      // Get product categories
      const productIds = [
        ...new Set((items ?? []).map((i) => i.product_id).filter(Boolean)),
      ];

      const { data: products } = productIds.length > 0
        ? await supabase
            .from("products")
            .select("id, category")
            .in("id", productIds as string[])
        : { data: [] };

      const productCategoryMap = new Map(
        (products ?? []).map((p) => [p.id, p.category ?? "Uncategorized"])
      );

      const categoryRevenue: Record<string, number> = {};
      for (const item of items ?? []) {
        const cat = productCategoryMap.get(item.product_id ?? "") ?? "Uncategorized";
        categoryRevenue[cat] = (categoryRevenue[cat] ?? 0) + item.total_price;
      }

      const totalRevenue = Object.values(categoryRevenue).reduce((a, b) => a + b, 0);
      const segments = Object.entries(categoryRevenue)
        .map(([name, value]) => ({
          name,
          value: Math.round(value * 100) / 100,
          pct: totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);

      return NextResponse.json({ segments, type: breakdown, period_days: days });
    }

    if (breakdown === "channel") {
      const { data: orders } = await supabase
        .from("orders")
        .select("source, total")
        .eq("store_id", store.id)
        .gte("created_at", since)
        .in("status", ["paid", "fulfilled"]);

      const channelRevenue: Record<string, number> = {};
      for (const order of orders ?? []) {
        const channel = order.source ?? "Direct";
        channelRevenue[channel] = (channelRevenue[channel] ?? 0) + order.total;
      }

      const totalRevenue = Object.values(channelRevenue).reduce((a, b) => a + b, 0);
      const segments = Object.entries(channelRevenue)
        .map(([name, value]) => ({
          name,
          value: Math.round(value * 100) / 100,
          pct: totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);

      return NextResponse.json({ segments, type: breakdown, period_days: days });
    }

    // Hour breakdown
    const { data: orders } = await supabase
      .from("orders")
      .select("created_at, total")
      .eq("store_id", store.id)
      .gte("created_at", since)
      .in("status", ["paid", "fulfilled"]);

    const hourRevenue: number[] = new Array(24).fill(0);
    const hourCount: number[] = new Array(24).fill(0);

    for (const order of orders ?? []) {
      const hour = new Date(order.created_at).getHours();
      hourRevenue[hour] += order.total;
      hourCount[hour] += 1;
    }

    const segments = hourRevenue.map((value, hour) => ({
      name: `${hour.toString().padStart(2, "0")}:00`,
      value: Math.round(value * 100) / 100,
      count: hourCount[hour],
    }));

    return NextResponse.json({ segments, type: breakdown, period_days: days });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
