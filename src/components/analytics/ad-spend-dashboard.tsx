"use client";

import { useState, useEffect } from "react";
import { Loader2, DollarSign, Target, MousePointer, Eye, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Period } from "@/lib/utils/queries";

interface AdSpendData {
  summary: {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    roas: number;
    cpa: number;
  };
  byPlatform: Array<{
    platform: string;
    spend: number;
    conversions: number;
    revenue: number;
    roas: number;
  }>;
  topCampaigns: Array<{
    campaign_id: string;
    campaign_name: string;
    platform: string;
    spend: number;
    conversions: number;
    revenue: number;
    roas: number;
  }>;
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877f2",
  google: "#4285f4",
  tiktok: "#000000",
};

export function AdSpendDashboard() {
  const [data, setData] = useState<AdSpendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/ad-spend?period=${period}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Ad spend fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!data || data.summary.totalSpend === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <DollarSign className="mx-auto h-8 w-8 text-muted" />
        <h3 className="mt-3 text-sm font-medium text-foreground">No ad spend data</h3>
        <p className="mt-1 text-sm text-muted">
          Connect Meta Ads or Google Ads in Settings to track ad performance.
        </p>
      </div>
    );
  }

  const { summary, topCampaigns } = data;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(["7d", "30d", "90d"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              period === p
                ? "bg-primary text-white"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Total Spend"
          value={`$${summary.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
        <KpiCard
          icon={Target}
          label="ROAS"
          value={`${summary.roas.toFixed(2)}x`}
          color={summary.roas >= 2 ? "text-green-600" : summary.roas >= 1 ? "text-yellow-600" : "text-red-600"}
        />
        <KpiCard
          icon={MousePointer}
          label="Clicks"
          value={summary.totalClicks.toLocaleString()}
        />
        <KpiCard
          icon={Eye}
          label="Conversions"
          value={summary.totalConversions.toLocaleString()}
        />
      </div>

      {/* Top Campaigns Chart */}
      {topCampaigns.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Top Campaigns by Spend
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCampaigns.slice(0, 8)}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <YAxis
                  type="category"
                  dataKey="campaign_name"
                  tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value?: string | number | ReadonlyArray<string | number>) => [`$${Number(value).toLocaleString()}`, "Spend"]}
                />
                <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
                  {topCampaigns.slice(0, 8).map((entry, index) => (
                    <Cell
                      key={index}
                      fill={PLATFORM_COLORS[entry.platform] ?? "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Campaign Table */}
      {topCampaigns.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Campaign Details
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-muted">Campaign</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted text-right">Spend</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted text-right">Conv.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted text-right">Revenue</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topCampaigns.map((c) => (
                  <tr key={c.campaign_id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Zap
                          className="h-3 w-3"
                          style={{ color: PLATFORM_COLORS[c.platform] ?? "#6366f1" }}
                        />
                        <span className="text-foreground">{c.campaign_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground font-medium">
                      ${c.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">{c.conversions}</td>
                    <td className="px-4 py-3 text-right text-foreground">
                      ${c.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        c.roas >= 2
                          ? "text-green-600"
                          : c.roas >= 1
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {c.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted" />
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-bold ${color ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
