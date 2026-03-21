import { createClient } from "@/lib/supabase/server";
import type { Insight, Product, Customer, CustomerSegment } from "@/lib/supabase/types";

// ─── Period helpers ──────────────────────────────────────────────

export type Period = "7d" | "30d" | "90d" | "12mo";

function periodToDate(period: Period): string {
  const now = new Date();
  switch (period) {
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    case "90d":
      now.setDate(now.getDate() - 90);
      break;
    case "12mo":
      now.setFullYear(now.getFullYear() - 1);
      break;
  }
  return now.toISOString();
}

function previousPeriodDate(period: Period): { start: string; end: string } {
  const now = new Date();
  let daysBack: number;
  switch (period) {
    case "7d":
      daysBack = 7;
      break;
    case "30d":
      daysBack = 30;
      break;
    case "90d":
      daysBack = 90;
      break;
    case "12mo":
      daysBack = 365;
      break;
  }
  const end = new Date(now);
  end.setDate(end.getDate() - daysBack);
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ─── KPIs ────────────────────────────────────────────────────────

export interface KPIs {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  avgOrderValue: number;
  aovChange: number;
  totalCustomers: number;
  customersChange: number;
}

export async function getKPIs(storeId: string, period: Period): Promise<KPIs> {
  const supabase = await createClient();
  const since = periodToDate(period);
  const prev = previousPeriodDate(period);

  // Run all 4 queries in parallel instead of sequentially
  const [
    { data: currentOrders },
    { data: prevOrders },
    { count: currentCustomerCount },
    { count: prevCustomerCount },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total")
      .eq("store_id", storeId)
      .gte("created_at", since)
      .not("status", "in", '("cancelled","refunded")'),
    supabase
      .from("orders")
      .select("total")
      .eq("store_id", storeId)
      .gte("created_at", prev.start)
      .lt("created_at", prev.end)
      .not("status", "in", '("cancelled","refunded")'),
    supabase
      .from("orders")
      .select("customer_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", since)
      .not("customer_id", "is", null),
    supabase
      .from("orders")
      .select("customer_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", prev.start)
      .lt("created_at", prev.end)
      .not("customer_id", "is", null),
  ]);

  const currentRevenue = (currentOrders ?? []).reduce((sum, o) => sum + Number(o.total), 0);
  const prevRevenue = (prevOrders ?? []).reduce((sum, o) => sum + Number(o.total), 0);

  const currentOrderCount = currentOrders?.length ?? 0;
  const prevOrderCount = prevOrders?.length ?? 0;

  const currentAOV = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
  const prevAOV = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;

  return {
    totalRevenue: currentRevenue,
    revenueChange: calcChange(currentRevenue, prevRevenue),
    totalOrders: currentOrderCount,
    ordersChange: calcChange(currentOrderCount, prevOrderCount),
    avgOrderValue: currentAOV,
    aovChange: calcChange(currentAOV, prevAOV),
    totalCustomers: currentCustomerCount ?? 0,
    customersChange: calcChange(currentCustomerCount ?? 0, prevCustomerCount ?? 0),
  };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Revenue Trend ───────────────────────────────────────────────

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export async function getRevenueTrend(
  storeId: string,
  period: Period
): Promise<RevenueTrendPoint[]> {
  const supabase = await createClient();
  const since = periodToDate(period);

  const { data: orders } = await supabase
    .from("orders")
    .select("total, created_at")
    .eq("store_id", storeId)
    .gte("created_at", since)
    .not("status", "in", '("cancelled","refunded")')
    .order("created_at", { ascending: true });

  if (!orders || orders.length === 0) return [];

  // Group by date
  const grouped = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    const date = order.created_at.split("T")[0];
    const existing = grouped.get(date) ?? { revenue: 0, orders: 0 };
    existing.revenue += Number(order.total);
    existing.orders += 1;
    grouped.set(date, existing);
  }

  // Fill in missing dates
  const result: RevenueTrendPoint[] = [];
  const startDate = new Date(since);
  const endDate = new Date();

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const data = grouped.get(dateStr);
    result.push({
      date: dateStr,
      revenue: data?.revenue ?? 0,
      orders: data?.orders ?? 0,
    });
  }

  return result;
}

// ─── Top Products ────────────────────────────────────────────────

export interface TopProduct {
  id: string;
  title: string;
  image_url: string | null;
  totalRevenue: number;
  unitsSold: number;
}

export async function getTopProducts(
  storeId: string,
  period: Period,
  limit = 5
): Promise<TopProduct[]> {
  const supabase = await createClient();
  const since = periodToDate(period);

  // Get order items from recent orders
  const { data: items } = await supabase
    .from("order_items")
    .select(`
      product_id,
      quantity,
      total_price,
      order:orders!inner(store_id, created_at, status)
    `)
    .eq("orders.store_id", storeId)
    .gte("orders.created_at", since)
    .not("orders.status", "in", '("cancelled","refunded")')
    .not("product_id", "is", null);

  if (!items || items.length === 0) return [];

  // Aggregate by product
  const productMap = new Map<string, { revenue: number; units: number }>();
  for (const item of items) {
    if (!item.product_id) continue;
    const existing = productMap.get(item.product_id) ?? { revenue: 0, units: 0 };
    existing.revenue += Number(item.total_price);
    existing.units += item.quantity;
    productMap.set(item.product_id, existing);
  }

  // Sort by revenue and take top N
  const topProductIds = [...productMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, limit)
    .map(([id]) => id);

  if (topProductIds.length === 0) return [];

  // Fetch product details
  const { data: products } = await supabase
    .from("products")
    .select("id, title, image_url")
    .in("id", topProductIds);

  const productDetails = new Map(
    (products ?? []).map((p) => [p.id, p])
  );

  return topProductIds.map((id) => {
    const product = productDetails.get(id);
    const stats = productMap.get(id)!;
    return {
      id,
      title: product?.title ?? "Unknown Product",
      image_url: product?.image_url ?? null,
      totalRevenue: stats.revenue,
      unitsSold: stats.units,
    };
  });
}

