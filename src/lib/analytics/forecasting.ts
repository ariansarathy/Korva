import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable");
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
  is_historical: boolean;
}

export interface ForecastResult {
  forecast: ForecastPoint[];
  interpretation: string;
  metric: string;
}

/**
 * Generate a forecast for a given metric over the specified number of days.
 * Uses moving average + linear regression, then Claude for interpretation.
 */
export async function generateForecast(
  storeId: string,
  metric: "revenue" | "orders",
  forecastDays: number = 14
): Promise<ForecastResult> {
  const supabase = await createClient();

  // Get 90 days of historical data
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: orders } = await supabase
    .from("orders")
    .select("total, created_at")
    .eq("store_id", storeId)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .not("status", "in", '("cancelled","refunded")')
    .order("created_at", { ascending: true });

  // Group by date
  const dailyData = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders ?? []) {
    const date = order.created_at.split("T")[0];
    const existing = dailyData.get(date) ?? { revenue: 0, orders: 0 };
    existing.revenue += Number(order.total);
    existing.orders += 1;
    dailyData.set(date, existing);
  }

  // Fill in missing dates and build time series
  const timeSeries: { date: string; value: number }[] = [];
  const startDate = new Date(ninetyDaysAgo);
  const today = new Date();

  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const data = dailyData.get(dateStr);
    timeSeries.push({
      date: dateStr,
      value: metric === "revenue" ? (data?.revenue ?? 0) : (data?.orders ?? 0),
    });
  }

  if (timeSeries.length < 7) {
    return {
      forecast: [],
      interpretation: "Insufficient historical data for forecasting. At least 7 days of data is needed.",
      metric,
    };
  }

  // Calculate 7-day moving average for smoothing
  const smoothed = movingAverage(timeSeries.map((t) => t.value), 7);

  // Linear regression on smoothed data
  const { slope, intercept } = linearRegression(smoothed);

  // Calculate standard deviation for confidence bands
  const residuals = smoothed.map((v, i) => v - (slope * i + intercept));
  const stdDev = Math.sqrt(
    residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length
  );

  // Build forecast points
  const forecast: ForecastPoint[] = [];

  // Include last 30 days of historical data
  const historicalStart = Math.max(0, timeSeries.length - 30);
  for (let i = historicalStart; i < timeSeries.length; i++) {
    forecast.push({
      date: timeSeries[i].date,
      predicted: timeSeries[i].value,
      lower_bound: timeSeries[i].value,
      upper_bound: timeSeries[i].value,
      is_historical: true,
    });
  }

  // Generate future predictions
  const n = smoothed.length;
  for (let i = 1; i <= forecastDays; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i);
    const dateStr = futureDate.toISOString().split("T")[0];

    const predicted = Math.max(0, slope * (n + i) + intercept);
    // Confidence band widens with distance
    const uncertainty = stdDev * Math.sqrt(i) * 1.96;

    forecast.push({
      date: dateStr,
      predicted: Math.round(predicted * 100) / 100,
      lower_bound: Math.max(0, Math.round((predicted - uncertainty) * 100) / 100),
      upper_bound: Math.round((predicted + uncertainty) * 100) / 100,
      is_historical: false,
    });
  }

  // Get Claude's interpretation
  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: FORECAST_PROMPT,
    messages: [
      {
        role: "user",
        content: `Interpret this ${metric} forecast for an e-commerce store:

Historical trend (last 30 days avg): ${(smoothed.slice(-30).reduce((a, b) => a + b, 0) / 30).toFixed(2)} per day
Slope: ${slope.toFixed(4)} per day (${slope > 0 ? "increasing" : "decreasing"})
Forecast ${forecastDays} days ahead: ${forecast[forecast.length - 1]?.predicted.toFixed(2)} per day
Confidence range: ${forecast[forecast.length - 1]?.lower_bound.toFixed(2)} - ${forecast[forecast.length - 1]?.upper_bound.toFixed(2)}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  const interpretation =
    textContent?.type === "text"
      ? textContent.text
      : "Forecast generated based on historical trends.";

  return { forecast, interpretation, metric };
}

function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

const FORECAST_PROMPT = `You are a concise e-commerce analytics forecaster.
Given a forecast summary, provide a 2-3 sentence interpretation.

Focus on:
- Whether the trend is positive, negative, or stable
- The confidence level of the prediction
- One actionable recommendation based on the trend

Keep it under 80 words. Be specific with numbers. Don't use technical jargon like "sigma" or "regression."`;
