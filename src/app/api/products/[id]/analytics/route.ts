import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/products/[id]/analytics?days=30
 * Returns daily time-series data for a product (revenue, units sold).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { store } = await getCurrentUserStore();
    if (!store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const days = parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const supabase = await createClient();

    // Verify product belongs to store
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", id)
      .eq("store_id", store.id)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get order items for this product joined with orders for date filtering
    const { data: items } = await supabase
      .from("order_items")
      .select("quantity, total_price, order:orders!inner(created_at, store_id, status)")
      .eq("product_id", id)
      .eq("orders.store_id", store.id)
      .gte("orders.created_at", since)
      .not("orders.status", "in", '("cancelled","refunded")');

    // Group by day
    const grouped = new Map<string, { revenue: number; units: number }>();
    for (const item of items ?? []) {
      const orderData = item.order as unknown as { created_at: string };
      const date = orderData.created_at.split("T")[0];
      const existing = grouped.get(date) ?? { revenue: 0, units: 0 };
      existing.revenue += Number(item.total_price);
      existing.units += item.quantity;
      grouped.set(date, existing);
    }

    // Fill in missing dates
    const result: Array<{ date: string; revenue: number; units: number }> = [];
    const startDate = new Date(since);
    const endDate = new Date();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const data = grouped.get(dateStr);
      result.push({
        date: dateStr,
        revenue: data?.revenue ?? 0,
        units: data?.units ?? 0,
      });
    }

    return NextResponse.json({ timeSeries: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
