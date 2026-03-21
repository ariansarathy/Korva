import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { generateReport } from "@/lib/reports/generator";
import type { ReportType } from "@/lib/supabase/types";

const VALID_TYPES: ReportType[] = [
  "weekly_performance",
  "monthly_deep_dive",
  "product_performance",
  "customer_insights",
];

/**
 * POST /api/reports/generate
 * Body: { reportType: ReportType }
 * Generates an AI-powered report for the user's connected store.
 * Requires Growth plan or higher.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json(
        { error: "No store connected. Please connect a store first." },
        { status: 400 }
      );
    }

    const { reportType } = await request.json();

    if (!reportType || !VALID_TYPES.includes(reportType)) {
      return NextResponse.json(
        { error: `Invalid report type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const report = await generateReport(store.id, reportType, userId);

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report. Please try again." },
      { status: 500 }
    );
  }
}
