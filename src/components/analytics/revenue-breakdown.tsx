"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Segment {
  label: string;
  value: number;
  pct: number;
}

type BreakdownType = "category" | "channel" | "hour";

const BREAKDOWN_TABS: { id: BreakdownType; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "channel", label: "Channel" },
  { id: "hour", label: "Time of Day" },
];

const PIE_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
];

const HOUR_CELL_COLORS = [
  "bg-primary/5",
  "bg-primary/15",
  "bg-primary/30",
  "bg-primary/50",
  "bg-primary/70",
  "bg-primary/90",
];

function getHourCellColor(value: number, max: number): string {
  if (max === 0) return HOUR_CELL_COLORS[0];
  const ratio = value / max;
  const index = Math.min(Math.floor(ratio * HOUR_CELL_COLORS.length), HOUR_CELL_COLORS.length - 1);
  return HOUR_CELL_COLORS[index];
}

export function RevenueBreakdown() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<BreakdownType>("category");
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/analytics/revenue-breakdown?breakdown=${breakdown}&days=${days}`
        );
        if (res.ok) {
          const data = await res.json();
          setSegments(data.segments ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [breakdown, days]);

  return (
    <div className="space-y-4">
      {/* Tab + period selectors */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-surface-hover p-0.5">
          {BREAKDOWN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBreakdown(tab.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                breakdown === tab.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                days === d
                  ? "bg-primary text-white"
                  : "bg-surface-hover text-secondary hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : segments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No revenue data available for this breakdown.
        </p>
      ) : breakdown === "hour" ? (
        <HourGrid segments={segments} />
      ) : (
        <SegmentList segments={segments} />
      )}
    </div>
  );
}

function SegmentList({ segments }: { segments: Segment[] }) {
  const totalValue = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-3">
      {/* Visual bar */}
      <div className="flex h-4 overflow-hidden rounded-full">
        {segments.slice(0, 8).map((seg, i) => (
          <div
            key={seg.label}
            className={`${PIE_COLORS[i % PIE_COLORS.length]} transition-all`}
            style={{ width: `${Math.max(seg.pct, 1)}%` }}
          />
        ))}
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-2">
        {segments.slice(0, 8).map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <div
              className={`h-2.5 w-2.5 rounded-full ${PIE_COLORS[i % PIE_COLORS.length]}`}
            />
            <span className="truncate text-foreground">{seg.label}</span>
            <span className="ml-auto whitespace-nowrap text-secondary">
              ${seg.value.toLocaleString()} ({seg.pct}%)
            </span>
          </div>
        ))}
      </div>

      {totalValue > 0 && (
        <div className="rounded-lg border border-border bg-background p-3 text-xs">
          <span className="text-muted">Total Revenue: </span>
          <span className="font-medium text-foreground">
            ${totalValue.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

function HourGrid({ segments }: { segments: Segment[] }) {
  const maxValue = Math.max(...segments.map((s) => s.value), 1);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-1">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`flex flex-col items-center justify-center rounded-md p-2 ${getHourCellColor(seg.value, maxValue)}`}
            title={`${seg.label}: $${seg.value.toLocaleString()}`}
          >
            <span className="text-[10px] font-medium text-foreground">
              {seg.label}
            </span>
            <span className="text-[9px] text-secondary">
              ${seg.value >= 1000 ? `${(seg.value / 1000).toFixed(1)}k` : seg.value}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted">
        <span>Low revenue</span>
        <div className="flex items-center gap-1">
          {HOUR_CELL_COLORS.map((c, i) => (
            <div key={i} className={`h-2 w-4 rounded-sm ${c}`} />
          ))}
        </div>
        <span>High revenue</span>
      </div>
    </div>
  );
}
