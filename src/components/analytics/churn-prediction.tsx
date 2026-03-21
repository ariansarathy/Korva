"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, Shield, AlertCircle, XCircle } from "lucide-react";

interface ChurnPrediction {
  customer_id: string;
  name: string;
  segment: string;
  order_count: number;
  lifetime_value: number;
  days_since_last_order: number;
  avg_order_frequency: number;
  risk: "low" | "medium" | "high" | "churned";
  churn_probability: number;
}

interface ChurnSummary {
  total_customers: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  churned: number;
  at_risk_revenue: number;
}

const riskConfig = {
  low: {
    label: "Low Risk",
    color: "text-success",
    bg: "bg-success/10",
    icon: Shield,
  },
  medium: {
    label: "Medium",
    color: "text-warning",
    bg: "bg-warning/10",
    icon: AlertCircle,
  },
  high: {
    label: "High Risk",
    color: "text-danger",
    bg: "bg-danger/10",
    icon: AlertTriangle,
  },
  churned: {
    label: "Churned",
    color: "text-muted",
    bg: "bg-surface-hover",
    icon: XCircle,
  },
};

export function ChurnPrediction() {
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([]);
  const [summary, setSummary] = useState<ChurnSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/churn-prediction");
        if (res.ok) {
          const data = await res.json();
          setPredictions(data.predictions ?? []);
          setSummary(data.summary ?? null);
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

  if (predictions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Not enough customer data to predict churn risk.
      </p>
    );
  }

  const filtered =
    riskFilter === "all"
      ? predictions
      : predictions.filter((p) => p.risk === riskFilter);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              High Risk
            </p>
            <p className="text-lg font-bold text-danger">{summary.high_risk}</p>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              Medium Risk
            </p>
            <p className="text-lg font-bold text-warning">
              {summary.medium_risk}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              Churned
            </p>
            <p className="text-lg font-bold text-secondary">{summary.churned}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              At-Risk Revenue
            </p>
            <p className="text-lg font-bold text-foreground">
              ${summary.at_risk_revenue.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        {["all", "high", "medium", "low", "churned"].map((f) => (
          <button
            key={f}
            onClick={() => setRiskFilter(f)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors capitalize ${
              riskFilter === f
                ? "bg-primary text-white"
                : "bg-surface-hover text-secondary hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {filtered.slice(0, 50).map((p) => {
          const config = riskConfig[p.risk];
          const Icon = config.icon;

          return (
            <div
              key={p.customer_id}
              className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg}`}
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-muted">
                    {p.order_count} orders · Last order {p.days_since_last_order}d
                    ago · Avg {p.avg_order_frequency}d between orders
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    ${p.lifetime_value.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted">LTV</p>
                </div>
                <div
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}
                >
                  {p.churn_probability}% risk
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
