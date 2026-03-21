/**
 * Maps GA4 traffic source data to the `traffic_sources` table schema.
 */

interface GA4TrafficRow {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  users: number;
  conversions: number;
  revenue: number;
  date: string;
}

export function mapGA4TrafficSource(
  row: GA4TrafficRow,
  storeId: string
): {
  store_id: string;
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  users: number;
  conversions: number;
  revenue: number;
  date: string;
} {
  return {
    store_id: storeId,
    source: row.source || "(direct)",
    medium: row.medium || "(none)",
    campaign: row.campaign || "(not set)",
    sessions: row.sessions,
    users: row.users,
    conversions: row.conversions,
    revenue: Math.round(row.revenue * 100) / 100,
    date: row.date,
  };
}
