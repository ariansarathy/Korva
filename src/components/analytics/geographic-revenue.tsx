"use client";

import { useState, useEffect } from "react";
import { Loader2, Globe, MapPin } from "lucide-react";

interface CountryData {
  country: string;
  revenue: number;
  orders: number;
  customers: number;
  avg_order_value: number;
}

interface RegionData {
  region: string;
  country: string;
  revenue: number;
  orders: number;
}

interface GeoSummary {
  total_revenue: number;
  total_orders: number;
  top_country: string | null;
  country_count: number;
}

export function GeographicRevenue() {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [summary, setSummary] = useState<GeoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [view, setView] = useState<"countries" | "regions">("countries");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/geography?days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setCountries(data.countries ?? []);
          setRegions(data.regions ?? []);
          setSummary(data.summary ?? null);
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

  if (countries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No geographic data available yet. Revenue by location will appear once
        orders include shipping addresses.
      </p>
    );
  }

  const maxRevenue = countries[0]?.revenue ?? 1;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("countries")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              view === "countries"
                ? "bg-primary text-white"
                : "text-secondary hover:text-foreground"
            }`}
          >
            <Globe className="h-3 w-3" />
            Countries
          </button>
          <button
            onClick={() => setView("regions")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              view === "regions"
                ? "bg-primary text-white"
                : "text-secondary hover:text-foreground"
            }`}
          >
            <MapPin className="h-3 w-3" />
            Regions
          </button>
        </div>
      </div>

      {/* Summary row */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Revenue
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              ${summary.total_revenue.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Top Country
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {summary.top_country ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Countries
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {summary.country_count}
            </p>
          </div>
        </div>
      )}

      {/* Country list with bar chart */}
      {view === "countries" ? (
        <div className="space-y-2">
          {countries.map((c) => (
            <div
              key={c.country}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="w-24 shrink-0">
                <p className="text-sm font-medium text-foreground">
                  {c.country}
                </p>
                <p className="text-[10px] text-muted">
                  {c.orders} orders · {c.customers} customers
                </p>
              </div>
              <div className="flex-1">
                <div className="h-4 w-full rounded-full bg-surface-hover">
                  <div
                    className="h-4 rounded-full bg-primary/60"
                    style={{
                      width: `${Math.max(2, (c.revenue / maxRevenue) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="w-28 text-right">
                <p className="text-sm font-semibold text-foreground">
                  ${c.revenue.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted">
                  AOV ${c.avg_order_value}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {regions.map((r, i) => (
            <div
              key={`${r.country}-${r.region}-${i}`}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted" />
                <span className="text-sm text-foreground">{r.region}</span>
                <span className="text-[10px] text-muted">{r.country}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-foreground">
                  ${r.revenue.toLocaleString()}
                </span>
                <span className="ml-2 text-[10px] text-muted">
                  {r.orders} orders
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
