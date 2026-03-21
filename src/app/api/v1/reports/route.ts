import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/middleware";

/**
 * GET /api/v1/reports
 * Query params: ?limit=10&type=weekly_performance
 * Returns reports list for the authenticated store.
 */
export async function GET(request: NextRequest) {
  const result = await withApiAuth(request, "reports:read");
  if ("error" in result) return result.error;
  const { ctx } = result;

  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get("limit") || "10"), 50);
    const typeFilter = params.get("type");

    const supabase = createAdminClient();

    let query = supabase
      .from("reports")
      .select("id, type, title, status, data, generated_at, created_at")
      .eq("store_id", ctx.storeId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (typeFilter) query = query.eq("type", typeFilter);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("API v1 reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
