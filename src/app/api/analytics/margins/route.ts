import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { checkDashboardRateLimit } from "@/lib/api/dashboard-rate-limiter";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/analytics/margins?days=30
 * Returns profit margin data by product, including cost, revenue, and margin %.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({
      products: [
        { product_id: "p1", title: "Ethiopian Yirgacheffe", units_sold: 256, revenue: 4870, cost: 2176, profit: 2694, margin_pct: 55 },
        { product_id: "p2", title: "Espresso Blend", units_sold: 339, revenue: 5420, cost: 2306, profit: 3114, margin_pct: 57 },
        { product_id: "p3", title: "Colombian Supremo", units_sold: 201, revenue: 3414, cost: 1447, profit: 1967, margin_pct: 58 },
        { product_id: "p4", title: "Matcha Ceremonial Grade", units_sold: 148, revenue: 4439, cost: 1776, profit: 2663, margin_pct: 60 },
        { product_id: "p5", title: "Pour Over Dripper Kit", units_sold: 67, revenue: 2679, cost: 1005, profit: 1674, margin_pct: 63 },
      ],
      summary: { total_revenue: 20822, total_cost: 8710, total_profit: 12112, avg_margin: 58 },
    });
  }

  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkDashboardRateLimit(userId);
    if (rateLimitResponse) return rateLimitResponse;

    const days = parseInt(
      request.nextUrl.searchParams.get("days") ?? "30",
      10
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const supabase = await createClient();

    // Get orders in the date range
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("store_id", store.id)
      .gte("created_at", since);

    const orderIds = new Set((orders ?? []).map((o) => o.id));

    if (orderIds.size === 0) {
      return NextResponse.json({
        products: [],
        summary: { total_revenue: 0, total_cost: 0, total_profit: 0, avg_margin: 0 },
      });
    }

    // Get line items for orders in range
    const orderIdList = Array.from(orderIds);
    const { data: lineItems } = await supabase
      .from("order_items")
      .select("quantity, unit_price, product_id, order_id")
      .in("order_id", orderIdList.length > 0 ? orderIdList : ["__none__"]);

    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json({
        products: [],
        summary: { total_revenue: 0, total_cost: 0, total_profit: 0, avg_margin: 0 },
      });
    }

    // Get products with cost data
    const { data: products } = await supabase
      .from("products")
      .select("id, title, cost_price, sell_price")
      .eq("store_id", store.id);

    const productMap = new Map<
      string,
      { title: string; cost: number; price: number }
    >();
    for (const p of products ?? []) {
      productMap.set(p.id, {
        title: p.title,
        cost: p.cost_price ?? 0,
        price: p.sell_price ?? 0,
      });
    }

    // Aggregate per product
    const productStats = new Map<
      string,
      { title: string; revenue: number; cost: number; units: number }
    >();

    for (const li of lineItems) {
      if (!li.product_id) continue;

      const product = productMap.get(li.product_id);
      if (!product) continue;

      const existing = productStats.get(li.product_id) ?? {
        title: product.title,
        revenue: 0,
        cost: 0,
        units: 0,
      };

      existing.revenue += li.unit_price * li.quantity;
      existing.cost += product.cost * li.quantity;
      existing.units += li.quantity;
      productStats.set(li.product_id, existing);
    }

    // Build response
    const productMargins = Array.from(productStats.entries())
      .map(([id, stats]) => ({
        product_id: id,
        title: stats.title,
        units_sold: stats.units,
        revenue: Math.round(stats.revenue * 100) / 100,
        cost: Math.round(stats.cost * 100) / 100,
        profit: Math.round((stats.revenue - stats.cost) * 100) / 100,
        margin_pct:
          stats.revenue > 0
            ? Math.round(((stats.revenue - stats.cost) / stats.revenue) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    const totalRevenue = productMargins.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = productMargins.reduce((sum, p) => sum + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin =
      totalRevenue > 0
        ? Math.round((totalProfit / totalRevenue) * 10000) / 100
        : 0;

    return NextResponse.json({
      products: productMargins.slice(0, 50),
      summary: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        total_profit: Math.round(totalProfit * 100) / 100,
        avg_margin: avgMargin,
      },
    });
  } catch (error) {
    console.error("Margins analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch margin data" },
      { status: 500 }
    );
  }
}
