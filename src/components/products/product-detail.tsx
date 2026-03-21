"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Package,
  DollarSign,
  TrendingUp,
  BarChart3,
  Archive,
  Tag,
} from "lucide-react";

interface ProductDetailProps {
  product: {
    id: string;
    title: string;
    description: string | null;
    sku: string | null;
    category: string | null;
    cost_price: number | null;
    sell_price: number | null;
    compare_at_price: number | null;
    inventory_qty: number;
    velocity_daily: number | null;
    days_of_stock: number | null;
    status: string;
    image_url: string | null;
  };
  analytics: {
    totalUnitsSold: number;
    totalRevenue: number;
    margin: number | null;
  };
  storeCurrency: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10" },
  draft: { label: "Draft", color: "text-warning", bg: "bg-warning/10" },
  archived: { label: "Archived", color: "text-muted", bg: "bg-muted/10" },
};

export function ProductDetail({
  product,
  analytics,
  storeCurrency,
}: ProductDetailProps) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: storeCurrency,
  });

  const status = statusConfig[product.status] ?? {
    label: product.status,
    color: "text-muted",
    bg: "bg-muted/10",
  };

  const stockStatus =
    product.days_of_stock !== null
      ? product.days_of_stock < 7
        ? { label: `${product.days_of_stock}d left`, color: "text-danger" }
        : product.days_of_stock < 30
          ? { label: `${product.days_of_stock}d left`, color: "text-warning" }
          : { label: `${product.days_of_stock}d left`, color: "text-success" }
      : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      {/* Product Hero */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Product Image */}
          <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-lg bg-background">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <Package className="h-12 w-12 text-muted" />
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {product.title}
                </h1>
                <div className="mt-1 flex items-center gap-3">
                  {product.sku && (
                    <span className="text-sm text-muted">SKU: {product.sku}</span>
                  )}
                  {product.category && (
                    <span className="inline-flex items-center gap-1 text-sm text-muted">
                      <Tag className="h-3 w-3" />
                      {product.category}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${status.bg} ${status.color}`}
              >
                {status.label}
              </span>
            </div>

            {product.description && (
              <p className="mt-3 text-sm text-muted line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Price Row */}
            <div className="mt-4 flex items-baseline gap-4">
              {product.sell_price !== null && (
                <span className="text-2xl font-bold text-foreground">
                  {formatter.format(product.sell_price)}
                </span>
              )}
              {product.compare_at_price !== null &&
                product.compare_at_price > (product.sell_price ?? 0) && (
                  <span className="text-base text-muted line-through">
                    {formatter.format(product.compare_at_price)}
                  </span>
                )}
              {product.cost_price !== null && (
                <span className="text-sm text-muted">
                  Cost: {formatter.format(product.cost_price)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <DollarSign className="h-3.5 w-3.5" />
              Total Revenue
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {formatter.format(analytics.totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <BarChart3 className="h-3.5 w-3.5" />
              Units Sold
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {analytics.totalUnitsSold.toLocaleString()}
            </p>
          </div>
          {analytics.margin !== null && (
            <div className="rounded-lg bg-background p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <TrendingUp className="h-3.5 w-3.5" />
                Margin
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">
                {analytics.margin}%
              </p>
            </div>
          )}
          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Archive className="h-3.5 w-3.5" />
              In Stock
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {product.inventory_qty.toLocaleString()}
            </p>
            {stockStatus && (
              <p className={`text-xs ${stockStatus.color}`}>{stockStatus.label}</p>
            )}
          </div>
          {product.velocity_daily !== null && (
            <div className="rounded-lg bg-background p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <TrendingUp className="h-3.5 w-3.5" />
                Daily Velocity
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">
                {product.velocity_daily.toFixed(1)}/day
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
