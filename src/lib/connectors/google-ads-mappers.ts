import type { GoogleCampaignMetric } from "./google-ads";

/**
 * Map a Google Ads campaign metric to the ad_spend table schema.
 */
export function mapGoogleCampaignMetric(
  metric: GoogleCampaignMetric,
  storeId: string
) {
  const spend = parseInt(metric.cost_micros, 10) / 1_000_000; // Convert micros to dollars

  return {
    store_id: storeId,
    campaign_id: metric.campaign_id,
    platform: "google",
    campaign_name: metric.campaign_name,
    spend: Math.round(spend * 100) / 100,
    impressions: parseInt(metric.impressions, 10) || 0,
    clicks: parseInt(metric.clicks, 10) || 0,
    conversions: Math.round(parseFloat(metric.conversions)) || 0,
    revenue_attributed: parseFloat(metric.conversions_value) || 0,
    date: metric.date,
  };
}
