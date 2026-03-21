import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/reports/list
 * Query params: ?limit=10&offset=0&type=weekly_performance
 * Returns paginated report history for the user's store.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json(
        { error: "No store connected." },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const typeFilter = searchParams.get("type");

    const supabase = await createClient();

    let query = supabase
      .from("reports")
      .select("id, store_id, user_id, type, title, status, generated_at, created_at", {
        count: "exact",
      })
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }

    const { data: reports, count, error } = await query;

    if (error) {
      console.error("Reports list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reports: reports ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Reports list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports." },
      { status: 500 }
    );
  }
}
