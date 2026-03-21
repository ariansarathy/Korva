/**
 * Demo mode utilities and mock data for "Brew & Bean Co."
 * Activates when NEXT_PUBLIC_DEMO_MODE=true in environment.
 */

import type { Product, Customer, Insight, Store } from "@/lib/supabase/types";

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

// ─── Demo Store ──────────────────────────────────────────────

export const DEMO_USER = {
  id: "demo-user-001",
  email: "alex@brewandbean.co",
  full_name: "Alex Rivera",
};

export const DEMO_STORE: Store = {
  id: "demo-store-001",
  user_id: DEMO_USER.id,
  platform: "shopify",
  name: "Brew & Bean Co.",
  url: "https://brewandbean.co",
  currency: "USD",
  timezone: "America/New_York",
  access_token: null,
  last_synced_at: new Date().toISOString(),
  sync_status: "synced",
  connected_at: "2024-08-15T10:00:00Z",
  created_at: "2024-08-15T10:00:00Z",
  updated_at: new Date().toISOString(),
};

// ─── Demo Products ───────────────────────────────────────────

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "prod-001", store_id: DEMO_STORE.id, external_id: "SH-001",
    title: "Ethiopian Yirgacheffe Single Origin", description: "Bright and fruity with notes of blueberry and citrus",
    category: "Coffee Beans", sku: "EB-ETH-001", cost_price: 8.50, sell_price: 18.99, compare_at_price: 22.99,
    inventory_qty: 234, velocity_daily: 8.2, days_of_stock: 28, status: "active", image_url: null,
    created_at: "2024-08-15T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-002", store_id: DEMO_STORE.id, external_id: "SH-002",
    title: "Colombian Supremo Dark Roast", description: "Rich, bold, and chocolatey with low acidity",
    category: "Coffee Beans", sku: "EB-COL-001", cost_price: 7.20, sell_price: 16.99, compare_at_price: null,
    inventory_qty: 189, velocity_daily: 6.5, days_of_stock: 29, status: "active", image_url: null,
    created_at: "2024-08-15T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-003", store_id: DEMO_STORE.id, external_id: "SH-003",
    title: "Matcha Ceremonial Grade Powder", description: "Premium Japanese matcha, stone-ground",
    category: "Tea", sku: "T-MAT-001", cost_price: 12.00, sell_price: 29.99, compare_at_price: 34.99,
    inventory_qty: 78, velocity_daily: 3.1, days_of_stock: 25, status: "active", image_url: null,
    created_at: "2024-09-01T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-004", store_id: DEMO_STORE.id, external_id: "SH-004",
    title: "Pour Over Dripper Kit", description: "Ceramic dripper, carafe, and 100 paper filters",
    category: "Equipment", sku: "EQ-PO-001", cost_price: 15.00, sell_price: 39.99, compare_at_price: null,
    inventory_qty: 45, velocity_daily: 1.8, days_of_stock: 25, status: "active", image_url: null,
    created_at: "2024-08-20T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-005", store_id: DEMO_STORE.id, external_id: "SH-005",
    title: "Brew & Bean Ceramic Mug (12oz)", description: "Handcrafted stoneware mug with logo",
    category: "Merch", sku: "MG-CER-001", cost_price: 4.50, sell_price: 14.99, compare_at_price: null,
    inventory_qty: 312, velocity_daily: 5.4, days_of_stock: 57, status: "active", image_url: null,
    created_at: "2024-08-15T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-006", store_id: DEMO_STORE.id, external_id: "SH-006",
    title: "Burr Coffee Grinder Pro", description: "40-setting conical burr grinder, stainless steel",
    category: "Equipment", sku: "EQ-GR-001", cost_price: 38.00, sell_price: 79.99, compare_at_price: 89.99,
    inventory_qty: 23, velocity_daily: 0.9, days_of_stock: 25, status: "active", image_url: null,
    created_at: "2024-09-10T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-007", store_id: DEMO_STORE.id, external_id: "SH-007",
    title: "Jasmine Dragon Pearl Green Tea", description: "Hand-rolled pearl tea from Fujian province",
    category: "Tea", sku: "T-JAS-001", cost_price: 9.00, sell_price: 22.99, compare_at_price: null,
    inventory_qty: 156, velocity_daily: 2.7, days_of_stock: 57, status: "active", image_url: null,
    created_at: "2024-09-15T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-008", store_id: DEMO_STORE.id, external_id: "SH-008",
    title: "Cold Brew Starter Kit", description: "1.5L cold brew maker with stainless steel filter",
    category: "Equipment", sku: "EQ-CB-001", cost_price: 11.00, sell_price: 27.99, compare_at_price: 32.99,
    inventory_qty: 67, velocity_daily: 2.1, days_of_stock: 31, status: "active", image_url: null,
    created_at: "2024-10-01T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-009", store_id: DEMO_STORE.id, external_id: "SH-009",
    title: "Espresso Blend (Whole Bean 1lb)", description: "Medium-dark blend of Brazilian and Guatemalan beans",
    category: "Coffee Beans", sku: "EB-ESP-001", cost_price: 6.80, sell_price: 15.99, compare_at_price: null,
    inventory_qty: 401, velocity_daily: 11.3, days_of_stock: 35, status: "active", image_url: null,
    created_at: "2024-08-15T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-010", store_id: DEMO_STORE.id, external_id: "SH-010",
    title: "Decaf Swiss Water Process", description: "Chemical-free decaf from Sumatra, smooth and earthy",
    category: "Coffee Beans", sku: "EB-DEC-001", cost_price: 9.50, sell_price: 19.99, compare_at_price: null,
    inventory_qty: 8, velocity_daily: 2.4, days_of_stock: 3, status: "active", image_url: null,
    created_at: "2024-08-15T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-011", store_id: DEMO_STORE.id, external_id: "SH-011",
    title: "Organic Earl Grey Loose Leaf", description: "Bergamot-infused Ceylon black tea, USDA organic",
    category: "Tea", sku: "T-EG-001", cost_price: 5.50, sell_price: 13.99, compare_at_price: null,
    inventory_qty: 203, velocity_daily: 3.8, days_of_stock: 53, status: "active", image_url: null,
    created_at: "2024-09-20T10:00:00Z", updated_at: new Date().toISOString(),
  },
  {
    id: "prod-012", store_id: DEMO_STORE.id, external_id: "SH-012",
    title: "Travel Tumbler (16oz)", description: "Double-walled vacuum insulated, keeps hot 8hrs",
    category: "Merch", sku: "MG-TRV-001", cost_price: 8.00, sell_price: 24.99, compare_at_price: 29.99,
    inventory_qty: 0, velocity_daily: 4.1, days_of_stock: 0, status: "active", image_url: null,
    created_at: "2024-10-15T10:00:00Z", updated_at: new Date().toISOString(),
  },
];

