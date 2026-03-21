"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface FunnelStage {
  name: string;
  count: number;
  dropoff_pct: number;
  conversion_pct: number;
}

interface FunnelData {
  stages: FunnelStage[];
  summary: { total: number; cancelled: number; refunded: number };
  period_days: number;
}

const STAGE_COLORS = [
  "bg-primary",
  "bg-primary/80",
  "bg-primary/60",
];

export function ConversionFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/funnel?days=${days}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!data || data.stages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No order data available to display the conversion funnel.
      </p>
    );
  }

  const maxCount = Math.max(...data.stages.map((s) => s.count), 1);

  return (
    <div className="space-y-4">
      {/* Period selector */}
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

      {/* Funnel bars */}
      <div className="space-y-3">
        {data.stages.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 4);
          return (
            <div key={stage.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground capitalize">
                  {stage.name}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-secondary">
                    {stage.count.toLocaleString()} orders
                  </span>
                  {i > 0 && (
                    <span className="text-muted">
                      {stage.dropoff_pct}% drop-off
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 w-full rounded-lg bg-surface-hover">
                <div
                  className={`h-full rounded-lg ${STAGE_COLORS[i] ?? "bg-primary/40"} flex items-center justify-end pr-2 transition-all duration-500`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="text-[10px] font-bold text-white">
                    {stage.conversion_pct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-background p-3 text-xs">
        <div>
          <span className="text-muted">Total Orders: </span>
          <span className="font-medium text-foreground">
            {data.summary.total.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-muted">Cancelled: </span>
          <span className="font-medium text-danger">
            {data.summary.cancelled.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-muted">Refunded: </span>
          <span className="font-medium text-warning">
            {data.summary.refunded.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
