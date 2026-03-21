import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/products/[id]
 * Returns full product details with aggregated analytics.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { store } = await getCurrentUserStore();
    if (!store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("store_id", store.id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get aggregated sales data
    const { data: salesData } = await supabase
      .from("order_items")
      .select("quantity, total_price, unit_price")
      .eq("product_id", id);

    const totalUnitsSold = (salesData ?? []).reduce((s, r) => s + r.quantity, 0);
    const totalRevenue = (salesData ?? []).reduce((s, r) => s + Number(r.total_price), 0);
    const margin =
      product.cost_price && totalUnitsSold > 0
        ? ((totalRevenue - product.cost_price * totalUnitsSold) / totalRevenue) * 100
        : null;

    return NextResponse.json({
      product,
      analytics: {
        totalUnitsSold,
        totalRevenue,
        margin: margin ? Math.round(margin * 10) / 10 : null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
