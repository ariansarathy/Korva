import { describe, it, expect } from "vitest";
import { PLAN_LIMITS } from "@/lib/utils/plan-limits";
import type { Plan } from "@/lib/supabase/types";

describe("PLAN_LIMITS", () => {
  it("free plan has strict limits", () => {
    expect(PLAN_LIMITS.free.orders).toBe(0);
    expect(PLAN_LIMITS.free.aiQueries).toBe(10);
    expect(PLAN_LIMITS.free.stores).toBe(1);
  });

  it("starter plan allows 1000 orders and 100 AI queries", () => {
    expect(PLAN_LIMITS.starter.orders).toBe(1000);
    expect(PLAN_LIMITS.starter.aiQueries).toBe(100);
    expect(PLAN_LIMITS.starter.stores).toBe(1);
  });

  it("growth plan allows 10000 orders and 500 AI queries", () => {
    expect(PLAN_LIMITS.growth.orders).toBe(10000);
    expect(PLAN_LIMITS.growth.aiQueries).toBe(500);
    expect(PLAN_LIMITS.growth.stores).toBe(3);
  });

  it("scale plan has unlimited AI queries (-1) and 100000 orders", () => {
    expect(PLAN_LIMITS.scale.orders).toBe(100000);
    expect(PLAN_LIMITS.scale.aiQueries).toBe(-1);
    expect(PLAN_LIMITS.scale.stores).toBe(10);
  });

  it("limits increase with each plan tier", () => {
    const plans: Plan[] = ["free", "starter", "growth", "scale"];
    for (let i = 1; i < plans.length; i++) {
      const current = PLAN_LIMITS[plans[i]];
      const previous = PLAN_LIMITS[plans[i - 1]];
      expect(current.orders).toBeGreaterThan(previous.orders);
      expect(current.stores).toBeGreaterThanOrEqual(previous.stores);

      // AI queries increase (or become unlimited)
      if (current.aiQueries !== -1 && previous.aiQueries !== -1) {
        expect(current.aiQueries).toBeGreaterThan(previous.aiQueries);
      }
    }
  });

  it("all plans are defined", () => {
    const plans: Plan[] = ["free", "starter", "growth", "scale"];
    for (const plan of plans) {
      expect(PLAN_LIMITS[plan]).toBeDefined();
      expect(PLAN_LIMITS[plan].orders).toBeTypeOf("number");
      expect(PLAN_LIMITS[plan].aiQueries).toBeTypeOf("number");
      expect(PLAN_LIMITS[plan].stores).toBeTypeOf("number");
    }
  });
});
