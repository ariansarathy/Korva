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

import { GET } from "../funnel/route";

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/analytics/funnel");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /api/analytics/funnel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserStore.mockResolvedValue({
      userId: "user-1",
      store: { id: "store-1" },
    });
    // Reset chain
    for (const method of Object.keys(mockQueryBuilder)) {
      if (typeof mockQueryBuilder[method]?.mockReturnValue === "function") {
        mockQueryBuilder[method].mockReturnValue(mockQueryBuilder);
      }
    }
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserStore.mockResolvedValue({ userId: null, store: null });
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns funnel stages with correct counts", async () => {
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({
        data: [
          { status: "pending" },
          { status: "pending" },
          { status: "paid" },
          { status: "fulfilled" },
          { status: "fulfilled" },
          { status: "cancelled" },
        ],
        error: null,
      })
    );

    const res = await GET(createRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stages).toHaveLength(3);
    expect(body.stages[0].name).toBe("All Orders");
    expect(body.stages[0].count).toBe(6);
    expect(body.stages[1].name).toBe("Paid");
    expect(body.stages[1].count).toBe(3); // 1 paid + 2 fulfilled
    expect(body.stages[2].name).toBe("Fulfilled");
    expect(body.stages[2].count).toBe(2);
    expect(body.summary.cancelled).toBe(1);
  });

  it("handles empty orders", async () => {
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({ data: [], error: null })
    );

    const res = await GET(createRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stages[0].count).toBe(0);
    expect(body.stages[1].count).toBe(0);
  });

  it("respects days parameter", async () => {
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({ data: [], error: null })
    );

    const res = await GET(createRequest({ days: "7" }));
    const body = await res.json();

    expect(body.period_days).toBe(7);
    expect(mockQueryBuilder.gte).toHaveBeenCalled();
  });

  it("returns 500 on database error", async () => {
    mockQueryBuilder.then = vi.fn().mockImplementation((resolve) =>
      resolve({ data: null, error: { message: "DB error" } })
    );

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });
});
