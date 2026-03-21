"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface ProductMargin {
  product_id: string;
  title: string;
  units_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin_pct: number;
}

interface MarginSummary {
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_margin: number;
}

export function ProfitMargins() {
  const [products, setProducts] = useState<ProductMargin[]>([]);
  const [summary, setSummary] = useState<MarginSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/margins?days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products ?? []);
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

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          <SummaryCard label="Revenue" value={`$${summary.total_revenue.toLocaleString()}`} />
          <SummaryCard label="Cost" value={`$${summary.total_cost.toLocaleString()}`} />
          <SummaryCard
            label="Profit"
            value={`$${summary.total_profit.toLocaleString()}`}
            positive={summary.total_profit >= 0}
          />
          <SummaryCard
            label="Avg Margin"
            value={`${summary.avg_margin}%`}
            positive={summary.avg_margin >= 0}
          />
        </div>
      )}

      {/* Product table */}
      {products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted">
                  Product
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                  Units
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                  Revenue
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                  Cost
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                  Profit
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                  Margin
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.product_id}
                  className="border-b border-border/50 hover:bg-surface-hover"
                >
                  <td className="max-w-[200px] truncate px-3 py-2 text-foreground">
                    {p.title}
                  </td>
                  <td className="px-3 py-2 text-right text-secondary">
                    {p.units_sold}
                  </td>
                  <td className="px-3 py-2 text-right text-secondary">
                    ${p.revenue.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-secondary">
                    ${p.cost.toLocaleString()}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      p.profit >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    ${p.profit.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        p.margin_pct >= 30
                          ? "text-success"
                          : p.margin_pct >= 10
                            ? "text-warning"
                            : "text-danger"
                      }`}
                    >
                      {p.margin_pct >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {p.margin_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted">
          No margin data available. Add cost prices to your products to see
          profit margins.
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-bold ${
          positive === undefined
            ? "text-foreground"
            : positive
              ? "text-success"
              : "text-danger"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
