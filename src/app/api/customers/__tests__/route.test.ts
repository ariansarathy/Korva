import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Use vi.hoisted to create mocks that are available in vi.mock factories
const { mockGetCurrentUserStore, mockFromFn, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetCurrentUserStore = vi.fn();

  // Build a chainable query builder
  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = [
    "select", "eq", "neq", "or", "order", "limit", "range",
    "single", "maybeSingle", "in", "is", "ilike", "filter",
    "insert", "update", "delete", "upsert", "not", "match",
  ];
  for (const method of chainMethods) {
    mockQueryBuilder[method] = vi.fn().mockReturnValue(mockQueryBuilder);
  }
  // Default terminal resolution
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
  createClient: vi.fn().mockResolvedValue({
    from: mockFromFn,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
    },
  }),
}));

import { GET } from "../route";

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/customers");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

const mockStore = {
  id: "store-123",
  user_id: "test-user-id",
  name: "Test Store",
  platform: "shopify",
  domain: "test.myshopify.com",
  sync_status: "synced",
  connected_at: "2024-01-01T00:00:00Z",
};

const mockCustomers = [
  {
    id: "cust-1",
    store_id: "store-123",
    first_name: "Alice",
    last_name: "Johnson",
    email_hash: "alice@example.com",
    segment: "active",
    order_count: 5,
    lifetime_value: 500,
    last_order_date: "2024-06-15",
  },
  {
    id: "cust-2",
    store_id: "store-123",
    first_name: "Bob",
    last_name: "Smith",
    email_hash: "bob@example.com",
    segment: "vip",
    order_count: 15,
    lifetime_value: 2000,
    last_order_date: "2024-06-20",
  },
];

/**
 * Helper: configure the mock query builder to resolve with given data/error.
 */
function setQueryResponse(data: unknown, error: unknown = null) {
  const count = Array.isArray(data) ? data.length : null;
  mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
    resolve({ data, error, count })
  );
  Object.defineProperty(mockQueryBuilder, Symbol.toStringTag, { value: "Promise" });
}

describe("GET /api/customers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-wire chain methods after clearAllMocks
    const chainMethods = [
      "select", "eq", "neq", "or", "order", "limit", "range",
      "single", "maybeSingle", "in", "is", "ilike", "filter",
      "insert", "update", "delete", "upsert", "not", "match",
    ];
    for (const method of chainMethods) {
      mockQueryBuilder[method] = vi.fn().mockReturnValue(mockQueryBuilder);
    }
    mockFromFn.mockReturnValue(mockQueryBuilder);

    // Default: empty response
    setQueryResponse([], null);
  });

  it("returns 400 when no store is connected", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: null });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No store connected");
  });

  it("returns paginated customers with defaults", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });
    setQueryResponse(mockCustomers);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.customers).toEqual(mockCustomers);
    expect(data.total).toBe(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
  });

  it("passes page and limit parameters correctly", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });
    setQueryResponse([]);

    const response = await GET(createRequest({ page: "3", limit: "10" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.page).toBe(3);
    expect(data.limit).toBe(10);

    // Verify range was called with correct offset: (3-1) * 10 = 20
    expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 29);
  });

  it("rejects limit over 100 with validation error", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });

    const response = await GET(createRequest({ limit: "500" }));

    expect(response.status).toBe(400);
  });

  it("rejects negative page with validation error", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });

    const response = await GET(createRequest({ page: "-5" }));

    expect(response.status).toBe(400);
  });

  it("filters by segment when provided", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });
    setQueryResponse([mockCustomers[1]]);

    await GET(createRequest({ segment: "vip" }));

    // Should call eq twice: once for store_id, once for segment
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("store_id", "store-123");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("segment", "vip");
  });

  it("does not filter segment when 'all' is passed", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });
    setQueryResponse(mockCustomers);

    await GET(createRequest({ segment: "all" }));

    // eq should only be called once (for store_id), not for segment
    expect(mockQueryBuilder.eq).toHaveBeenCalledTimes(1);
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("store_id", "store-123");
  });

  it("applies search filter with .or()", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });
    setQueryResponse([mockCustomers[0]]);

    await GET(createRequest({ search: "alice" }));

    expect(mockQueryBuilder.or).toHaveBeenCalledWith(
      "first_name.ilike.%alice%,last_name.ilike.%alice%,email_hash.ilike.%alice%"
    );
  });

  it("orders by lifetime_value descending", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });
    setQueryResponse(mockCustomers);

    await GET(createRequest());

    expect(mockQueryBuilder.order).toHaveBeenCalledWith("lifetime_value", { ascending: false });
  });

  it("calculates totalPages correctly", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });

    // Mock 45 total records with limit of 20 → 3 pages
    const largeDataset = Array.from({ length: 45 }, (_, i) => ({
      id: `cust-${i}`,
      store_id: "store-123",
      first_name: `Customer${i}`,
      last_name: "Test",
    }));
    setQueryResponse(largeDataset);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.totalPages).toBe(Math.ceil(45 / 20)); // 3
  });

  it("returns 500 when Supabase query errors", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });
    setQueryResponse(null, { message: "Database connection failed" });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection failed");
  });

  it("returns 500 when getCurrentUserStore throws", async () => {
    mockGetCurrentUserStore.mockRejectedValue(new Error("Auth service down"));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("queries the customers table from the correct store", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: "test-user-id", store: mockStore });
    setQueryResponse([]);

    await GET(createRequest());

    expect(mockFromFn).toHaveBeenCalledWith("customers");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("store_id", "store-123");
  });
});
