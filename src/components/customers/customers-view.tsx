"use client";

import Link from "next/link";
import { Users, Crown, AlertTriangle, UserX, UserPlus, Star } from "lucide-react";
import type { SegmentCounts, TopCustomer } from "@/lib/utils/queries";

interface CustomersViewProps {
  segments: SegmentCounts;
  topCustomers: TopCustomer[];
}

const segmentConfig = [
  {
    key: "new" as const,
    label: "New",
    icon: UserPlus,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "active" as const,
    label: "Active",
    icon: Users,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    key: "at_risk" as const,
    label: "At Risk",
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    key: "churned" as const,
    label: "Churned",
    icon: UserX,
    color: "text-danger",
    bgColor: "bg-danger/10",
  },
  {
    key: "vip" as const,
    label: "VIP",
    icon: Crown,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const segmentBadgeColors: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  active: "bg-success/10 text-success",
  at_risk: "bg-warning/10 text-warning",
  churned: "bg-danger/10 text-danger",
  vip: "bg-primary/10 text-primary",
};

export function CustomersView({ segments, topCustomers }: CustomersViewProps) {
  return (
    <div className="space-y-6">
      {/* Segment Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {segmentConfig.map((seg) => {
          const Icon = seg.icon;
          const count = segments[seg.key];
          const percentage =
            segments.total > 0
              ? ((count / segments.total) * 100).toFixed(1)
              : "0";

          return (
            <div
              key={seg.key}
              className="rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${seg.bgColor}`}
                >
                  <Icon className={`h-4 w-4 ${seg.color}`} />
                </div>
                <span className="text-xs font-medium text-muted">
                  {seg.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {count.toLocaleString()}
              </p>
              <p className="text-xs text-muted">{percentage}%</p>
            </div>
          );
        })}
      </div>

      {/* Top Customers Table */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">
            Top Customers by Lifetime Value
          </h3>
        </div>

        {topCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 text-sm text-muted">
              No customer data yet. Connect your store to see customer insights.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-hover">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Customer
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  LTV
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Orders
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Segment
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Last Order
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-surface-hover">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {customer.segment === "vip" && (
                        <Star className="h-3.5 w-3.5 text-warning" />
                      )}
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {[customer.first_name, customer.last_name]
                          .filter(Boolean)
                          .join(" ") || "Anonymous"}
                      </Link>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-foreground">
                    ${customer.lifetime_value.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    {customer.order_count}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        segmentBadgeColors[customer.segment] ?? "bg-muted/10 text-muted"
                      }`}
                    >
                      {customer.segment.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {customer.last_order_date
                      ? new Date(customer.last_order_date).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
