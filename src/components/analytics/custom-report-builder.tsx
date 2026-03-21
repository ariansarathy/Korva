"use client";

import { useState } from "react";
import {
  Loader2,
  Plus,
  Play,
  Download,
  BarChart3,
  LineChart,
  PieChart,
  Table,
} from "lucide-react";
import { DynamicChart } from "@/components/charts/dynamic-chart";

const METRIC_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "orders", label: "Order Count" },
  { value: "aov", label: "Average Order Value" },
  { value: "customers", label: "Unique Customers" },
  { value: "units_sold", label: "Units Sold" },
];

const DIMENSION_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "product", label: "Product" },
  { value: "category", label: "Category" },
  { value: "country", label: "Country" },
  { value: "segment", label: "Customer Segment" },
  { value: "channel", label: "Channel" },
];

const CHART_TYPES = [
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: LineChart },
  { value: "pie", label: "Pie", icon: PieChart },
  { value: "table", label: "Table", icon: Table },
] as const;

const PERIOD_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last year" },
];

interface ReportResult {
  data: Record<string, unknown>[];
  chart_type: "bar" | "line" | "pie" | "table";
  chart_config: { x_axis?: string; y_axis?: string };
  query_time_ms: number;
}

export function CustomReportBuilder() {
  const [metric, setMetric] = useState("revenue");
  const [dimension, setDimension] = useState("day");
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "table">("bar");
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState("");

  async function runReport() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Build a natural language question from the selections
      const metricLabel =
        METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? metric;
      const dimLabel =
        DIMENSION_OPTIONS.find((d) => d.value === dimension)?.label ?? dimension;
      const periodLabel =
        PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? `last ${period} days`;

      const question = `Show me ${metricLabel} by ${dimLabel} for the ${periodLabel}`;

      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate report");
        return;
      }

      setResult({
        data: data.data ?? [],
        chart_type: chartType,
        chart_config: data.chart_config ?? {
          x_axis: dimLabel.toLowerCase(),
          y_axis: metricLabel.toLowerCase(),
        },
        query_time_ms: data.execution_time_ms ?? 0,
      });
    } catch {
      setError("Failed to run report");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!result || result.data.length === 0) return;

    const headers = Object.keys(result.data[0]);
    const rows = result.data.map((row) =>
      headers.map((h) => String(row[h] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${metric}-by-${dimension}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Builder controls */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric */}
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted">
            Metric
          </label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {METRIC_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dimension */}
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted">
            Group By
          </label>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {DIMENSION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Period */}
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted">
            Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Chart Type */}
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted">
            Chart Type
          </label>
          <div className="flex items-center gap-1">
            {CHART_TYPES.map((ct) => {
              const Icon = ct.icon;
              return (
                <button
                  key={ct.value}
                  onClick={() => setChartType(ct.value)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    chartType === ct.value
                      ? "bg-primary text-white"
                      : "bg-surface-hover text-secondary hover:text-foreground"
                  }`}
                  title={ct.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Run button */}
      <div className="flex items-center gap-2">
        <button
          onClick={runReport}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run Report
        </button>

        {result && result.data.length > 0 && (
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              {result.data.length} rows · {result.query_time_ms}ms
            </p>
          </div>

          {result.data.length > 0 ? (
            result.chart_type === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {Object.keys(result.data[0]).map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left text-xs font-medium text-muted"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.slice(0, 50).map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/50 hover:bg-surface-hover"
                      >
                        {Object.values(row).map((val, j) => (
                          <td
                            key={j}
                            className="px-3 py-2 text-foreground"
                          >
                            {typeof val === "number"
                              ? val.toLocaleString()
                              : String(val ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <DynamicChart
                type={result.chart_type}
                data={result.data}
                config={result.chart_config}
              />
            )
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              No data returned for the selected parameters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
