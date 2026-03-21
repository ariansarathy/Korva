"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  ShoppingBag,
  DollarSign,
  Calendar,
  MapPin,
  Crown,
  TrendingUp,
} from "lucide-react";

interface CustomerDetailProps {
  customer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_hash: string | null;
    segment: string;
    order_count: number;
    lifetime_value: number;
    last_order_date: string | null;
    city: string | null;
    country: string | null;
    created_at: string;
  };
  recentOrders: Array<{
    id: string;
    external_id: string;
    total: number;
    status: string;
    created_at: string;
  }>;
  storeCurrency: string;
}

const segmentConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-primary", bg: "bg-primary/10" },
  active: { label: "Active", color: "text-success", bg: "bg-success/10" },
  at_risk: { label: "At Risk", color: "text-warning", bg: "bg-warning/10" },
  churned: { label: "Churned", color: "text-danger", bg: "bg-danger/10" },
  vip: { label: "VIP", color: "text-primary", bg: "bg-primary/10" },
};

const statusColors: Record<string, string> = {
  paid: "bg-success/10 text-success",
  fulfilled: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  cancelled: "bg-danger/10 text-danger",
  refunded: "bg-muted/10 text-muted",
};

export function CustomerDetail({
  customer,
  recentOrders,
  storeCurrency,
}: CustomerDetailProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "overview">("overview");

  const fullName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    "Anonymous Customer";

  const location = [customer.city, customer.country]
    .filter(Boolean)
    .join(", ");

  const segment = segmentConfig[customer.segment] ?? {
    label: customer.segment,
    color: "text-muted",
    bg: "bg-muted/10",
  };

  const avgOrderValue =
    customer.order_count > 0
      ? customer.lifetime_value / customer.order_count
      : 0;

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: storeCurrency,
  });

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              {customer.segment === "vip" ? (
                <Crown className="h-7 w-7 text-primary" />
              ) : (
                <User className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{fullName}</h1>
              {customer.email_hash && (
                <p className="text-sm text-muted">{customer.email_hash}</p>
              )}
              {location && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <MapPin className="h-3 w-3" />
                  {location}
                </div>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${segment.bg} ${segment.color}`}
          >
            {segment.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <DollarSign className="h-3.5 w-3.5" />
              Lifetime Value
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {formatter.format(customer.lifetime_value)}
            </p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <ShoppingBag className="h-3.5 w-3.5" />
              Total Orders
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {customer.order_count}
            </p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <TrendingUp className="h-3.5 w-3.5" />
              Avg Order Value
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {formatter.format(avgOrderValue)}
            </p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Calendar className="h-3.5 w-3.5" />
              Last Order
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {customer.last_order_date
                ? new Date(customer.last_order_date).toLocaleDateString()
                : "Never"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(["overview", "orders"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Customer Details
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Customer since</dt>
                <dd className="font-medium text-foreground">
                  {new Date(customer.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Segment</dt>
                <dd>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${segment.bg} ${segment.color}`}
                  >
                    {segment.label}
                  </span>
                </dd>
              </div>
              {location && (
                <div className="flex justify-between">
                  <dt className="text-muted">Location</dt>
                  <dd className="font-medium text-foreground">{location}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Avg days between orders</dt>
                <dd className="font-medium text-foreground">
                  {customer.order_count > 1 &&
                  customer.last_order_date &&
                  customer.created_at
                    ? Math.round(
                        (new Date(customer.last_order_date).getTime() -
                          new Date(customer.created_at).getTime()) /
                          (1000 * 60 * 60 * 24 * (customer.order_count - 1))
                      )
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Recent Orders Summary */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Recent Orders
            </h3>
            {recentOrders.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No orders yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        #{order.external_id ?? order.id.slice(0, 8)}
                      </span>
                      <span className="ml-2 text-xs text-muted">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColors[order.status] ?? "bg-muted/10 text-muted"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatter.format(Number(order.total))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">
              Order History
            </h3>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-2 text-sm text-muted">No orders found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-hover">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Order
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Date
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Status
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3 font-medium text-foreground">
                      #{order.external_id ?? order.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColors[order.status] ?? "bg-muted/10 text-muted"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      {formatter.format(Number(order.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
