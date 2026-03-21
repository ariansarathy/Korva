/**
 * Google Analytics 4 (GA4) Data API client.
 * Uses OAuth2 for authentication and the GA4 Data API for reports.
 */

interface GA4ClientConfig {
  accessToken: string;
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
}

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

interface GA4Property {
  name: string;
  displayName: string;
  propertyType: string;
}

export class GA4Client {
  private accessToken: string;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private tokenExpiresAt = 0;

  constructor(config: GA4ClientConfig) {
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId ?? process.env.GA4_CLIENT_ID ?? "";
    this.clientSecret = config.clientSecret ?? process.env.GA4_CLIENT_SECRET ?? "";
  }

  private async ensureToken(): Promise<string> {
    if (Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(`GA4 token refresh failed: ${res.status}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    return this.accessToken;
  }

  getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * List GA4 properties accessible to the authenticated user.
   */
  async listProperties(): Promise<GA4Property[]> {
    const token = await this.ensureToken();

    const res = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(`GA4 list properties failed: ${res.status}`);
    }

    const data = await res.json();
    const properties: GA4Property[] = [];

    for (const account of data.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        properties.push({
          name: prop.property,
          displayName: prop.displayName,
          propertyType: prop.propertyType ?? "PROPERTY_TYPE_ORDINARY",
        });
      }
    }

    return properties;
  }

  /**
   * Fetch traffic source data from GA4 Data API.
   * Returns session source, medium, campaign with session/user/conversion/revenue metrics.
   */
  async fetchTrafficSources(
    propertyId: string,
    dateRange: { start: string; end: string }
  ): Promise<GA4TrafficRow[]> {
    const token = await this.ensureToken();

    // Property ID should be in format "properties/123456"
    const propPath = propertyId.startsWith("properties/")
      ? propertyId
      : `properties/${propertyId}`;

    const body = {
      dateRanges: [
        {
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
      ],
      dimensions: [
        { name: "sessionSource" },
        { name: "sessionMedium" },
        { name: "sessionCampaignName" },
        { name: "date" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "conversions" },
        { name: "totalRevenue" },
      ],
      limit: 10000,
    };

    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${propPath}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GA4 report failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const rows: GA4TrafficRow[] = [];

    for (const row of data.rows ?? []) {
      const dims = row.dimensionValues ?? [];
      const mets = row.metricValues ?? [];

      // Format date from YYYYMMDD to YYYY-MM-DD
      const rawDate = dims[3]?.value ?? "";
      const formattedDate = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate;

      rows.push({
        source: dims[0]?.value ?? "(direct)",
        medium: dims[1]?.value ?? "(none)",
        campaign: dims[2]?.value ?? "(not set)",
        date: formattedDate,
        sessions: parseInt(mets[0]?.value ?? "0", 10),
        users: parseInt(mets[1]?.value ?? "0", 10),
        conversions: parseInt(mets[2]?.value ?? "0", 10),
        revenue: parseFloat(mets[3]?.value ?? "0"),
      });
    }

    return rows;
  }
}
