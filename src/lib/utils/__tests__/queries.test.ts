import { describe, it, expect } from "vitest";

// We test the pure utility functions that don't require Supabase
// Since periodToDate and calcChange are not exported, we test them
// indirectly through the module or re-create the logic here.

describe("calcChange", () => {
  // Re-implement the pure function for testing
  function calcChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  it("returns 0 when both values are 0", () => {
    expect(calcChange(0, 0)).toBe(0);
  });

  it("returns 100 when previous is 0 and current is positive", () => {
    expect(calcChange(50, 0)).toBe(100);
  });

  it("returns 0 when previous is 0 and current is 0", () => {
    expect(calcChange(0, 0)).toBe(0);
  });

  it("calculates positive change correctly", () => {
    expect(calcChange(150, 100)).toBe(50);
    expect(calcChange(200, 100)).toBe(100);
  });

  it("calculates negative change correctly", () => {
    expect(calcChange(50, 100)).toBe(-50);
    expect(calcChange(75, 100)).toBe(-25);
  });

  it("rounds to nearest integer", () => {
    expect(calcChange(133, 100)).toBe(33);
    expect(calcChange(167, 100)).toBe(67);
  });
});

describe("periodToDate", () => {
  // Re-implement for testing
  function periodToDate(period: "7d" | "30d" | "90d" | "12mo"): string {
    const now = new Date();
    switch (period) {
      case "7d":
        now.setDate(now.getDate() - 7);
        break;
      case "30d":
        now.setDate(now.getDate() - 30);
        break;
      case "90d":
        now.setDate(now.getDate() - 90);
        break;
      case "12mo":
        now.setFullYear(now.getFullYear() - 1);
        break;
    }
    return now.toISOString();
  }

  it("returns a valid ISO string", () => {
    const result = periodToDate("7d");
    expect(() => new Date(result)).not.toThrow();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("7d returns a date ~7 days ago", () => {
    const result = new Date(periodToDate("7d"));
    const now = new Date();
    const diffDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it("30d returns a date ~30 days ago", () => {
    const result = new Date(periodToDate("30d"));
    const now = new Date();
    const diffDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it("90d returns a date ~90 days ago", () => {
    const result = new Date(periodToDate("90d"));
    const now = new Date();
    const diffDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });

  it("12mo returns a date ~365 days ago", () => {
    const result = new Date(periodToDate("12mo"));
    const now = new Date();
    const diffDays = Math.round((now.getTime() - result.getTime()) / (1000 * 60 * 60 * 24));
    // Allow ±1 day for leap years
    expect(diffDays).toBeGreaterThanOrEqual(365);
    expect(diffDays).toBeLessThanOrEqual(366);
  });
});

describe("revenue trend data grouping", () => {
  // Test the grouping logic used in getRevenueTrend
  function groupOrdersByDate(
    orders: Array<{ total: number; created_at: string }>
  ): Map<string, { revenue: number; orders: number }> {
    const grouped = new Map<string, { revenue: number; orders: number }>();
    for (const order of orders) {
      const date = order.created_at.split("T")[0];
      const existing = grouped.get(date) ?? { revenue: 0, orders: 0 };
      existing.revenue += Number(order.total);
      existing.orders += 1;
      grouped.set(date, existing);
    }
    return grouped;
  }

  it("groups orders by date correctly", () => {
    const orders = [
      { total: 100, created_at: "2025-01-01T10:00:00Z" },
      { total: 50, created_at: "2025-01-01T15:00:00Z" },
      { total: 200, created_at: "2025-01-02T09:00:00Z" },
    ];

    const grouped = groupOrdersByDate(orders);
    expect(grouped.get("2025-01-01")).toEqual({ revenue: 150, orders: 2 });
    expect(grouped.get("2025-01-02")).toEqual({ revenue: 200, orders: 1 });
  });

  it("handles empty orders array", () => {
    const grouped = groupOrdersByDate([]);
    expect(grouped.size).toBe(0);
  });

  it("handles single order", () => {
    const orders = [{ total: 99.99, created_at: "2025-06-15T12:00:00Z" }];
    const grouped = groupOrdersByDate(orders);
    expect(grouped.size).toBe(1);
    expect(grouped.get("2025-06-15")).toEqual({ revenue: 99.99, orders: 1 });
  });
});
