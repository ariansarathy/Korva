/**
 * Meta Marketing API v19.0 client.
 * Fetches campaign insights for ad spend tracking.
 */

export interface MetaCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  purchase_roas: string;
  date_start: string;
  date_stop: string;
}

export interface MetaAdsConfig {
  accessToken: string;
  accountId: string; // e.g. "act_123456789"
}

const API_BASE = "https://graph.facebook.com/v19.0";
const RATE_LIMIT_DELAY_MS = 18000; // ~200 calls/hour = 1 call per 18s

export class MetaAdsClient {
  private accessToken: string;
  private accountId: string;
  private lastRequestTime = 0;

  constructor(config: MetaAdsConfig) {
    this.accessToken = config.accessToken;
    this.accountId = config.accountId;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_DELAY_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, RATE_LIMIT_DELAY_MS - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${API_BASE}/${endpoint}`);
    url.searchParams.set("access_token", this.accessToken);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Meta API error: ${error.error?.message ?? response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Fetch campaign-level insights for a date range.
   * Uses async generator for pagination via cursor-based paging.
   */
  async *fetchCampaignInsights(
    dateRange: { since: string; until: string }
  ): AsyncGenerator<MetaCampaignInsight[]> {
    let nextUrl: string | null = null;
    let isFirstRequest = true;

    while (isFirstRequest || nextUrl) {
      isFirstRequest = false;

      let data: {
        data: MetaCampaignInsight[];
        paging?: { next?: string };
      };

      if (nextUrl) {
        await this.rateLimit();
        const response = await fetch(nextUrl);
        if (!response.ok) throw new Error("Meta API pagination failed");
        data = await response.json();
      } else {
        data = await this.request<{
          data: MetaCampaignInsight[];
          paging?: { next?: string };
        }>(`${this.accountId}/insights`, {
          level: "campaign",
          fields: "campaign_id,campaign_name,spend,impressions,clicks,conversions,purchase_roas",
          time_range: JSON.stringify({
            since: dateRange.since,
            until: dateRange.until,
          }),
          time_increment: "1",
          limit: "100",
        });
      }

      if (data.data.length > 0) {
        yield data.data;
      }

      nextUrl = data.paging?.next ?? null;
    }
  }

  /**
   * Verify the access token is valid by checking account info.
   */
  async verifyAccess(): Promise<{ name: string; id: string }> {
    return this.request<{ name: string; id: string }>(this.accountId, {
      fields: "name,id",
    });
  }
}