// ─── Demo Customers ──────────────────────────────────────────

export const DEMO_CUSTOMERS: Customer[] = [
  { id: "cust-001", store_id: DEMO_STORE.id, external_id: "C001", email_hash: null, first_name: "Sarah", last_name: "Chen", first_order_date: "2024-09-02T14:00:00Z", last_order_date: "2026-03-18T09:00:00Z", lifetime_value: 847.50, order_count: 24, segment: "vip", city: "San Francisco", country: "US", created_at: "2024-09-02T14:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-002", store_id: DEMO_STORE.id, external_id: "C002", email_hash: null, first_name: "Marcus", last_name: "Williams", first_order_date: "2024-10-15T11:00:00Z", last_order_date: "2026-03-20T16:00:00Z", lifetime_value: 623.80, order_count: 18, segment: "vip", city: "Austin", country: "US", created_at: "2024-10-15T11:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-003", store_id: DEMO_STORE.id, external_id: "C003", email_hash: null, first_name: "Emily", last_name: "Nakamura", first_order_date: "2025-01-08T09:30:00Z", last_order_date: "2026-03-15T10:00:00Z", lifetime_value: 412.30, order_count: 12, segment: "active", city: "Portland", country: "US", created_at: "2025-01-08T09:30:00Z", updated_at: new Date().toISOString() },
  { id: "cust-004", store_id: DEMO_STORE.id, external_id: "C004", email_hash: null, first_name: "James", last_name: "O'Brien", first_order_date: "2025-02-14T15:00:00Z", last_order_date: "2026-03-19T08:00:00Z", lifetime_value: 289.70, order_count: 9, segment: "active", city: "Chicago", country: "US", created_at: "2025-02-14T15:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-005", store_id: DEMO_STORE.id, external_id: "C005", email_hash: null, first_name: "Priya", last_name: "Patel", first_order_date: "2025-03-22T12:00:00Z", last_order_date: "2026-03-10T14:00:00Z", lifetime_value: 198.50, order_count: 7, segment: "active", city: "New York", country: "US", created_at: "2025-03-22T12:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-006", store_id: DEMO_STORE.id, external_id: "C006", email_hash: null, first_name: "Daniel", last_name: "Kim", first_order_date: "2025-06-10T10:00:00Z", last_order_date: "2026-02-28T11:00:00Z", lifetime_value: 156.90, order_count: 5, segment: "active", city: "Seattle", country: "US", created_at: "2025-06-10T10:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-007", store_id: DEMO_STORE.id, external_id: "C007", email_hash: null, first_name: "Lisa", last_name: "Rodriguez", first_order_date: "2025-08-05T13:00:00Z", last_order_date: "2025-12-01T09:00:00Z", lifetime_value: 89.97, order_count: 3, segment: "at_risk", city: "Denver", country: "US", created_at: "2025-08-05T13:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-008", store_id: DEMO_STORE.id, external_id: "C008", email_hash: null, first_name: "Tom", last_name: "Anderson", first_order_date: "2025-09-18T14:30:00Z", last_order_date: "2025-10-02T16:00:00Z", lifetime_value: 34.98, order_count: 2, segment: "churned", city: "Nashville", country: "US", created_at: "2025-09-18T14:30:00Z", updated_at: new Date().toISOString() },
  { id: "cust-009", store_id: DEMO_STORE.id, external_id: "C009", email_hash: null, first_name: "Aisha", last_name: "Mohammed", first_order_date: "2026-02-20T11:00:00Z", last_order_date: "2026-03-17T15:00:00Z", lifetime_value: 64.97, order_count: 3, segment: "new", city: "Toronto", country: "CA", created_at: "2026-02-20T11:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-010", store_id: DEMO_STORE.id, external_id: "C010", email_hash: null, first_name: "Ben", last_name: "Carter", first_order_date: "2026-03-05T10:00:00Z", last_order_date: "2026-03-19T12:00:00Z", lifetime_value: 52.97, order_count: 2, segment: "new", city: "London", country: "GB", created_at: "2026-03-05T10:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-011", store_id: DEMO_STORE.id, external_id: "C011", email_hash: null, first_name: "Megan", last_name: "Foster", first_order_date: "2025-04-12T08:00:00Z", last_order_date: "2026-01-15T10:00:00Z", lifetime_value: 245.80, order_count: 8, segment: "at_risk", city: "Boston", country: "US", created_at: "2025-04-12T08:00:00Z", updated_at: new Date().toISOString() },
  { id: "cust-012", store_id: DEMO_STORE.id, external_id: "C012", email_hash: null, first_name: "Oliver", last_name: "Wright", first_order_date: "2026-03-14T09:00:00Z", last_order_date: "2026-03-14T09:00:00Z", lifetime_value: 18.99, order_count: 1, segment: "new", city: "Melbourne", country: "AU", created_at: "2026-03-14T09:00:00Z", updated_at: new Date().toISOString() },
];

