"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface CohortData {
  cohort_month: string;
  total_customers: number;
  retention: Array<{
    months_after: number;
    retention_rate: number;
    repeat_count: number;
  }>;
}

export function CohortHeatmap() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/cohort");
        if (res.ok) {
          const data = await res.json();
          setCohorts(data.cohorts ?? []);
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

  if (cohorts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Not enough data to display cohort analysis. Cohorts will appear once
        you have repeat customers across multiple months.
      </p>
    );
  }

  // Determine max months_after across all cohorts
  const maxMonths = Math.min(
    12,
    Math.max(...cohorts.flatMap((c) => c.retention.map((r) => r.months_after)))
  );

  function getCellColor(rate: number): string {
    if (rate >= 80) return "bg-primary/80 text-white";
    if (rate >= 60) return "bg-primary/60 text-white";
    if (rate >= 40) return "bg-primary/40 text-foreground";
    if (rate >= 20) return "bg-primary/20 text-foreground";
    if (rate > 0) return "bg-primary/10 text-foreground";
    return "bg-surface-hover text-muted";
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left font-medium text-muted">
              Cohort
            </th>
            <th className="px-2 py-1.5 text-center font-medium text-muted">
              Customers
            </th>
            {Array.from({ length: maxMonths + 1 }, (_, i) => (
              <th
                key={i}
                className="px-2 py-1.5 text-center font-medium text-muted"
              >
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.slice(-12).map((cohort) => {
            const retentionMap = new Map(
              cohort.retention.map((r) => [r.months_after, r.retention_rate])
            );
            const monthLabel = new Date(cohort.cohort_month + "T00:00:00")
              .toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              });

            return (
              <tr key={cohort.cohort_month}>
                <td className="whitespace-nowrap px-2 py-1 font-medium text-foreground">
                  {monthLabel}
                </td>
                <td className="px-2 py-1 text-center text-secondary">
                  {cohort.total_customers}
                </td>
                {Array.from({ length: maxMonths + 1 }, (_, i) => {
                  const rate = retentionMap.get(i);
                  if (rate === undefined) {
                    return (
                      <td key={i} className="px-1 py-1">
                        <div className="h-7 w-12 rounded bg-surface-hover" />
                      </td>
                    );
                  }
                  return (
                    <td key={i} className="px-1 py-1">
                      <div
                        className={`flex h-7 w-12 items-center justify-center rounded text-[10px] font-medium ${getCellColor(rate)}`}
                      >
                        {rate}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
