/**
 * WooCommerce REST API v3 client with rate limiting and pagination.
 * Uses consumer key / consumer secret Basic auth.
 */

const API_VERSION = "wc/v3";
const MAX_REQUESTS_PER_SECOND = 5;

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

export interface WooCommerceClientConfig {
  url: string; // e.g. "https://mystore.com"
  consumerKey: string;
  consumerSecret: string;
}

export class WooCommerceClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: WooCommerceClientConfig) {
    const url = config.url.replace(/\/$/, "");
    this.baseUrl = `${url}/wp-json/${API_VERSION}`;
    this.authHeader =
      "Basic " +
      Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; totalPages: number; total: number }> {
    await rateLimitDelay();

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new WooCommerceApiError(
        `WooCommerce API error ${res.status}: ${res.statusText}`,
        res.status,
        errorBody
      );
    }

    const data = await res.json();
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);
    const total = parseInt(res.headers.get("X-WP-Total") || "0", 10);

    return { data, totalPages, total };
  }

  // ─── Paginated fetcher ───────────────────────────────────────

  async *paginate<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): AsyncGenerator<T[], void, unknown> {
    const query = new URLSearchParams({ per_page: "100", ...params });
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      query.set("page", String(page));
      const url = `${this.baseUrl}${endpoint}?${query.toString()}`;
      const result = await this.request<T[]>(url);
      totalPages = result.totalPages;

      if (result.data.length > 0) {
        yield result.data;
      } else {
        break;
      }

      page++;
    }
  }

  // ─── Resource fetchers ──────────────────────────────────────

  async *fetchProducts(params: Record<string, string> = {}) {
    yield* this.paginate<WooProduct>("/products", {
      status: "publish",
      ...params,
    });
  }

  async *fetchOrders(params: Record<string, string> = {}) {
    yield* this.paginate<WooOrder>("/orders", params);
  }

  async *fetchCustomers(params: Record<string, string> = {}) {
    yield* this.paginate<WooCustomer>("/customers", params);
  }

  async getStoreInfo(): Promise<WooSystemStatus> {
    const { data } = await this.request<WooSystemStatus>("/system_status");
    return data;
  }

  async getProductCount(): Promise<number> {
    const { total } = await this.request<WooProduct[]>(
      `${this.baseUrl}/products?per_page=1&status=publish`
    );
    return total;
  }

  async getOrderCount(): Promise<number> {
    const { total } = await this.request<WooOrder[]>(
      `${this.baseUrl}/orders?per_page=1`
    );
    return total;
  }

  async getCustomerCount(): Promise<number> {
    const { total } = await this.request<WooCustomer[]>(
      `${this.baseUrl}/customers?per_page=1`
    );
    return total;
  }

  // ─── Webhook management ────────────────────────────────────

  async createWebhook(
    topic: string,
    deliveryUrl: string,
    secret: string
  ): Promise<WooWebhook> {
    const { data } = await this.request<WooWebhook>("/webhooks", {
      method: "POST",
      body: JSON.stringify({
        topic,
        delivery_url: deliveryUrl,
        secret,
        status: "active",
      }),
    });
    return data;
  }

  async listWebhooks(): Promise<WooWebhook[]> {
    const { data } = await this.request<WooWebhook[]>("/webhooks");
    return data;
  }
}

// ─── Error class ─────────────────────────────────────────────────

export class WooCommerceApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string
  ) {
    super(message);
    this.name = "WooCommerceApiError";
  }
}

// ─── WooCommerce API types ───────────────────────────────────────

export interface WooSystemStatus {
  environment: {
    site_url: string;
    wc_version: string;
    wp_version: string;
  };
  settings: {
    currency: string;
    currency_position: string;
  };
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  categories: { id: number; name: string }[];
  images: { src: string }[];
  variations: number[];
  date_created: string;
  date_modified: string;
}

export interface WooOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  total_tax: string;
  customer_id: number;
  billing: {
    email: string;
    first_name: string;
    last_name: string;
    city: string;
    country: string;
  };
  line_items: WooLineItem[];
  payment_method: string;
  date_created: string;
  date_modified: string;
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  subtotal: string;
  total: string;
  price: number;
  sku: string;
}

export interface WooCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  billing: {
    city: string;
    country: string;
  };
  orders_count: number;
  total_spent: string;
  date_created: string;
  date_modified: string;
}

export interface WooWebhook {
  id: number;
  topic: string;
  delivery_url: string;
  status: string;
  secret: string;
  date_created: string;
  date_modified: string;
}
