import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/reports/[reportId]
 * Returns a specific report with full data.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
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

    const { reportId } = await params;

    const supabase = await createClient();
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .eq("store_id", store.id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report." },
      { status: 500 }
    );
  }
}