// ─── Demo KPIs ───────────────────────────────────────────────

export const DEMO_KPIS = {
  totalRevenue: 47832,
  revenueChange: 18,
  totalOrders: 1247,
  ordersChange: 12,
  avgOrderValue: 38.36,
  aovChange: 5,
  totalCustomers: 892,
  customersChange: 22,
};

// ─── Demo Revenue Trend (30 days) ────────────────────────────

export function getDemoRevenueTrend(): Array<{ date: string; revenue: number; orders: number }> {
  const data = [];
  const baseRevenue = 1400;
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const dayOfWeek = date.getDay();
    // Higher on weekdays, dip on Mon/Tue
    const weekdayMultiplier = dayOfWeek === 0 ? 0.75 : dayOfWeek === 6 ? 0.85 : dayOfWeek === 1 ? 0.9 : 1.0 + (dayOfWeek - 2) * 0.05;
    // Upward trend
    const trendMultiplier = 1 + (30 - i) * 0.008;
    const noise = 0.85 + Math.random() * 0.3;
    const revenue = Math.round(baseRevenue * weekdayMultiplier * trendMultiplier * noise);
    const orders = Math.round(revenue / (35 + Math.random() * 8));

    data.push({
      date: date.toISOString().slice(0, 10),
      revenue,
      orders,
    });
  }
  return data;
}

