import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/analytics/inventory-velocity
 * Returns inventory velocity data: daily sell rate, days of stock remaining, restock alerts.
 */
export async function GET() {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get products with inventory
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, title, sku, inventory_qty, velocity_daily, days_of_stock, sell_price, status"
      )
      .eq("store_id", store.id)
      .eq("status", "active")
      .order("days_of_stock", { ascending: true });

    if (!products || products.length === 0) {
      return NextResponse.json({
        products: [],
        summary: {
          total_products: 0,
          low_stock: 0,
          out_of_stock: 0,
          healthy: 0,
          total_inventory_value: 0,
        },
      });
    }

    // Compute velocity for products without pre-computed data
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get recent order items to compute velocity
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("store_id", store.id)
      .gte("created_at", thirtyDaysAgo);

    const recentOrderIds = (recentOrders ?? []).map((o) => o.id);

    let orderItems: Array<{
      product_id: string | null;
      quantity: number;
    }> = [];

    if (recentOrderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .in("order_id", recentOrderIds);
      orderItems = items ?? [];
    }

    // Aggregate sold quantities per product
    const soldQty = new Map<string, number>();
    for (const item of orderItems) {
      if (!item.product_id) continue;
      soldQty.set(
        item.product_id,
        (soldQty.get(item.product_id) ?? 0) + item.quantity
      );
    }

    // Build velocity data
    const velocityData = products.map((p) => {
      const sold30d = soldQty.get(p.id) ?? 0;
      const velocityDaily = p.velocity_daily ?? (sold30d > 0 ? sold30d / 30 : 0);
      const daysOfStock =
        p.days_of_stock ??
        (velocityDaily > 0
          ? Math.round(p.inventory_qty / velocityDaily)
          : p.inventory_qty > 0
            ? 999
            : 0);

      let stockStatus: "out_of_stock" | "critical" | "low" | "healthy" | "overstocked";
      if (p.inventory_qty <= 0) {
        stockStatus = "out_of_stock";
      } else if (daysOfStock <= 7) {
        stockStatus = "critical";
      } else if (daysOfStock <= 30) {
        stockStatus = "low";
      } else if (daysOfStock > 180 && velocityDaily > 0) {
        stockStatus = "overstocked";
      } else {
        stockStatus = "healthy";
      }

      return {
        product_id: p.id,
        title: p.title,
        sku: p.sku,
        inventory_qty: p.inventory_qty,
        sell_price: p.sell_price ?? 0,
        velocity_daily: Math.round(velocityDaily * 100) / 100,
        sold_30d: sold30d,
        days_of_stock: daysOfStock,
        stock_status: stockStatus,
        reorder_suggested: daysOfStock <= 14 && velocityDaily > 0,
        suggested_reorder_qty:
          daysOfStock <= 14 && velocityDaily > 0
            ? Math.ceil(velocityDaily * 60) // 60-day supply
            : 0,
      };
    });

    // Sort by urgency
    const statusOrder = {
      out_of_stock: 0,
      critical: 1,
      low: 2,
      overstocked: 3,
      healthy: 4,
    };
    velocityData.sort(
      (a, b) => statusOrder[a.stock_status] - statusOrder[b.stock_status]
    );

    const totalInventoryValue = velocityData.reduce(
      (sum, p) => sum + p.inventory_qty * p.sell_price,
      0
    );

    return NextResponse.json({
      products: velocityData,
      summary: {
        total_products: velocityData.length,
        out_of_stock: velocityData.filter(
          (p) => p.stock_status === "out_of_stock"
        ).length,
        critical: velocityData.filter((p) => p.stock_status === "critical")
          .length,
        low_stock: velocityData.filter((p) => p.stock_status === "low").length,
        healthy: velocityData.filter((p) => p.stock_status === "healthy")
          .length,
        overstocked: velocityData.filter(
          (p) => p.stock_status === "overstocked"
        ).length,
        total_inventory_value: Math.round(totalInventoryValue * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Inventory velocity error:", error);
    return NextResponse.json(
      { error: "Failed to compute inventory velocity" },
      { status: 500 }
    );
  }
}
