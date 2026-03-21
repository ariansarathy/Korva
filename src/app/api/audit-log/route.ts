import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/audit-log
 * Returns paginated audit log for the current user.
 * Supports filters: action, entity_type, from, to
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (action) {
      query = query.eq("action", action);
    }
    if (entityType) {
      query = query.eq("entity_type", entityType);
    }
    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", to);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: entries, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch audit log" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entries: entries ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
