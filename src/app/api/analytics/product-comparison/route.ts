import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/analytics/product-comparison?products=id1,id2,id3&days=30
 * Returns side-by-side product analytics for comparison.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ products: [] });
  }

  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productIdsParam = request.nextUrl.searchParams.get("products");
    if (!productIdsParam) {
      return NextResponse.json(
        { error: "products parameter is required (comma-separated IDs)" },
        { status: 400 }
      );
    }

    const productIds = productIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: "At least one product ID is required" },
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

    // Get products
    const { data: products } = await supabase
      .from("products")
      .select("id, title, image_url, sell_price")
      .eq("store_id", store.id)
      .in("id", productIds);

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Get orders in the date range
    const { data: orders } = await supabase
      .from("orders")
      .select("id, created_at")
      .eq("store_id", store.id)
      .gte("created_at", since)
      .in("status", ["paid", "fulfilled"]);

    const orderIds = (orders ?? []).map((o) => o.id);
    const orderDateMap = new Map(
      (orders ?? []).map((o) => [o.id, o.created_at])
    );

    // Build trend date labels
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dateLabels: string[] = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
      dateLabels.push(date.toISOString().slice(0, 10));
    }

    if (orderIds.length === 0) {
      return NextResponse.json({
        products: products.map((p) => ({
          id: p.id,
          title: p.title,
          image_url: p.image_url,
          revenue: 0,
          units: 0,
          aov: 0,
          trend: dateLabels.map((date) => ({ date, value: 0 })),
        })),
      });
    }

    // Get order items for the selected products
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, order_id, quantity, total_price")
      .in("order_id", orderIds)
      .in("product_id", productIds);

    // Build per-product metrics
    const productData: Record<
      string,
      { revenue: number; units: number; orderCount: number; dailyRevenue: Record<string, number> }
    > = {};

    for (const pid of productIds) {
      productData[pid] = { revenue: 0, units: 0, orderCount: 0, dailyRevenue: {} };
    }

    for (const item of items ?? []) {
      const pid = item.product_id;
      if (!pid || !productData[pid]) continue;

      productData[pid].revenue += item.total_price;
      productData[pid].units += item.quantity;
      productData[pid].orderCount += 1;

      const date = (orderDateMap.get(item.order_id) ?? "").slice(0, 10);
      if (date) {
        productData[pid].dailyRevenue[date] =
          (productData[pid].dailyRevenue[date] ?? 0) + item.total_price;
      }
    }

    const result = products.map((p) => {
      const data = productData[p.id] ?? {
        revenue: 0,
        units: 0,
        orderCount: 0,
        dailyRevenue: {},
      };
      return {
        id: p.id,
        title: p.title,
        image_url: p.image_url,
        revenue: Math.round(data.revenue * 100) / 100,
        units: data.units,
        aov:
          data.orderCount > 0
            ? Math.round((data.revenue / data.orderCount) * 100) / 100
            : 0,
        trend: dateLabels.map((date) => ({
          date,
          value: Math.round((data.dailyRevenue[date] ?? 0) * 100) / 100,
        })),
      };
    });

    return NextResponse.json({ products: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
