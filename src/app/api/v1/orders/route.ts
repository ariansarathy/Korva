import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/middleware";

/**
 * GET /api/v1/orders
 * Query params: ?limit=50&offset=0&status=paid&since=2024-01-01
 * Returns paginated orders for the authenticated store.
 */
export async function GET(request: NextRequest) {
  const result = await withApiAuth(request, "orders:read");
  if ("error" in result) return result.error;
  const { ctx } = result;

  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get("limit") || "50"), 100);
    const offset = parseInt(params.get("offset") || "0");
    const status = params.get("status");
    const since = params.get("since");

    const supabase = createAdminClient();

    let query = supabase
      .from("orders")
      .select("id, external_id, customer_id, total, subtotal, discount, shipping, tax, status, channel, source, created_at", {
        count: "exact",
      })
      .eq("store_id", ctx.storeId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (since) query = query.gte("created_at", since);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      pagination: { total: count ?? 0, limit, offset },
    });
  } catch (error) {
    console.error("API v1 orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
