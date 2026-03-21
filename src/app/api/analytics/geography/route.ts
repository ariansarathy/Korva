import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/analytics/geography?days=30
 * Returns revenue breakdown by customer country/city.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({
      countries: [
        { country: "US", revenue: 38264, orders: 997, customers: 712 },
        { country: "CA", revenue: 4783, orders: 125, customers: 89 },
        { country: "GB", revenue: 2870, orders: 75, customers: 54 },
        { country: "AU", revenue: 1915, orders: 50, customers: 37 },
      ],
      period_days: 30,
    });
  }

  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const days = parseInt(
      request.nextUrl.searchParams.get("days") ?? "30",
      10
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const supabase = await createClient();

    // Get orders with customer info for the period
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total, customer_id, created_at")
      .eq("store_id", store.id)
      .gte("created_at", since);

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        countries: [],
        regions: [],
        summary: { total_revenue: 0, total_orders: 0, top_country: null, country_count: 0 },
      });
    }

    // Get customer geographic data
    const customerIds = [
      ...new Set(orders.filter((o) => o.customer_id).map((o) => o.customer_id!)),
    ];

    const { data: customers } = await supabase
      .from("customers")
      .select("id, country, city")
      .in("id", customerIds.length > 0 ? customerIds : ["__none__"]);

    const customerGeo = new Map<string, { country: string; city: string }>();
    for (const c of customers ?? []) {
      customerGeo.set(c.id, {
        country: c.country ?? "Unknown",
        city: c.city ?? "Unknown",
      });
    }

    // Aggregate by country
    const countryStats = new Map<
      string,
      { revenue: number; orders: number; customers: Set<string> }
    >();

    // Aggregate by city
    const cityStats = new Map<
      string,
      { country: string; revenue: number; orders: number }
    >();

    for (const order of orders) {
      const geo = order.customer_id
        ? customerGeo.get(order.customer_id)
        : null;
      const country = geo?.country ?? "Unknown";
      const city = geo?.city ?? "Unknown";

      // Country aggregation
      const cStats = countryStats.get(country) ?? {
        revenue: 0,
        orders: 0,
        customers: new Set<string>(),
      };
      cStats.revenue += order.total;
      cStats.orders += 1;
      if (order.customer_id) cStats.customers.add(order.customer_id);
      countryStats.set(country, cStats);

      // City aggregation
      const cityKey = `${country}:${city}`;
      const rStats = cityStats.get(cityKey) ?? {
        country,
        revenue: 0,
        orders: 0,
      };
      rStats.revenue += order.total;
      rStats.orders += 1;
      cityStats.set(cityKey, rStats);
    }

    // Build sorted results
    const countries = Array.from(countryStats.entries())
      .map(([country, stats]) => ({
        country,
        revenue: Math.round(stats.revenue * 100) / 100,
        orders: stats.orders,
        customers: stats.customers.size,
        avg_order_value:
          stats.orders > 0
            ? Math.round((stats.revenue / stats.orders) * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const regions = Array.from(cityStats.entries())
      .map(([key, stats]) => {
        const city = key.split(":")[1];
        return {
          region: city,
          country: stats.country,
          revenue: Math.round(stats.revenue * 100) / 100,
          orders: stats.orders,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 30);

    const totalRevenue = countries.reduce((sum, c) => sum + c.revenue, 0);
    const totalOrders = countries.reduce((sum, c) => sum + c.orders, 0);

    return NextResponse.json({
      countries: countries.slice(0, 20),
      regions,
      summary: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_orders: totalOrders,
        top_country: countries[0]?.country ?? null,
        country_count: countries.length,
      },
    });
  } catch (error) {
    console.error("Geography analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch geography data" },
      { status: 500 }
    );
  }
}
