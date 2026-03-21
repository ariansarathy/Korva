import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { getAdSpendSummary, getAdSpendByPlatform, getTopCampaigns, type Period } from "@/lib/utils/queries";

/**
 * GET /api/analytics/ad-spend
 * Query params: ?period=30d
 * Returns ad spend summary, platform breakdown, and top campaigns.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const period = (request.nextUrl.searchParams.get("period") || "30d") as Period;

    const [summary, byPlatform, topCampaigns] = await Promise.all([
      getAdSpendSummary(store.id, period),
      getAdSpendByPlatform(store.id, period),
      getTopCampaigns(store.id, period),
    ]);

    return NextResponse.json({
      summary,
      byPlatform,
      topCampaigns,
      period,
    });
  } catch (error) {
    console.error("Ad spend analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad spend data" },
      { status: 500 }
    );
  }
}
