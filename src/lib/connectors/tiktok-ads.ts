/**
 * TikTok Marketing API client for ad spend tracking.
 * Uses v1.3 of the Marketing API.
 */

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";
const MIN_REQUEST_INTERVAL = 200;
let lastReqTime = 0;

async function rateLimit() {
  const elapsed = Date.now() - lastReqTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastReqTime = Date.now();
}

export interface TikTokAdsConfig {
  accessToken: string;
  advertiserId: string;
}

export class TikTokAdsClient {
  private accessToken: string;
  private advertiserId: string;

  constructor(config: TikTokAdsConfig) {
    this.accessToken = config.accessToken;
    this.advertiserId = config.advertiserId;
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    await rateLimit();

    const url = new URL(`${TIKTOK_API_BASE}${endpoint}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      headers: {
        "Access-Token": this.accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`TikTok API error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`TikTok API error: ${data.message}`);
    }

    return data.data;
  }

  async *fetchCampaignInsights(
    dateRange: { start: string; end: string }
  ): AsyncGenerator<TikTokInsight[], void, unknown> {
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const data = await this.request<{
        list: TikTokInsight[];
        page_info: { total_number: number; page: number; page_size: number };
      }>("/report/integrated/get/", {
        advertiser_id: this.advertiserId,
        report_type: "BASIC",
        dimensions: JSON.stringify(["campaign_id", "stat_time_day"]),
        metrics: JSON.stringify([
          "spend",
          "impressions",
          "clicks",
          "conversion",
          "total_complete_payment_rate",
        ]),
        data_level: "AUCTION_CAMPAIGN",
        start_date: dateRange.start,
        end_date: dateRange.end,
        page: String(page),
        page_size: String(pageSize),
      });

      const insights = data.list ?? [];
      if (insights.length > 0) {
        yield insights;
      }

      hasMore = insights.length === pageSize;
      page++;
    }
  }

  async getAdvertiserInfo(): Promise<{ name: string; id: string }> {
    const data = await this.request<{
      list: Array<{ advertiser_id: string; advertiser_name: string }>;
    }>("/advertiser/info/", {
      advertiser_ids: JSON.stringify([this.advertiserId]),
    });

    const info = data.list?.[0];
    return {
      id: info?.advertiser_id ?? this.advertiserId,
      name: info?.advertiser_name ?? "TikTok Advertiser",
    };
  }
}

// ─── Types ────────────────────────────────────────────────────

export interface TikTokInsight {
  dimensions: {
    campaign_id: string;
    stat_time_day: string;
  };
  metrics: {
    spend: string;
    impressions: string;
    clicks: string;
    conversion: string;
    campaign_name?: string;
  };
}
