import { NextResponse, type NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/middleware";
import { getRevenueTrend, type Period } from "@/lib/utils/queries";

const VALID_PERIODS: Period[] = ["7d", "30d", "90d", "12mo"];

/**
 * GET /api/v1/analytics/revenue-trend
 * Query params: ?period=30d
 */
export async function GET(request: NextRequest) {
  const result = await withApiAuth(request, "analytics:read");
  if ("error" in result) return result.error;
  const { ctx } = result;

  try {
    const period = (request.nextUrl.searchParams.get("period") || "30d") as Period;
    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}` },
        { status: 400 }
      );
    }

    const trend = await getRevenueTrend(ctx.storeId, period);

    return NextResponse.json({ data: trend, period });
  } catch (error) {
    console.error("API v1 revenue trend error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
