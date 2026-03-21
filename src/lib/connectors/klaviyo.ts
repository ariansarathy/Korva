/**
 * Klaviyo API client for email marketing integration.
 * Uses API key authentication with revision 2024-02-15.
 */

const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const API_REVISION = "2024-02-15";

export interface KlaviyoConfig {
  apiKey: string;
}

export class KlaviyoClient {
  private apiKey: string;

  constructor(config: KlaviyoConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${KLAVIYO_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Klaviyo-API-Key ${this.apiKey}`,
        "Content-Type": "application/json",
        revision: API_REVISION,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Klaviyo API error ${res.status}: ${body}`);
    }

    return res.json();
  }

  /**
   * Verify the API key is valid by fetching account info.
   */
  async verify(): Promise<boolean> {
    try {
      await this.request("/accounts/");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get or create a list by name.
   */
  async createOrUpdateList(name: string): Promise<string> {
    // Check if list exists
    const existing = await this.request<{
      data: Array<{ id: string; attributes: { name: string } }>;
    }>("/lists/");

    const found = existing.data.find(
      (l) => l.attributes.name.toLowerCase() === name.toLowerCase()
    );
    if (found) return found.id;

    // Create new list
    const created = await this.request<{
      data: { id: string };
    }>("/lists/", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "list",
          attributes: { name },
        },
      }),
    });

    return created.data.id;
  }

  /**
   * Add profiles to a list.
   */
  async addProfilesToList(
    listId: string,
    profiles: Array<{ email: string; properties?: Record<string, unknown> }>
  ): Promise<void> {
    // Create/update profiles first
    const profileIds: string[] = [];
    for (const profile of profiles) {
      try {
        const result = await this.request<{
          data: { id: string };
        }>("/profiles/", {
          method: "POST",
          body: JSON.stringify({
            data: {
              type: "profile",
              attributes: {
                email: profile.email,
                properties: profile.properties ?? {},
              },
            },
          }),
        });
        profileIds.push(result.data.id);
      } catch {
        // Profile might already exist — try to find by email
        try {
          const found = await this.request<{
            data: Array<{ id: string }>;
          }>(`/profiles/?filter=equals(email,"${profile.email}")`);
          if (found.data[0]) {
            profileIds.push(found.data[0].id);
          }
        } catch {
          // Skip this profile
        }
      }
    }

    if (profileIds.length === 0) return;

    // Add profiles to list
    await this.request(`/lists/${listId}/relationships/profiles/`, {
      method: "POST",
      body: JSON.stringify({
        data: profileIds.map((id) => ({ type: "profile", id })),
      }),
    });
  }

  /**
   * Get metrics (for analytics).
   */
  async getMetrics(): Promise<
    Array<{ id: string; name: string; integration: string }>
  > {
    const data = await this.request<{
      data: Array<{
        id: string;
        attributes: { name: string; integration: { name: string } };
      }>;
    }>("/metrics/");

    return data.data.map((m) => ({
      id: m.id,
      name: m.attributes.name,
      integration: m.attributes.integration?.name ?? "Unknown",
    }));
  }
}
