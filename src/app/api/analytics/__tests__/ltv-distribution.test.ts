import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { GET } from "../ltv-distribution/route";

describe("GET /api/analytics/ltv-distribution", () => {
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
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns buckets with correct distribution", async () => {
    const customers = [
      { lifetime_value: 25 },
      { lifetime_value: 30 },
      { lifetime_value: 75 },
      { lifetime_value: 150 },
      { lifetime_value: 300 },
      { lifetime_value: 800 },
    ];

    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({ data: customers, error: null })
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.buckets).toHaveLength(6);
    // $0-50 bucket: 25, 30 = 2
    expect(body.buckets[0].count).toBe(2);
    expect(body.buckets[0].range).toBe("$0–50");
    // $50-100 bucket: 75 = 1
    expect(body.buckets[1].count).toBe(1);
    // $100-250 bucket: 150 = 1
    expect(body.buckets[2].count).toBe(1);
    // $250-500 bucket: 300 = 1
    expect(body.buckets[3].count).toBe(1);
    // $500-1K bucket: 800 = 1
    expect(body.buckets[4].count).toBe(1);
    // $1K+ bucket: 0
    expect(body.buckets[5].count).toBe(0);
  });

  it("calculates correct statistics", async () => {
    const customers = [
      { lifetime_value: 10 },
      { lifetime_value: 20 },
      { lifetime_value: 30 },
      { lifetime_value: 40 },
    ];

    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({ data: customers, error: null })
    );

    const res = await GET();
    const body = await res.json();

    expect(body.stats.total_customers).toBe(4);
    expect(body.stats.mean).toBe(25);
    expect(body.stats.median).toBe(25); // (20 + 30) / 2
  });

  it("handles empty customer list", async () => {
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({ data: [], error: null })
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stats.total_customers).toBe(0);
    expect(body.stats.mean).toBe(0);
    expect(body.buckets.every((b: { count: number }) => b.count === 0)).toBe(true);
  });

  it("returns 500 on database error", async () => {
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({ data: null, error: { message: "DB error" } })
    );

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
