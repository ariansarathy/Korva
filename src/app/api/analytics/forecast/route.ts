import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { generateForecast } from "@/lib/analytics/forecasting";

/**
 * GET /api/analytics/forecast
 * Query params: ?metric=revenue&days=14
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metric = (request.nextUrl.searchParams.get("metric") || "revenue") as
      | "revenue"
      | "orders";
    const days = parseInt(request.nextUrl.searchParams.get("days") || "14");

    if (!["revenue", "orders"].includes(metric)) {
      return NextResponse.json(
        { error: "metric must be 'revenue' or 'orders'" },
        { status: 400 }
      );
    }

    const forecast = await generateForecast(store.id, metric, Math.min(days, 30));

    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Forecast error:", error);
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
