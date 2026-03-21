import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/middleware";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/v1/insights
 * Query params: ?limit=20&category=revenue
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ data: [] });
  }

  const result = await withApiAuth(request, "analytics:read");
  if ("error" in result) return result.error;
  const { ctx } = result;

  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get("limit") || "20"), 50);
    const category = params.get("category");

    const supabase = createAdminClient();

    let query = supabase
      .from("insights")
      .select("id, title, body, category, severity, metric_value, is_read, generated_at, created_at")
      .eq("store_id", ctx.storeId)
      .order("generated_at", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("category", category);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error("API v1 insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