// ─── Demo Insights ───────────────────────────────────────────

export const DEMO_INSIGHTS: Insight[] = [
  {
    id: "ins-001", store_id: DEMO_STORE.id,
    title: "Revenue up 18% this month",
    body: "Your monthly revenue has increased from $40.5K to $47.8K compared to last month, driven primarily by the Ethiopian Yirgacheffe and Espresso Blend.",
    severity: "positive", metric_value: "+$7,332", category: "revenue",
    generated_at: new Date(Date.now() - 3600000).toISOString(), created_at: new Date(Date.now() - 3600000).toISOString(), is_read: false,
  },
  {
    id: "ins-002", store_id: DEMO_STORE.id,
    title: "Low stock: Decaf Swiss Water Process",
    body: "Only 8 units remaining with a daily velocity of 2.4 units. At current sell rate, you have approximately 3 days of stock left. Consider reordering immediately.",
    severity: "critical", metric_value: "3 days left", category: "inventory",
    generated_at: new Date(Date.now() - 7200000).toISOString(), created_at: new Date(Date.now() - 7200000).toISOString(), is_read: false,
  },
  {
    id: "ins-003", store_id: DEMO_STORE.id,
    title: "Travel Tumbler is out of stock",
    body: "The Travel Tumbler (16oz) has 0 inventory but a daily velocity of 4.1 units. You're missing approximately $102/day in potential revenue.",
    severity: "warning", metric_value: "$102/day lost", category: "inventory",
    generated_at: new Date(Date.now() - 14400000).toISOString(), created_at: new Date(Date.now() - 14400000).toISOString(), is_read: false,
  },
  {
    id: "ins-004", store_id: DEMO_STORE.id,
    title: "New customer acquisition trending up",
    body: "22% more new customers this month compared to last month. Toronto and London are emerging as new growth markets.",
    severity: "positive", metric_value: "+22%", category: "customer",
    generated_at: new Date(Date.now() - 28800000).toISOString(), created_at: new Date(Date.now() - 28800000).toISOString(), is_read: true,
  },
  {
    id: "ins-005", store_id: DEMO_STORE.id,
    title: "2 at-risk customers need attention",
    body: "Lisa Rodriguez (last order Dec 2025) and Megan Foster (last order Jan 2026) haven't ordered in over 60 days. Consider a win-back campaign.",
    severity: "warning", metric_value: "2 customers", category: "customer",
    generated_at: new Date(Date.now() - 43200000).toISOString(), created_at: new Date(Date.now() - 43200000).toISOString(), is_read: false,
  },
];

// ─── Demo Customer Segments ──────────────────────────────────

export const DEMO_SEGMENTS = {
  new: 142,
  active: 423,
  at_risk: 187,
  churned: 98,
  vip: 42,
  total: 892,
};

// ─── Demo AI Responses ───────────────────────────────────────

