"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, X } from "lucide-react";

interface ProductResult {
  id: string;
  title: string;
  image_url: string | null;
  revenue: number;
  units: number;
  aov: number;
  trend: Array<{ date: string; value: number }>;
}

interface ProductOption {
  id: string;
  title: string;
}

export function ProductComparison() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [days, setDays] = useState(30);

  // Debounced product search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/products/paginated?search=${encodeURIComponent(searchQuery)}&limit=6`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.products ?? []).map((p: { id: string; title: string }) => ({
              id: p.id,
              title: p.title,
            }))
          );
        }
      } catch {
        // Silently fail
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addProduct = useCallback(
    (id: string) => {
      if (selectedIds.length >= 4 || selectedIds.includes(id)) return;
      setSelectedIds((prev) => [...prev, id]);
      setSearchQuery("");
      setSearchResults([]);
    },
    [selectedIds]
  );

  const removeProduct = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((pid) => pid !== id));
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const compare = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/product-comparison?products=${selectedIds.join(",")}&days=${days}`
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [selectedIds, days]);

  return (
    <div className="space-y-4">
      {/* Search + select */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products to compare (up to 4)..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
          />
          {searching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        </div>

        {/* Search dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-surface shadow-lg">
            {searchResults
              .filter((r) => !selectedIds.includes(r.id))
              .map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product.id)}
                  className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
                >
                  {product.title}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Selected products chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.map((id) => {
            const product = products.find((p) => p.id === id);
            const label = product?.title ?? id.slice(0, 8);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {label}
                <button onClick={() => removeProduct(id)} className="hover:text-danger">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          <div className="flex items-center gap-2 ml-auto">
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

          <button
            onClick={compare}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : selectedIds.length > 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Click &ldquo;Compare&rdquo; to see side-by-side analytics.
        </p>
      ) : (
        <p className="py-8 text-center text-sm text-muted">
          Search and select products above to compare their performance.
        </p>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ProductResult }) {
  const maxTrend = Math.max(...product.trend.map((t) => t.value), 1);

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground truncate">
        {product.title}
      </h3>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] font-medium uppercase text-muted">Revenue</p>
          <p className="text-sm font-bold text-foreground">
            ${product.revenue.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase text-muted">Units</p>
          <p className="text-sm font-bold text-foreground">{product.units}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase text-muted">AOV</p>
          <p className="text-sm font-bold text-foreground">
            ${product.aov.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Mini sparkline */}
      {product.trend.length > 0 && (
        <div className="flex items-end gap-px" style={{ height: "40px" }}>
          {product.trend.map((point, i) => {
            const heightPct = Math.max((point.value / maxTrend) * 100, 2);
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-primary/50"
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
