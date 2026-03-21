import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/middleware";

/**
 * GET /api/v1/products
 * Query params: ?limit=50&offset=0&status=active&category=Shoes
 */
export async function GET(request: NextRequest) {
  const result = await withApiAuth(request, "products:read");
  if ("error" in result) return result.error;
  const { ctx } = result;

  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get("limit") || "50"), 100);
    const offset = parseInt(params.get("offset") || "0");
    const status = params.get("status");
    const category = params.get("category");

    const supabase = createAdminClient();

    let query = supabase
      .from("products")
      .select("id, external_id, title, description, category, sku, cost_price, sell_price, compare_at_price, inventory_qty, status, image_url, created_at, updated_at", {
        count: "exact",
      })
      .eq("store_id", ctx.storeId)
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      pagination: { total: count ?? 0, limit, offset },
    });
  } catch (error) {
    console.error("API v1 products error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
