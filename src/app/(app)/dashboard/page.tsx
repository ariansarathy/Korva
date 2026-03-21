import { redirect } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { getKPIs, getRevenueTrend, getRecentInsights } from "@/lib/utils/queries";
import type { Period } from "@/lib/utils/queries";
import { RevenueTrendChart } from "@/components/charts/revenue-trend";
import { InsightsFeed } from "@/components/dashboard/insights-feed";
import { isDemoMode, DEMO_KPIS, getDemoRevenueTrend, DEMO_INSIGHTS, DEMO_STORE } from "@/lib/demo";

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { userId, store } = await getCurrentUserStore();

  // Redirect to onboarding if authenticated but no store connected
  if (userId && !store) {
    redirect("/onboarding");
  }

  const resolvedParams = await searchParams;
  const period = (resolvedParams.period ?? "30d") as Period;

  // If no store (unauthenticated or missing), show empty state
  if (!store) {
    return <EmptyDashboard />;
  }

  // Fetch data in parallel (or use demo data)
  const [kpis, revenueTrend, insights] = isDemoMode()
    ? [DEMO_KPIS, getDemoRevenueTrend(), DEMO_INSIGHTS]
    : await Promise.all([
        getKPIs(store.id, period),
        getRevenueTrend(store.id, period),
        getRecentInsights(store.id, 5),
      ]);

  const kpiCards = [
    {
      label: "Revenue",
      value: formatCurrency(kpis.totalRevenue),
      change: kpis.revenueChange,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Orders",
      value: formatNumber(kpis.totalOrders),
      change: kpis.ordersChange,
      icon: ShoppingCart,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(kpis.avgOrderValue),
      change: kpis.aovChange,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Customers",
      value: formatNumber(kpis.totalCustomers),
      change: kpis.customersChange,
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-secondary">
          Your e-commerce performance at a glance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary">
                  {kpi.label}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bgColor}`}
                >
                  <Icon className={`h-[18px] w-[18px] ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-foreground">
                  {kpi.value}
                </span>
                {kpi.change !== 0 && (
                  <span
                    className={`ml-2 inline-flex items-center text-sm font-medium ${
                      kpi.change >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {kpi.change >= 0 ? (
                      <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
                    )}
                    {Math.abs(kpi.change)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-foreground">
            Revenue Trend
          </h3>
          <p className="mt-1 text-xs text-muted">
            {period === "7d"
              ? "Last 7 days"
              : period === "30d"
                ? "Last 30 days"
                : period === "90d"
                  ? "Last 90 days"
                  : "Last 12 months"}
          </p>
          <div className="mt-4">
            <RevenueTrendChart data={revenueTrend} period={period} />
          </div>
        </div>

        {/* AI Insights */}
        <InsightsFeed insights={insights} storeId={store.id} />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/ask"
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Ask Korva</p>
              <p className="text-xs text-muted">
                Ask questions about your data
              </p>
            </div>
          </Link>
          <Link
            href="/products"
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Products</p>
              <p className="text-xs text-muted">
                View product performance
              </p>
            </div>
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <TrendingUp className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                View Reports
              </p>
              <p className="text-xs text-muted">
                AI-generated performance reports
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-secondary">
          Your e-commerce performance at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Revenue", "Orders", "Avg Order Value", "Customers"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <span className="text-sm font-medium text-secondary">{label}</span>
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground">--</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface p-16">
        <div className="text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Connect your store to get started
          </h3>
          <p className="mt-2 text-sm text-muted">
            Link your Shopify store to see real-time analytics and AI insights.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Connect Store
          </Link>
        </div>
      </div>
    </div>
  );
}
