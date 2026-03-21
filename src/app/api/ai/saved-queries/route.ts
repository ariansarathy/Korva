import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/ai/saved-queries
 * List saved queries for the current user.
 */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ queries: [] });
  }

  try {
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: queries } = await supabase
      .from("saved_queries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ queries: queries ?? [] });
  } catch (error) {
    console.error("List saved queries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved queries" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/saved-queries
 * Save a query.
 * Body: { name: string, question: string, generated_sql: string, chart_type?: string, chart_config?: object }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.name || !body.question) {
      return NextResponse.json(
        { error: "Name and question are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: query, error } = await supabase
      .from("saved_queries")
      .insert({
        user_id: userId,
        store_id: store?.id ?? null,
        title: body.name,
        question: body.question,
        generated_sql: body.generated_sql ?? null,
        chart_type: body.chart_type ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save query" },
        { status: 500 }
      );
    }

    return NextResponse.json({ query });
  } catch (error) {
    console.error("Save query error:", error);
    return NextResponse.json(
      { error: "Failed to save query" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/saved-queries
 * Remove a saved query.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = await createClient();
    await supabase
      .from("saved_queries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete saved query error:", error);
    return NextResponse.json(
      { error: "Failed to delete query" },
      { status: 500 }
    );
  }
}
