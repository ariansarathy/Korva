/**
 * Google Ads REST API v16 client.
 * Fetches campaign metrics for ad spend tracking.
 */

export interface GoogleCampaignMetric {
  campaign_id: string;
  campaign_name: string;
  cost_micros: string;
  impressions: string;
  clicks: string;
  conversions: string;
  conversions_value: string;
  date: string;
}

export interface GoogleAdsConfig {
  accessToken: string;
  refreshToken: string;
  customerId: string; // e.g. "1234567890" (no hyphens)
  developerToken: string;
}

const API_BASE = "https://googleads.googleapis.com/v16";

export class GoogleAdsClient {
  private accessToken: string;
  private refreshToken: string;
  private customerId: string;
  private developerToken: string;

  constructor(config: GoogleAdsConfig) {
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.customerId = config.customerId;
    this.developerToken = config.developerToken;
  }

  private async request<T>(query: string): Promise<T> {
    const url = `${API_BASE}/customers/${this.customerId}/googleAds:searchStream`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        "developer-token": this.developerToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      // Attempt token refresh on 401
      if (response.status === 401 && this.refreshToken) {
        await this.refreshAccessToken();
        // Retry once
        const retryResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
            "developer-token": this.developerToken,
          },
          body: JSON.stringify({ query }),
        });
        if (!retryResponse.ok) {
          throw new Error(`Google Ads API error: ${retryResponse.statusText}`);
        }
        return retryResponse.json();
      }

      const error = await response.text();
      throw new Error(`Google Ads API error: ${error}`);
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<void> {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth credentials");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Google access token");
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  /**
   * Fetch campaign metrics for a date range.
   * Returns results via async generator.
   */
  async *fetchCampaignMetrics(
    dateRange: { since: string; until: string }
  ): AsyncGenerator<GoogleCampaignMetric[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value,
        segments.date
      FROM campaign
      WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        AND campaign.status = 'ENABLED'
      ORDER BY segments.date DESC
    `;

    const results = await this.request<Array<{
      results: Array<{
        campaign: { id: string; name: string };
        metrics: {
          costMicros: string;
          impressions: string;
          clicks: string;
          conversions: string;
          conversionsValue: string;
        };
        segments: { date: string };
      }>;
    }>>(query);

    // searchStream returns array of batches
    for (const batch of results) {
      const metrics: GoogleCampaignMetric[] = batch.results.map((row) => ({
        campaign_id: row.campaign.id,
        campaign_name: row.campaign.name,
        cost_micros: row.metrics.costMicros,
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
        conversions: row.metrics.conversions,
        conversions_value: row.metrics.conversionsValue,
        date: row.segments.date,
      }));

      if (metrics.length > 0) {
        yield metrics;
      }
    }
  }

  /**
   * Get the current access token (for storage after refresh).
   */
  getAccessToken(): string {
    return this.accessToken;
  }
}
