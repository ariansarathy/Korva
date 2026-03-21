import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/middleware";

/**
 * GET /api/v1/customers
 * Query params: ?limit=50&offset=0&segment=vip
 */
export async function GET(request: NextRequest) {
  const result = await withApiAuth(request, "customers:read");
  if ("error" in result) return result.error;
  const { ctx } = result;

  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get("limit") || "50"), 100);
    const offset = parseInt(params.get("offset") || "0");
    const segment = params.get("segment");

    const supabase = createAdminClient();

    let query = supabase
      .from("customers")
      .select("id, external_id, first_name, last_name, order_count, lifetime_value, segment, city, country, first_order_date, last_order_date, created_at", {
        count: "exact",
      })
      .eq("store_id", ctx.storeId)
      .order("lifetime_value", { ascending: false })
      .range(offset, offset + limit - 1);

    if (segment) query = query.eq("segment", segment);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      pagination: { total: count ?? 0, limit, offset },
    });
  } catch (error) {
    console.error("API v1 customers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
