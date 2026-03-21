"use client";

import { TrendingUp, Activity, DollarSign, Users, Globe, Percent, UserX, Package, FileBarChart, Filter, PieChart, BarChart3, GitCompareArrows } from "lucide-react";
import { ForecastChart } from "@/components/analytics/forecast-chart";
import { AnomalyList } from "@/components/analytics/anomaly-list";
import { AdSpendDashboard } from "@/components/analytics/ad-spend-dashboard";
import { CohortHeatmap } from "@/components/analytics/cohort-heatmap";
import { ProfitMargins } from "@/components/analytics/profit-margins";
import { GeographicRevenue } from "@/components/analytics/geographic-revenue";
import { ChurnPrediction } from "@/components/analytics/churn-prediction";
import { InventoryVelocity } from "@/components/analytics/inventory-velocity";
import { CustomReportBuilder } from "@/components/analytics/custom-report-builder";
import { ConversionFunnel } from "@/components/analytics/conversion-funnel";
import { RevenueBreakdown } from "@/components/analytics/revenue-breakdown";
import { LtvHistogram } from "@/components/analytics/ltv-histogram";
import { ProductComparison } from "@/components/analytics/product-comparison";
import { PlanGate } from "@/components/shared/plan-gate";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-secondary">
          Forecasting, anomaly detection, ad performance, and advanced insights.
        </p>
      </div>

      {/* Revenue Forecast */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Revenue Forecast
            </h2>
            <p className="text-xs text-muted">
              14-day prediction based on historical trends
            </p>
          </div>
        </div>
        <ForecastChart />
      </section>

      {/* Two-column: Anomalies + Ad Spend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Anomaly Detection */}
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <Activity className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Anomaly Detection
              </h2>
              <p className="text-xs text-muted">
                Metrics outside normal ranges
              </p>
            </div>
          </div>
          <AnomalyList />
        </section>

        {/* Ad Spend Overview */}
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Ad Spend Performance
              </h2>
              <p className="text-xs text-muted">
                Campaign ROI across platforms
              </p>
            </div>
          </div>
          <AdSpendDashboard />
        </section>
      </div>

      {/* Cohort Retention */}
      <PlanGate
        requiredPlan="growth"
        feature="cohort_analysis"
        featureLabel="Cohort Analysis"
      >
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Cohort Retention
              </h2>
              <p className="text-xs text-muted">
                Customer retention by signup month
              </p>
            </div>
          </div>
          <CohortHeatmap />
        </section>
      </PlanGate>

      {/* Two-column: Profit Margins + Geographic Revenue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profit Margins */}
        <PlanGate
          requiredPlan="growth"
          feature="profit_margins"
          featureLabel="Profit Margins"
        >
          <section className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <Percent className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Profit Margins
                </h2>
                <p className="text-xs text-muted">
                  Revenue, cost, and profit per product
                </p>
              </div>
            </div>
            <ProfitMargins />
          </section>
        </PlanGate>

        {/* Geographic Revenue */}
        <PlanGate
          requiredPlan="growth"
          feature="geographic_revenue"
          featureLabel="Geographic Revenue"
        >
          <section className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <Globe className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Geographic Revenue
                </h2>
                <p className="text-xs text-muted">
                  Revenue breakdown by country and region
                </p>
              </div>
            </div>
            <GeographicRevenue />
          </section>
        </PlanGate>
      </div>

      {/* Churn Prediction */}
      <PlanGate
        requiredPlan="scale"
        feature="churn_prediction"
        featureLabel="Churn Prediction"
      >
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
              <UserX className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Churn Prediction
              </h2>
              <p className="text-xs text-muted">
                Identify at-risk customers before they leave
              </p>
            </div>
          </div>
          <ChurnPrediction />
        </section>
      </PlanGate>

      {/* Inventory Velocity */}
      <PlanGate
        requiredPlan="growth"
        feature="inventory_velocity"
        featureLabel="Inventory Velocity"
      >
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
              <Package className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Inventory Velocity
              </h2>
              <p className="text-xs text-muted">
                Stock levels, sell-through rates, and reorder alerts
              </p>
            </div>
          </div>
          <InventoryVelocity />
        </section>
      </PlanGate>

      {/* Conversion Funnel */}
      <PlanGate
        requiredPlan="starter"
        feature="conversion_funnel"
        featureLabel="Conversion Funnel"
      >
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
              <Filter className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Conversion Funnel
              </h2>
              <p className="text-xs text-muted">
                Order status progression and drop-off rates
              </p>
            </div>
          </div>
          <ConversionFunnel />
        </section>
      </PlanGate>

      {/* Two-column: Revenue Breakdown + LTV Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlanGate
          requiredPlan="growth"
          feature="revenue_breakdown"
          featureLabel="Revenue Breakdown"
        >
          <section className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100">
                <PieChart className="h-4 w-4 text-pink-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Revenue Breakdown
                </h2>
                <p className="text-xs text-muted">
                  Revenue by category, channel, or time of day
                </p>
              </div>
            </div>
            <RevenueBreakdown />
          </section>
        </PlanGate>

        <PlanGate
          requiredPlan="growth"
          feature="ltv_distribution"
          featureLabel="LTV Distribution"
        >
          <section className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100">
                <BarChart3 className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  LTV Distribution
                </h2>
                <p className="text-xs text-muted">
                  Customer lifetime value histogram and percentiles
                </p>
              </div>
            </div>
            <LtvHistogram />
          </section>
        </PlanGate>
      </div>

      {/* Product Comparison */}
      <PlanGate
        requiredPlan="growth"
        feature="product_comparison"
        featureLabel="Product Comparison"
      >
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <GitCompareArrows className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Product Comparison
              </h2>
              <p className="text-xs text-muted">
                Side-by-side product performance analysis
              </p>
            </div>
          </div>
          <ProductComparison />
        </section>
      </PlanGate>

      {/* Custom Report Builder */}
      <PlanGate
        requiredPlan="scale"
        feature="custom_reports"
        featureLabel="Custom Report Builder"
      >
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <FileBarChart className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Custom Report Builder
              </h2>
              <p className="text-xs text-muted">
                Build custom reports with any metric and dimension
              </p>
            </div>
          </div>
          <CustomReportBuilder />
        </section>
      </PlanGate>
    </div>
  );
}
