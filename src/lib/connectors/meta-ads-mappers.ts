import type { MetaCampaignInsight } from "./meta-ads";

/**
 * Map a Meta campaign insight to the ad_spend table schema.
 */
export function mapMetaCampaignInsight(
  insight: MetaCampaignInsight,
  storeId: string
) {
  return {
    store_id: storeId,
    campaign_id: insight.campaign_id,
    platform: "meta",
    campaign_name: insight.campaign_name,
    spend: parseFloat(insight.spend) || 0,
    impressions: parseInt(insight.impressions, 10) || 0,
    clicks: parseInt(insight.clicks, 10) || 0,
    conversions: parseInt(insight.conversions, 10) || 0,
    revenue_attributed: parseFloat(insight.purchase_roas) * (parseFloat(insight.spend) || 0) || 0,
    date: insight.date_start,
  };
}
