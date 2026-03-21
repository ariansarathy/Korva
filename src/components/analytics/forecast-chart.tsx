"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
} from "recharts";

interface ForecastPoint {
  date: string;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
  is_historical: boolean;
}

interface ForecastData {
  forecast: ForecastPoint[];
  interpretation: string;
  metric: string;
}

export function ForecastChart() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");

  useEffect(() => {
    async function fetchForecast() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/forecast?metric=${metric}&days=14`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error("Forecast fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
  }, [metric]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!data || data.forecast.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <TrendingUp className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 text-sm text-muted">
          Not enough data to generate a forecast. Keep syncing data to enable predictions.
        </p>
      </div>
    );
  }

  // Prepare chart data: split historical vs forecast for different styling
  const chartData = data.forecast.map((point) => ({
    date: point.date.slice(5), // MM-DD
    actual: point.is_historical ? point.predicted : undefined,
    predicted: !point.is_historical ? point.predicted : undefined,
    lower: !point.is_historical ? point.lower_bound : undefined,
    upper: !point.is_historical ? point.upper_bound : undefined,
    // For the connection point between historical and forecast
    bridge: point.predicted,
  }));

  const formatValue = (value: number) => {
    if (metric === "revenue") {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Metric Toggle */}
      <div className="flex items-center gap-2">
        {(["revenue", "orders"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              metric === m
                ? "bg-primary text-white"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {m === "revenue" ? "Revenue" : "Orders"}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-muted)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatValue(v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value?: string | number | ReadonlyArray<string | number>, name?: string | number) => {
                const labels: Record<string, string> = {
                  actual: "Actual",
                  predicted: "Predicted",
                  lower: "Lower Bound",
                  upper: "Upper Bound",
                };
                const key = String(name ?? "");
                return [formatValue(Number(value)), labels[key] ?? key];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
            />
            {/* Confidence band */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="var(--color-primary)"
              fillOpacity={0.08}
              name="Upper Bound"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="var(--color-surface)"
              fillOpacity={1}
              name="Lower Bound"
              dot={false}
            />
            {/* Historical line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
              name="Actual"
              connectNulls={false}
            />
            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="var(--color-primary)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Predicted"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interpretation */}
      {data.interpretation && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground leading-relaxed">
            {data.interpretation}
          </p>
        </div>
      )}
    </div>
  );
}
