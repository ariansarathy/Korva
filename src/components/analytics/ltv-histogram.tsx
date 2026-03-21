"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Bucket {
  range: string;
  min: number;
  max: number;
  count: number;
  pct: number;
}

interface LtvStats {
  median: number;
  mean: number;
  p75: number;
  p90: number;
  total_customers: number;
}

interface LtvData {
  buckets: Bucket[];
  stats: LtvStats;
}

export function LtvHistogram() {
  const [data, setData] = useState<LtvData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/ltv-distribution");
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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!data || data.buckets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No customer LTV data available yet.
      </p>
    );
  }

  const maxCount = Math.max(...data.buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-4">
      {/* Histogram bars */}
      <div className="flex items-end gap-1.5" style={{ height: "160px" }}>
        {data.buckets.map((bucket) => {
          const heightPct = Math.max((bucket.count / maxCount) * 100, 2);
          return (
            <div
              key={bucket.range}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
            >
              <div
                className="w-full rounded-t-md bg-primary/70 transition-colors hover:bg-primary"
                style={{ height: `${heightPct}%` }}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100">
                {bucket.count} customers ({bucket.pct}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1.5">
        {data.buckets.map((bucket) => (
          <div
            key={bucket.range}
            className="flex-1 text-center text-[10px] text-muted"
          >
            {bucket.range}
          </div>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Median LTV" value={`$${data.stats.median.toLocaleString()}`} />
        <StatCard label="Mean LTV" value={`$${data.stats.mean.toLocaleString()}`} />
        <StatCard label="75th Percentile" value={`$${data.stats.p75.toLocaleString()}`} />
        <StatCard label="90th Percentile" value={`$${data.stats.p90.toLocaleString()}`} />
      </div>

      <p className="text-center text-[10px] text-muted">
        Based on {data.stats.total_customers.toLocaleString()} customers
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
