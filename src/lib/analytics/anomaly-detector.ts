import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getKPIs, type Period } from "@/lib/utils/queries";
import type { AnomalySeverity } from "@/lib/supabase/types";

let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable");
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

interface MetricSnapshot {
  metric: string;
  current: number;
  previous: number;
  avg30d: number;
  stdDev: number;
}

interface DetectedAnomaly {
  metric: string;
  expected_value: number;
  actual_value: number;
  deviation_percent: number;
  severity: AnomalySeverity;
  description: string;
}

/**
 * Detect anomalies for a store by comparing recent metrics against historical averages.
 * Uses >2σ deviation from 30-day rolling average as threshold.
 */
export async function detectAnomalies(storeId: string): Promise<DetectedAnomaly[]> {
  const supabase = await createClient();

  // Gather multi-period KPIs for comparison
  const periods: Period[] = ["7d", "30d", "90d"];
  const [kpis7d, kpis30d, kpis90d] = await Promise.all(
    periods.map((p) => getKPIs(storeId, p))
  );

  // Get daily revenue data for standard deviation calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("total, created_at")
    .eq("store_id", storeId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .not("status", "in", '("cancelled","refunded")');

  // Calculate daily revenue for stddev
  const dailyRevenue = new Map<string, number>();
  for (const order of recentOrders ?? []) {
    const date = order.created_at.split("T")[0];
    dailyRevenue.set(date, (dailyRevenue.get(date) ?? 0) + Number(order.total));
  }

  const dailyValues = [...dailyRevenue.values()];
  const avgDailyRevenue = dailyValues.length > 0
    ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
    : 0;
  const stdDevRevenue = calculateStdDev(dailyValues);

  // Build metric snapshots
  const snapshots: MetricSnapshot[] = [
    {
      metric: "daily_revenue",
      current: kpis7d.totalRevenue / 7,
      previous: (kpis30d.totalRevenue - kpis7d.totalRevenue) / 23,
      avg30d: avgDailyRevenue,
      stdDev: stdDevRevenue,
    },
    {
      metric: "daily_orders",
      current: kpis7d.totalOrders / 7,
      previous: (kpis30d.totalOrders - kpis7d.totalOrders) / 23,
      avg30d: kpis30d.totalOrders / 30,
      stdDev: kpis30d.totalOrders > 0 ? (kpis30d.totalOrders / 30) * 0.3 : 0, // Approximate
    },
    {
      metric: "average_order_value",
      current: kpis7d.avgOrderValue,
      previous: kpis30d.avgOrderValue,
      avg30d: kpis90d.avgOrderValue,
      stdDev: kpis90d.avgOrderValue * 0.15,
    },
  ];

  // Detect anomalies (>2σ deviation)
  const rawAnomalies: MetricSnapshot[] = snapshots.filter((s) => {
    if (s.stdDev === 0 || s.avg30d === 0) return false;
    const deviation = Math.abs(s.current - s.avg30d);
    return deviation > 2 * s.stdDev;
  });

  if (rawAnomalies.length === 0) return [];

  // Use Claude to generate human-readable descriptions
  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: ANOMALY_ANALYSIS_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze these anomalies detected in an e-commerce store:\n\n${JSON.stringify(
          rawAnomalies.map((a) => ({
            metric: a.metric,
            current_value: a.current.toFixed(2),
            expected_avg: a.avg30d.toFixed(2),
            deviation_sigmas: ((a.current - a.avg30d) / a.stdDev).toFixed(1),
            direction: a.current > a.avg30d ? "above" : "below",
          })),
          null,
          2
        )}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  let descriptions: Array<{ metric: string; description: string; severity: AnomalySeverity }> = [];

  if (textContent?.type === "text") {
    let jsonStr = textContent.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    try {
      descriptions = JSON.parse(jsonStr);
    } catch {
      // Fall back to simple descriptions
      descriptions = rawAnomalies.map((a) => ({
        metric: a.metric,
        description: `${a.metric.replace(/_/g, " ")} is ${a.current > a.avg30d ? "above" : "below"} the 30-day average.`,
        severity: (Math.abs(a.current - a.avg30d) / a.stdDev > 3 ? "critical" : "warning") as AnomalySeverity,
      }));
    }
  }

  // Build final anomalies
  const anomalies: DetectedAnomaly[] = rawAnomalies.map((a) => {
    const desc = descriptions.find((d) => d.metric === a.metric);
    const deviationPercent =
      a.avg30d !== 0
        ? Math.round(((a.current - a.avg30d) / a.avg30d) * 100)
        : 0;

    return {
      metric: a.metric,
      expected_value: Math.round(a.avg30d * 100) / 100,
      actual_value: Math.round(a.current * 100) / 100,
      deviation_percent: deviationPercent,
      severity: desc?.severity ?? "warning",
      description: desc?.description ?? `Anomaly detected in ${a.metric}`,
    };
  });

  // Store anomalies in database
  if (anomalies.length > 0) {
    await supabase.from("anomalies").insert(
      anomalies.map((a) => ({
        store_id: storeId,
        ...a,
      }))
    );
  }

  return anomalies;
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

const ANOMALY_ANALYSIS_PROMPT = `You are an e-commerce analytics anomaly analyzer.
Given metric anomalies, provide human-readable descriptions and severity classifications.

Return a JSON array where each item has:
{
  "metric": "the metric name",
  "description": "1-2 sentence human-readable explanation of the anomaly and potential causes",
  "severity": "info" | "warning" | "critical"
}

Severity guidelines:
- "info": Positive deviations (unexpected increase in revenue/orders)
- "warning": Moderate negative deviations (2-3σ below average)
- "critical": Severe negative deviations (>3σ below) or any metric dropping >50%

Return ONLY valid JSON, no markdown.`;
