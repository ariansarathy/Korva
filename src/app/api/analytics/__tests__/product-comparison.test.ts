import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUserStore, mockFromFn, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetCurrentUserStore = vi.fn();
  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = [
    "select", "eq", "neq", "or", "order", "limit", "range",
    "single", "maybeSingle", "in", "is", "ilike", "filter",
    "insert", "update", "delete", "upsert", "not", "match", "gte", "lte",
  ];
  for (const method of chainMethods) {
    mockQueryBuilder[method] = vi.fn().mockReturnValue(mockQueryBuilder);
  }
  mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
    resolve({ data: [], error: null, count: 0 })
  );
  Object.defineProperty(mockQueryBuilder, Symbol.toStringTag, { value: "Promise" });
  const mockFromFn = vi.fn().mockReturnValue(mockQueryBuilder);
  return { mockGetCurrentUserStore, mockFromFn, mockQueryBuilder };
});

vi.mock("@/lib/utils/auth", () => ({
  getCurrentUserStore: (...args: unknown[]) => mockGetCurrentUserStore(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFromFn }),
}));

import { GET } from "../product-comparison/route";

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/analytics/product-comparison");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /api/analytics/product-comparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserStore.mockResolvedValue({
      userId: "user-1",
      store: { id: "store-1" },
    });
    for (const method of Object.keys(mockQueryBuilder)) {
      if (typeof mockQueryBuilder[method]?.mockReturnValue === "function") {
        mockQueryBuilder[method].mockReturnValue(mockQueryBuilder);
      }
    }
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: null, store: null });
    const res = await GET(createRequest({ products: "p1,p2" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when products parameter is missing", async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(400);
  });

  it("returns product comparison data", async () => {
    let callIndex = 0;
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) => {
      callIndex++;
      if (callIndex === 1) {
        // Products query
        return resolve({
          data: [
            { id: "p1", title: "Product A", image_url: null, sell_price: 29.99 },
            { id: "p2", title: "Product B", image_url: null, sell_price: 49.99 },
          ],
          error: null,
        });
      }
      if (callIndex === 2) {
        // Orders query
        return resolve({
          data: [
            { id: "o1", created_at: new Date().toISOString() },
          ],
          error: null,
        });
      }
      // Order items query
      return resolve({
        data: [
          { product_id: "p1", order_id: "o1", quantity: 2, total_price: 59.98 },
          { product_id: "p2", order_id: "o1", quantity: 1, total_price: 49.99 },
        ],
        error: null,
      });
    });

    const res = await GET(createRequest({ products: "p1,p2", days: "30" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.products).toHaveLength(2);
    expect(body.products[0].title).toBe("Product A");
    expect(body.products[0].revenue).toBe(59.98);
    expect(body.products[0].units).toBe(2);
    expect(body.products[1].title).toBe("Product B");
    expect(body.products[1].revenue).toBe(49.99);
  });

  it("returns empty products when none found", async () => {
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({ data: [], error: null })
    );

    const res = await GET(createRequest({ products: "p1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.products).toHaveLength(0);
  });

  it("includes trend data with date filling", async () => {
    let callIndex = 0;
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) => {
      callIndex++;
      if (callIndex === 1) {
        return resolve({
          data: [{ id: "p1", title: "Test", image_url: null, sell_price: 10 }],
          error: null,
        });
      }
      if (callIndex === 2) {
        return resolve({ data: [], error: null }); // No orders
      }
      return resolve({ data: [], error: null });
    });

    const res = await GET(createRequest({ products: "p1", days: "7" }));
    const body = await res.json();

    expect(body.products[0].trend).toHaveLength(7);
    expect(body.products[0].trend[0]).toHaveProperty("date");
    expect(body.products[0].trend[0]).toHaveProperty("value");
  });
});