const AI_RESPONSES: Record<string, {
  sql: string;
  interpretation: string;
  chart_type: "bar" | "line" | "table" | "number" | "pie";
  data: Record<string, unknown>[];
  chart_config: Record<string, string>;
}> = {
  default_top_products: {
    sql: `SELECT p.title, SUM(oi.quantity) as units_sold, SUM(oi.total_price) as revenue\nFROM order_items oi\nJOIN products p ON oi.product_id = p.id\nJOIN orders o ON oi.order_id = o.id\nWHERE o.created_at >= NOW() - INTERVAL '30 days'\n  AND o.status IN ('paid', 'fulfilled')\nGROUP BY p.title\nORDER BY revenue DESC\nLIMIT 5;`,
    interpretation: "Here are your top 5 products by revenue in the last 30 days. The Espresso Blend leads with $5,420 in revenue from 339 units sold, followed closely by Ethiopian Yirgacheffe at $4,870. Your Matcha Ceremonial Grade has a high AOV of $29.99 making it your 3rd highest revenue generator despite lower volume.",
    chart_type: "bar",
    data: [
      { title: "Espresso Blend", units_sold: 339, revenue: 5420 },
      { title: "Ethiopian Yirgacheffe", units_sold: 256, revenue: 4870 },
      { title: "Matcha Ceremonial Grade", units_sold: 148, revenue: 4439 },
      { title: "Colombian Supremo", units_sold: 201, revenue: 3414 },
      { title: "Travel Tumbler", units_sold: 112, revenue: 2799 },
    ],
    chart_config: { x_axis: "title", y_axis: "revenue", label: "Revenue ($)" },
  },
  default_comparison: {
    sql: `SELECT\n  CASE WHEN o.created_at >= NOW() - INTERVAL '7 days' THEN 'This Week'\n       ELSE 'Last Week' END as period,\n  COUNT(*) as orders,\n  SUM(o.total) as revenue,\n  ROUND(AVG(o.total), 2) as avg_order_value\nFROM orders o\nWHERE o.created_at >= NOW() - INTERVAL '14 days'\n  AND o.status IN ('paid', 'fulfilled')\nGROUP BY period;`,
    interpretation: "This week is outperforming last week across all metrics. Revenue is up 14% ($11,240 vs $9,860), orders increased by 9% (293 vs 269), and your average order value grew from $36.65 to $38.36 — customers are spending more per order, likely due to the bundle promotion you're running.",
    chart_type: "bar",
    data: [
      { period: "Last Week", orders: 269, revenue: 9860, avg_order_value: 36.65 },
      { period: "This Week", orders: 293, revenue: 11240, avg_order_value: 38.36 },
    ],
    chart_config: { x_axis: "period", y_axis: "revenue", label: "Revenue ($)" },
  },
  default_churned: {
    sql: `SELECT\n  c.first_name || ' ' || c.last_name as customer,\n  c.last_order_date,\n  c.lifetime_value,\n  c.order_count,\n  DATE_PART('day', NOW() - c.last_order_date) as days_inactive\nFROM customers c\nWHERE c.last_order_date < NOW() - INTERVAL '90 days'\n  AND c.segment IN ('at_risk', 'churned')\nORDER BY c.lifetime_value DESC\nLIMIT 10;`,
    interpretation: "You have 3 notable customers who haven't ordered in over 90 days. Megan Foster is the highest-value at-risk customer with $245.80 lifetime value across 8 orders — she last ordered in January. Lisa Rodriguez ($89.97 LTV) and Tom Anderson ($34.98 LTV) are also inactive. I'd recommend a personalized win-back email for Megan given her high LTV.",
    chart_type: "table",
    data: [
      { customer: "Megan Foster", last_order_date: "2026-01-15", lifetime_value: 245.80, order_count: 8, days_inactive: 65 },
      { customer: "Lisa Rodriguez", last_order_date: "2025-12-01", lifetime_value: 89.97, order_count: 3, days_inactive: 110 },
      { customer: "Tom Anderson", last_order_date: "2025-10-02", lifetime_value: 34.98, order_count: 2, days_inactive: 170 },
    ],
    chart_config: {},
  },
  default_revenue_trend: {
    sql: `SELECT\n  DATE(o.created_at) as date,\n  SUM(o.total) as revenue\nFROM orders o\nWHERE o.created_at >= NOW() - INTERVAL '30 days'\n  AND o.status IN ('paid', 'fulfilled')\nGROUP BY DATE(o.created_at)\nORDER BY date;`,
    interpretation: "Your daily revenue over the last 30 days shows a healthy upward trend, averaging $1,594/day. Weekdays (especially Wed-Fri) tend to be your strongest days, while Sundays typically dip to around $1,050. The overall trend line suggests approximately 8% month-over-month growth.",
    chart_type: "line",
    data: getDemoRevenueTrend().map((d) => ({ date: d.date, revenue: d.revenue })),
    chart_config: { x_axis: "date", y_axis: "revenue", label: "Daily Revenue ($)" },
  },
};

