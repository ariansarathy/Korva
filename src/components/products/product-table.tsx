"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, Package } from "lucide-react";
import type { Product } from "@/lib/supabase/types";

interface ProductTableProps {
  products: Product[];
}

type SortKey = "title" | "sell_price" | "inventory_qty" | "updated_at";
type SortDir = "asc" | "desc";

export function ProductTable({ products }: ProductTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = [...products];

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number | null = a[sortKey];
      let bVal: string | number | null = b[sortKey];

      if (aVal === null) aVal = sortDir === "asc" ? Infinity : -Infinity;
      if (bVal === null) bVal = sortDir === "asc" ? Infinity : -Infinity;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortDir === "asc" ? aNum - bNum : bNum - aNum;
    });

    return result;
  }, [products, search, sortKey, sortDir, statusFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface p-16">
        <Package className="h-12 w-12 text-muted" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          No products yet
        </h3>
        <p className="mt-2 text-sm text-muted">
          Connect your store to see product data here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-hover">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                <button
                  onClick={() => toggleSort("title")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Product
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                <button
                  onClick={() => toggleSort("sell_price")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Price
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                <button
                  onClick={() => toggleSort("inventory_qty")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Inventory
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, 100).map((product) => (
              <tr key={product.id} className="hover:bg-surface-hover">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-10 w-10 rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-hover">
                        <Package className="h-4 w-4 text-muted" />
                      </div>
                    )}
                    <div>
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {product.title}
                      </Link>
                      {product.category && (
                        <p className="text-xs text-muted">{product.category}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">
                  {product.sku || "—"}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {product.sell_price
                    ? `$${Number(product.sell_price).toFixed(2)}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-medium ${
                      product.inventory_qty <= 0
                        ? "text-danger"
                        : product.inventory_qty <= 10
                          ? "text-warning"
                          : "text-foreground"
                    }`}
                  >
                    {product.inventory_qty}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.status === "active"
                        ? "bg-success/10 text-success"
                        : product.status === "draft"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted/10 text-muted"
                    }`}
                  >
                    {product.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <p className="border-t border-border px-4 py-2 text-xs text-muted">
            Showing 100 of {filtered.length} products
          </p>
        )}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No products match your search.
          </p>
        )}
      </div>
    </div>
  );
}
