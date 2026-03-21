/**
 * Map TikTok Ads insights to ad_spend table format.
 */

import type { TikTokInsight } from "./tiktok-ads";

export function mapTikTokInsight(insight: TikTokInsight, storeId: string) {
  return {
    store_id: storeId,
    campaign_id: insight.dimensions.campaign_id,
    platform: "tiktok" as const,
    campaign_name: insight.metrics.campaign_name ?? null,
    spend: parseFloat(insight.metrics.spend ?? "0"),
    impressions: parseInt(insight.metrics.impressions ?? "0", 10),
    clicks: parseInt(insight.metrics.clicks ?? "0", 10),
    conversions: parseInt(insight.metrics.conversion ?? "0", 10),
    revenue_attributed: 0, // TikTok doesn't provide direct revenue attribution by default
    date: insight.dimensions.stat_time_day,
  };
}