export function getDemoAIResponse(question: string) {
  const q = question.toLowerCase();

  if (q.includes("top") && q.includes("product")) return AI_RESPONSES.default_top_products;
  if (q.includes("compare") || q.includes("this week") || q.includes("last week")) return AI_RESPONSES.default_comparison;
  if (q.includes("churn") || q.includes("haven't ordered") || q.includes("90 day") || q.includes("inactive")) return AI_RESPONSES.default_churned;
  if (q.includes("revenue") && (q.includes("day") || q.includes("trend") || q.includes("30"))) return AI_RESPONSES.default_revenue_trend;

  // Default: return top products
  return AI_RESPONSES.default_top_products;
}

// ─── Demo Funnel Data ────────────────────────────────────────

export const DEMO_FUNNEL = {
  stages: [
    { name: "pending", count: 1247, dropoff_pct: 0, conversion_pct: 100 },
    { name: "paid", count: 1134, dropoff_pct: 9, conversion_pct: 91 },
    { name: "fulfilled", count: 1089, dropoff_pct: 4, conversion_pct: 87 },
  ],
  summary: { total: 1247, cancelled: 68, refunded: 45 },
  period_days: 30,
};

// ─── Demo Revenue Breakdown ──────────────────────────────────

export const DEMO_REVENUE_BREAKDOWN = {
  category: {
    segments: [
      { label: "Coffee Beans", value: 24820, pct: 52 },
      { label: "Tea", value: 8940, pct: 19 },
      { label: "Equipment", value: 7650, pct: 16 },
      { label: "Merch", value: 6422, pct: 13 },
    ],
    type: "category",
    period_days: 30,
  },
  channel: {
    segments: [
      { label: "Direct", value: 22340, pct: 47 },
      { label: "Google", value: 11960, pct: 25 },
      { label: "Instagram", value: 7650, pct: 16 },
      { label: "Email", value: 3830, pct: 8 },
      { label: "Referral", value: 2052, pct: 4 },
    ],
    type: "channel",
    period_days: 30,
  },
  hour: {
    segments: Array.from({ length: 24 }, (_, h) => {
      const peak = h >= 8 && h <= 11 ? 2.5 : h >= 14 && h <= 17 ? 2.0 : h >= 19 && h <= 21 ? 1.8 : 0.5;
      const value = Math.round(1992 * peak * (0.8 + Math.random() * 0.4) / 2.5);
      return { label: `${h}:00`, value, pct: Math.round((value / 47832) * 100) };
    }),
    type: "hour",
    period_days: 30,
  },
};

// ─── Demo LTV Distribution ──────────────────────────────────

export const DEMO_LTV = {
  buckets: [
    { range: "$0-50", min: 0, max: 50, count: 298, pct: 33 },
    { range: "$50-100", min: 50, max: 100, count: 214, pct: 24 },
    { range: "$100-250", min: 100, max: 250, count: 198, pct: 22 },
    { range: "$250-500", min: 250, max: 500, count: 112, pct: 13 },
    { range: "$500-1K", min: 500, max: 1000, count: 58, pct: 7 },
    { range: "$1K+", min: 1000, max: 99999, count: 12, pct: 1 },
  ],
  stats: { median: 89, mean: 142, p75: 218, p90: 412, total_customers: 892 },
};
