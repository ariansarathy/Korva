"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DynamicChartProps {
  type: "bar" | "line" | "pie" | "table" | "number";
  data: Record<string, unknown>[];
  config: {
    x_axis?: string;
    y_axis?: string;
    label?: string;
  };
}

const COLORS = [
  "#0057FF",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(2);
  }
  return String(value ?? "");
}

export function DynamicChart({ type, data, config }: DynamicChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted">No data to display</p>
      </div>
    );
  }

  // Single number display
  if (type === "number" && data.length === 1) {
    const row = data[0];
    const keys = Object.keys(row);
    const value = row[keys[0]];
    return (
      <div className="flex items-center justify-center rounded-lg bg-primary/5 p-8">
        <div className="text-center">
          <p className="text-4xl font-bold text-foreground">
            {formatValue(value)}
          </p>
          <p className="mt-1 text-sm text-muted">{keys[0]?.replace(/_/g, " ")}</p>
        </div>
      </div>
    );
  }

  // Table display
  if (type === "table") {
    const columns = Object.keys(data[0]);
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-surface-hover">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2.5 text-foreground"
                  >
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <p className="border-t border-border px-4 py-2 text-xs text-muted">
            Showing 50 of {data.length} rows
          </p>
        )}
      </div>
    );
  }

  const xKey = config.x_axis || Object.keys(data[0])[0];
  const yKey = config.y_axis || Object.keys(data[0])[1];

  // Bar chart
  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatValue(v)}
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
                  <p className="text-xs text-muted">{String(label)}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatValue(payload[0].value)}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey={yKey} fill="#0057FF" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Line chart
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatValue(v)}
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
                  <p className="text-xs text-muted">{String(label)}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatValue(payload[0].value)}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#0057FF"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Pie chart
  if (type === "pie") {
    const labelKey = config.label || xKey;
    const valueKey = yKey;
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={labelKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={(props: { name?: string; percent?: number }) =>
              `${props.name ?? ""}: ${((props.percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
                  <p className="text-xs text-muted">{payload[0].name}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatValue(payload[0].value)}
                  </p>
                </div>
              );
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