// ─── Customer Segments ───────────────────────────────────────────

export interface SegmentCounts {
  new: number;
  active: number;
  at_risk: number;
  churned: number;
  vip: number;
  total: number;
}

export async function getCustomerSegmentCounts(storeId: string): Promise<SegmentCounts> {
  const supabase = await createClient();

  // Single GROUP BY query instead of 5 separate COUNT(*) calls
  const { data } = await supabase
    .from("customers")
    .select("segment")
    .eq("store_id", storeId);

  const counts: Record<string, number> = {
    new: 0,
    active: 0,
    at_risk: 0,
    churned: 0,
    vip: 0,
  };

  for (const row of data ?? []) {
    const seg = row.segment as string;
    if (seg in counts) {
      counts[seg]++;
    }
  }

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return {
    new: counts["new"],
    active: counts["active"],
    at_risk: counts["at_risk"],
    churned: counts["churned"],
    vip: counts["vip"],
    total,
  };
}

// ─── Top Customers ───────────────────────────────────────────────

export interface TopCustomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  lifetime_value: number;
  order_count: number;
  segment: CustomerSegment;
  last_order_date: string | null;
}

export async function getTopCustomers(
  storeId: string,
  limit = 10
): Promise<TopCustomer[]> {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name, lifetime_value, order_count, segment, last_order_date")
    .eq("store_id", storeId)
    .order("lifetime_value", { ascending: false })
    .limit(limit);

  return (customers ?? []).map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    lifetime_value: Number(c.lifetime_value),
    order_count: c.order_count,
    segment: c.segment as CustomerSegment,
    last_order_date: c.last_order_date,
  }));
}

// ─── Recent Insights ─────────────────────────────────────────────

export async function getRecentInsights(
  storeId: string,
  limit = 5
): Promise<Insight[]> {
  const supabase = await createClient();

  const { data: insights } = await supabase
    .from("insights")
    .select("*")
    .eq("store_id", storeId)
    .order("generated_at", { ascending: false })
    .limit(limit);

  return (insights ?? []) as Insight[];
}

// ─── Ad Spend ───────────────────────────────────────────────────

export interface AdSpendSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  roas: number;
  cpa: number;
}

export async function getAdSpendSummary(
  storeId: string,
  period: Period
): Promise<AdSpendSummary> {
  const supabase = await createClient();
  const since = periodToDate(period);

  const { data: adData } = await supabase
    .from("ad_spend")
    .select("spend, impressions, clicks, conversions, revenue_attributed")
    .eq("store_id", storeId)
    .gte("date", since.split("T")[0]);

  const rows = adData ?? [];
  const totalSpend = rows.reduce((s, r) => s + Number(r.spend), 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = rows.reduce((s, r) => s + r.conversions, 0);
  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue_attributed), 0);

  return {
    totalSpend,
    totalImpressions,
    totalClicks,
    totalConversions,
    totalRevenue,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
  };
}

export interface AdSpendByPlatform {
  platform: string;
  spend: number;
  conversions: number;
  revenue: number;
  roas: number;
}

export async function getAdSpendByPlatform(
  storeId: string,
  period: Period
): Promise<AdSpendByPlatform[]> {
  const supabase = await createClient();
  const since = periodToDate(period);

  const { data } = await supabase
    .from("ad_spend")
    .select("platform, spend, conversions, revenue_attributed")
    .eq("store_id", storeId)
    .gte("date", since.split("T")[0]);

  const grouped = new Map<string, { spend: number; conversions: number; revenue: number }>();
  for (const row of data ?? []) {
    const existing = grouped.get(row.platform) ?? { spend: 0, conversions: 0, revenue: 0 };
    existing.spend += Number(row.spend);
    existing.conversions += row.conversions;
    existing.revenue += Number(row.revenue_attributed);
    grouped.set(row.platform, existing);
  }

  return [...grouped.entries()].map(([platform, stats]) => ({
    platform,
    ...stats,
    roas: stats.spend > 0 ? stats.revenue / stats.spend : 0,
  }));
}

export interface TopCampaign {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  spend: number;
  conversions: number;
  revenue: number;
  roas: number;
}

export async function getTopCampaigns(
  storeId: string,
  period: Period,
  limit = 10
): Promise<TopCampaign[]> {
  const supabase = await createClient();
  const since = periodToDate(period);

  const { data } = await supabase
    .from("ad_spend")
    .select("campaign_id, campaign_name, platform, spend, conversions, revenue_attributed")
    .eq("store_id", storeId)
    .gte("date", since.split("T")[0]);

  // Aggregate by campaign
  const grouped = new Map<string, {
    campaign_name: string;
    platform: string;
    spend: number;
    conversions: number;
    revenue: number;
  }>();

  for (const row of data ?? []) {
    const existing = grouped.get(row.campaign_id) ?? {
      campaign_name: row.campaign_name ?? "Unknown",
      platform: row.platform,
      spend: 0,
      conversions: 0,
      revenue: 0,
    };
    existing.spend += Number(row.spend);
    existing.conversions += row.conversions;
    existing.revenue += Number(row.revenue_attributed);
    grouped.set(row.campaign_id, existing);
  }

  return [...grouped.entries()]
    .map(([campaign_id, stats]) => ({
      campaign_id,
      ...stats,
      roas: stats.spend > 0 ? stats.revenue / stats.spend : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit);
}
