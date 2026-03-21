"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, Info, AlertCircle } from "lucide-react";
import type { AnomalySeverity } from "@/lib/supabase/types";

interface Anomaly {
  id: string;
  metric: string;
  expected_value: number | null;
  actual_value: number | null;
  deviation_percent: number | null;
  severity: AnomalySeverity;
  description: string;
  detected_at: string;
}

const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  { icon: typeof Info; color: string; bg: string; label: string }
> = {
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    label: "Info",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    label: "Warning",
  },
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    label: "Critical",
  },
};

export function AnomalyList() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnomalies() {
      try {
        const res = await fetch("/api/analytics/anomalies");
        if (res.ok) {
          const data = await res.json();
          setAnomalies(data.anomalies);
        }
      } catch (err) {
        console.error("Anomalies fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnomalies();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-muted" />
        <p className="mt-2 text-sm text-muted">
          No anomalies detected. Your metrics are within normal ranges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly) => {
        const config = SEVERITY_CONFIG[anomaly.severity] ?? SEVERITY_CONFIG.info;
        const Icon = config.icon;
        const direction =
          (anomaly.deviation_percent ?? 0) > 0 ? "+" : "";

        return (
          <div
            key={anomaly.id}
            className={`rounded-lg border p-4 ${config.bg}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {anomaly.metric.replace(/_/g, " ")}
                  </p>
                  <div className="flex items-center gap-2">
                    {anomaly.deviation_percent !== null && (
                      <span
                        className={`text-xs font-bold ${
                          (anomaly.deviation_percent ?? 0) > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {direction}
                        {anomaly.deviation_percent}%
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  {anomaly.description}
                </p>
                <p className="mt-1.5 text-[10px] text-muted">
                  Detected{" "}
                  {new Date(anomaly.detected_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
