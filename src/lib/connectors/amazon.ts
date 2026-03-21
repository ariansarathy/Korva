/**
 * Amazon Selling Partner API (SP-API) client.
 * Uses Login with Amazon (LWA) for OAuth token management.
 * Handles per-endpoint rate limiting and pagination.
 */

const SP_API_BASE = "https://sellingpartnerapi-na.amazon.com";
const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";

// Rate limit: conservative defaults per endpoint
const MIN_REQUEST_INTERVAL_MS = 500;
let lastRequestTime = 0;

async function rateLimitDelay() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export interface AmazonSPConfig {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  marketplaceId?: string;
}

export class AmazonSPClient {
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private marketplaceId: string;

  constructor(config: AmazonSPConfig) {
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.marketplaceId = config.marketplaceId ?? "ATVPDKIKX0DER"; // US marketplace
  }

  // ─── Token management ────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const res = await fetch(LWA_TOKEN_URL, {
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
      throw new AmazonApiError("Failed to refresh LWA token", res.status);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return this.accessToken!;
  }

  // ─── API request ────────────────────────────────────────────

  private async request<T>(
    path: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    await rateLimitDelay();
    const token = await this.getAccessToken();

    const url = new URL(path, SP_API_BASE);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      headers: {
        "x-amz-access-token": token,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AmazonApiError(
        `Amazon SP-API error ${res.status}: ${res.statusText}`,
        res.status,
        body
      );
    }

    return res.json();
  }

  // ─── Resource fetchers ───────────────────────────────────────

  async *fetchProducts(
    params: Record<string, string> = {}
  ): AsyncGenerator<AmazonProduct[], void, unknown> {
    let nextToken: string | undefined;

    do {
      const queryParams: Record<string, string> = {
        marketplaceIds: this.marketplaceId,
        ...params,
      };
      if (nextToken) queryParams.pageToken = nextToken;

      const data = await this.request<{
        items: AmazonProduct[];
        pagination?: { nextToken?: string };
      }>("/catalog/2022-04-01/items", queryParams);

      if (data.items?.length > 0) {
        yield data.items;
      }

      nextToken = data.pagination?.nextToken;
    } while (nextToken);
  }

  async *fetchOrders(
    params: Record<string, string> = {}
  ): AsyncGenerator<AmazonOrder[], void, unknown> {
    let nextToken: string | undefined;

    do {
      const queryParams: Record<string, string> = {
        MarketplaceIds: this.marketplaceId,
        ...params,
      };
      if (nextToken) queryParams.NextToken = nextToken;

      const data = await this.request<{
        payload: { Orders: AmazonOrder[]; NextToken?: string };
      }>("/orders/v0/orders", queryParams);

      const orders = data.payload?.Orders ?? [];
      if (orders.length > 0) {
        yield orders;
      }

      nextToken = data.payload?.NextToken;
    } while (nextToken);
  }

  async getOrderItems(orderId: string): Promise<AmazonOrderItem[]> {
    const data = await this.request<{
      payload: { OrderItems: AmazonOrderItem[] };
    }>(`/orders/v0/orders/${orderId}/orderItems`);
    return data.payload?.OrderItems ?? [];
  }

  async getMarketplaceInfo(): Promise<{ marketplaceId: string; name: string }> {
    return {
      marketplaceId: this.marketplaceId,
      name: "Amazon US",
    };
  }
}

// ─── Error class ─────────────────────────────────────────────

export class AmazonApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = "AmazonApiError";
  }
}

// ─── Amazon SP-API types ─────────────────────────────────────

export interface AmazonProduct {
  asin: string;
  summaries?: Array<{
    marketplaceId: string;
    itemName?: string;
    productType?: string;
  }>;
  images?: Array<{
    marketplaceId: string;
    images: Array<{ link: string; variant: string }>;
  }>;
  salesRanks?: Array<{
    marketplaceId: string;
    classificationRanks: Array<{ rank: number }>;
  }>;
}

export interface AmazonOrder {
  AmazonOrderId: string;
  OrderStatus: string;
  OrderTotal?: { Amount: string; CurrencyCode: string };
  PurchaseDate: string;
  LastUpdateDate: string;
  BuyerInfo?: { BuyerEmail?: string };
  NumberOfItemsShipped: number;
  NumberOfItemsUnshipped: number;
  ShippingAddress?: {
    City?: string;
    CountryCode?: string;
  };
}

export interface AmazonOrderItem {
  OrderItemId: string;
  ASIN: string;
  Title: string;
  QuantityOrdered: number;
  ItemPrice?: { Amount: string };
  PromotionDiscount?: { Amount: string };
}
