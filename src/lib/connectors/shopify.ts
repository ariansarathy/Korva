/**
 * Shopify REST Admin API client with rate limiting and pagination.
 * Uses the 2024-01 API version.
 */

const API_VERSION = "2024-01";
const MAX_REQUESTS_PER_SECOND = 2; // Conservative limit (Shopify allows ~4/s for basic plans)

// ─── Rate limiter ────────────────────────────────────────────────

let lastRequestTime = 0;

async function rateLimitDelay() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const minInterval = 1000 / MAX_REQUESTS_PER_SECOND;
  if (elapsed < minInterval) {
    await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── API Client ──────────────────────────────────────────────────

export interface ShopifyClientConfig {
  shop: string; // e.g. "mystore.myshopify.com"
  accessToken: string;
}

export class ShopifyClient {
  private shop: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(config: ShopifyClientConfig) {
    this.shop = config.shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.accessToken = config.accessToken;
    this.baseUrl = `https://${this.shop}/admin/api/${API_VERSION}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; linkHeader: string | null }> {
    await rateLimitDelay();

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": this.accessToken,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new ShopifyApiError(
        `Shopify API error ${res.status}: ${res.statusText}`,
        res.status,
        errorBody
      );
    }

    const data = await res.json();
    const linkHeader = res.headers.get("link");

    return { data, linkHeader };
  }

  // ─── Paginated fetcher ───────────────────────────────────────

  async *paginate<T>(
    endpoint: string,
    resourceKey: string,
    params: Record<string, string> = {}
  ): AsyncGenerator<T[], void, unknown> {
    const query = new URLSearchParams({ limit: "250", ...params });
    let url = `${this.baseUrl}${endpoint}?${query.toString()}`;

    while (url) {
      const { data, linkHeader } = await this.request<Record<string, T[]>>(url);
      const items = data[resourceKey] ?? [];

      if (items.length > 0) {
        yield items;
      }

      // Parse Link header for next page
      url = "";
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          url = nextMatch[1];
        }
      }
    }
  }

  // ─── Resource fetchers ──────────────────────────────────────

  async *fetchProducts(params: Record<string, string> = {}) {
    yield* this.paginate<ShopifyProduct>("/products.json", "products", {
      status: "active",
      ...params,
    });
  }

  async *fetchOrders(params: Record<string, string> = {}) {
    yield* this.paginate<ShopifyOrder>("/orders.json", "orders", {
      status: "any",
      ...params,
    });
  }

  async *fetchCustomers(params: Record<string, string> = {}) {
    yield* this.paginate<ShopifyCustomer>("/customers.json", "customers", params);
  }

  async getShopInfo(): Promise<ShopifyShop> {
    const { data } = await this.request<{ shop: ShopifyShop }>("/shop.json");
    return data.shop;
  }

  async getOrderCount(params: Record<string, string> = {}): Promise<number> {
    const query = new URLSearchParams({ status: "any", ...params });
    const { data } = await this.request<{ count: number }>(
      `/orders/count.json?${query.toString()}`
    );
    return data.count;
  }

  async getProductCount(): Promise<number> {
    const { data } = await this.request<{ count: number }>("/products/count.json");
    return data.count;
  }

  async getCustomerCount(): Promise<number> {
    const { data } = await this.request<{ count: number }>("/customers/count.json");
    return data.count;
  }

  // ─── Webhook management ────────────────────────────────────

  async createWebhook(topic: string, address: string): Promise<ShopifyWebhook> {
    const { data } = await this.request<{ webhook: ShopifyWebhook }>("/webhooks.json", {
      method: "POST",
      body: JSON.stringify({
        webhook: { topic, address, format: "json" },
      }),
    });
    return data.webhook;
  }

  async listWebhooks(): Promise<ShopifyWebhook[]> {
    const { data } = await this.request<{ webhooks: ShopifyWebhook[] }>("/webhooks.json");
    return data.webhooks;
  }
}

// ─── Error class ─────────────────────────────────────────────────

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string
  ) {
    super(message);
    this.name = "ShopifyApiError";
  }
}

// ─── Shopify API types ───────────────────────────────────────────

export interface ShopifyShop {
  id: number;
  name: string;
  domain: string;
  myshopify_domain: string;
  currency: string;
  iana_timezone: string;
  email: string;
  plan_name: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  status: string;
  tags: string;
  image: { src: string } | null;
  images: { src: string }[];
  variants: ShopifyVariant[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string | null;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string | null;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  total_shipping_price_set: {
    shop_money: { amount: string };
  };
  total_tax: string;
  financial_status: string;
  fulfillment_status: string | null;
  cancelled_at: string | null;
  source_name: string | null;
  customer: { id: number } | null;
  line_items: ShopifyLineItem[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyLineItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  title: string;
  quantity: number;
  price: string;
  total_discount: string;
}

export interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  orders_count: number;
  total_spent: string;
  default_address: {
    city: string | null;
    country: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyWebhook {
  id: number;
  topic: string;
  address: string;
  format: string;
  created_at: string;
  updated_at: string;
}
