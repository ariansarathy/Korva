"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, Package, TrendingDown, ArrowUp } from "lucide-react";

interface VelocityProduct {
  product_id: string;
  title: string;
  sku: string | null;
  inventory_qty: number;
  velocity_daily: number;
  sold_30d: number;
  days_of_stock: number;
  stock_status: "out_of_stock" | "critical" | "low" | "healthy" | "overstocked";
  reorder_suggested: boolean;
  suggested_reorder_qty: number;
}

interface VelocitySummary {
  total_products: number;
  out_of_stock: number;
  critical: number;
  low_stock: number;
  healthy: number;
  overstocked: number;
  total_inventory_value: number;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  out_of_stock: { label: "Out of Stock", color: "text-danger", bg: "bg-danger/10" },
  critical: { label: "Critical", color: "text-danger", bg: "bg-danger/10" },
  low: { label: "Low Stock", color: "text-warning", bg: "bg-warning/10" },
  healthy: { label: "Healthy", color: "text-success", bg: "bg-success/10" },
  overstocked: { label: "Overstocked", color: "text-blue-500", bg: "bg-blue-50" },
};

export function InventoryVelocity() {
  const [products, setProducts] = useState<VelocityProduct[]>([]);
  const [summary, setSummary] = useState<VelocitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/inventory-velocity");
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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No inventory data available. Products with inventory will appear here.
      </p>
    );
  }

  const filtered =
    statusFilter === "all"
      ? products
      : products.filter((p) => p.stock_status === statusFilter);

  const needsReorder = products.filter((p) => p.reorder_suggested);

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              Out of Stock
            </p>
            <p className="text-lg font-bold text-danger">
              {summary.out_of_stock}
            </p>
          </div>
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              Critical
            </p>
            <p className="text-lg font-bold text-danger">{summary.critical}</p>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              Low Stock
            </p>
            <p className="text-lg font-bold text-warning">{summary.low_stock}</p>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              Healthy
            </p>
            <p className="text-lg font-bold text-success">{summary.healthy}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase text-muted">
              Inventory Value
            </p>
            <p className="text-lg font-bold text-foreground">
              ${summary.total_inventory_value.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Reorder alerts */}
      {needsReorder.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-medium text-foreground">
              {needsReorder.length} products need reordering
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {needsReorder.slice(0, 5).map((p) => (
              <span
                key={p.product_id}
                className="rounded-full bg-warning/20 px-2.5 py-0.5 text-[10px] font-medium text-foreground"
              >
                {p.title.slice(0, 30)} (+{p.suggested_reorder_qty})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        {["all", "out_of_stock", "critical", "low", "healthy", "overstocked"].map(
          (f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f
                  ? "bg-primary text-white"
                  : "bg-surface-hover text-secondary hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : statusConfig[f]?.label ?? f}
            </button>
          )
        )}
      </div>

      {/* Product table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted">
                Product
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                Stock
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                Sold/30d
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                Velocity/day
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted">
                Days Left
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((p) => {
              const config = statusConfig[p.stock_status];
              return (
                <tr
                  key={p.product_id}
                  className="border-b border-border/50 hover:bg-surface-hover"
                >
                  <td className="max-w-[200px] px-3 py-2">
                    <p className="truncate text-foreground">{p.title}</p>
                    {p.sku && (
                      <p className="text-[10px] text-muted">{p.sku}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-secondary">
                    {p.inventory_qty}
                  </td>
                  <td className="px-3 py-2 text-right text-secondary">
                    {p.sold_30d}
                  </td>
                  <td className="px-3 py-2 text-right text-secondary">
                    {p.velocity_daily}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`font-medium ${
                        p.days_of_stock <= 7
                          ? "text-danger"
                          : p.days_of_stock <= 30
                            ? "text-warning"
                            : "text-foreground"
                      }`}
                    >
                      {p.days_of_stock > 365 ? "365+" : p.days_of_stock}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${config?.bg} ${config?.color}`}
                    >
                      {config?.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
