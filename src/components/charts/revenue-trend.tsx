"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenueTrendPoint } from "@/lib/utils/queries";

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
  period: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDate(dateStr: string, period: string): string {
  const date = new Date(dateStr);
  if (period === "12mo") {
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueTrendChart({ data, period }: RevenueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border-2 border-dashed border-border">
        <p className="text-sm text-muted">No revenue data yet</p>
      </div>
    );
  }

  // For 12mo, aggregate by month
  const chartData =
    period === "12mo" ? aggregateByMonth(data) : data;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart
        data={chartData}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0057FF" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0057FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(val) => formatDate(val, period)}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
                <p className="text-xs text-muted">
                  {formatDate(String(label ?? ""), period)}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(payload[0].value as number)}
                </p>
                <p className="text-xs text-muted">
                  {(payload[0].payload as RevenueTrendPoint).orders} orders
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#0057FF"
          strokeWidth={2}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function aggregateByMonth(
  data: RevenueTrendPoint[]
): RevenueTrendPoint[] {
  const monthMap = new Map<string, RevenueTrendPoint>();

  for (const point of data) {
    const monthKey = point.date.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(monthKey);
    if (existing) {
      existing.revenue += point.revenue;
      existing.orders += point.orders;
    } else {
      monthMap.set(monthKey, { ...point, date: `${monthKey}-01` });
    }
  }

  return [...monthMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}
