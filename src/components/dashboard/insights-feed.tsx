"use client";

import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  RefreshCw,
} from "lucide-react";
import { useState, useCallback } from "react";
import type { Insight } from "@/lib/supabase/types";

interface InsightsFeedProps {
  insights: Insight[];
  storeId: string;
}

const severityConfig = {
  positive: {
    icon: TrendingUp,
    iconColor: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
  },
  info: {
    icon: Info,
    iconColor: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/20",
  },
  critical: {
    icon: TrendingDown,
    iconColor: "text-danger",
    bgColor: "bg-danger/10",
    borderColor: "border-danger/20",
  },
};

export function InsightsFeed({ insights: initialInsights, storeId }: InsightsFeedProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentInsights, setCurrentInsights] = useState<Insight[]>(initialInsights);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });

      // Fetch updated insights in-place instead of reloading
      const res = await fetch(`/api/v1/insights?store_id=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentInsights(data.insights ?? data ?? []);
      }
    } catch (err) {
      console.error("Failed to refresh insights:", err);
    } finally {
      setRefreshing(false);
    }
  }, [storeId]);

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Refreshed daily</p>

      <div className="mt-4 space-y-3">
        {currentInsights.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-2 text-sm text-muted">
              AI insights will appear here once your store has enough data
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              Generate Insights
            </button>
          </div>
        ) : (
          currentInsights.map((insight) => {
            const config =
              severityConfig[insight.severity] ?? severityConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={insight.id}
                className={`rounded-lg border p-3 ${config.borderColor} ${config.bgColor}`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-xs text-secondary line-clamp-2">
                      {insight.body}
                    </p>
                    {insight.metric_value && (
                      <p className="mt-1 text-xs font-semibold text-foreground">
                        {insight.metric_value}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
