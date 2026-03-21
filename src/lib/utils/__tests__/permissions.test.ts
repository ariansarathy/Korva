import { describe, it, expect } from "vitest";
import { canUseFeature, FEATURE_PLANS, type Feature } from "@/lib/utils/permissions";
import type { Plan } from "@/lib/supabase/types";

describe("canUseFeature", () => {
  const plans: Plan[] = ["free", "starter", "growth", "scale"];

  it("free plan cannot access any features", () => {
    const features = Object.keys(FEATURE_PLANS) as Feature[];
    for (const feature of features) {
      expect(canUseFeature("free", feature)).toBe(false);
    }
  });

  it("starter plan cannot access growth or scale features", () => {
    expect(canUseFeature("starter", "reports")).toBe(false);
    expect(canUseFeature("starter", "team")).toBe(false);
    expect(canUseFeature("starter", "api_access")).toBe(false);
    expect(canUseFeature("starter", "churn_prediction")).toBe(false);
  });

  it("growth plan can access growth-tier features", () => {
    expect(canUseFeature("growth", "reports")).toBe(true);
    expect(canUseFeature("growth", "team")).toBe(true);
    expect(canUseFeature("growth", "anomaly_alerts")).toBe(true);
    expect(canUseFeature("growth", "ad_tracking")).toBe(true);
    expect(canUseFeature("growth", "forecasting")).toBe(true);
    expect(canUseFeature("growth", "scheduled_reports")).toBe(true);
    expect(canUseFeature("growth", "data_export")).toBe(true);
    expect(canUseFeature("growth", "cohort_analysis")).toBe(true);
    expect(canUseFeature("growth", "profit_margins")).toBe(true);
    expect(canUseFeature("growth", "geographic_revenue")).toBe(true);
    expect(canUseFeature("growth", "inventory_velocity")).toBe(true);
  });

  it("growth plan cannot access scale-tier features", () => {
    expect(canUseFeature("growth", "api_access")).toBe(false);
    expect(canUseFeature("growth", "churn_prediction")).toBe(false);
    expect(canUseFeature("growth", "custom_reports")).toBe(false);
  });

  it("scale plan can access all features", () => {
    const features = Object.keys(FEATURE_PLANS) as Feature[];
    for (const feature of features) {
      expect(canUseFeature("scale", feature)).toBe(true);
    }
  });

  it("higher plans always include lower plan features", () => {
    const features = Object.keys(FEATURE_PLANS) as Feature[];
    for (const feature of features) {
      let previousAllowed = false;
      for (const plan of plans) {
        const allowed = canUseFeature(plan, feature);
        // Once allowed, higher plans must also allow
        if (previousAllowed) {
          expect(allowed).toBe(true);
        }
        previousAllowed = allowed;
      }
    }
  });
});

describe("FEATURE_PLANS", () => {
  it("all features have a valid plan", () => {
    const validPlans: Plan[] = ["free", "starter", "growth", "scale"];
    const features = Object.keys(FEATURE_PLANS) as Feature[];
    for (const feature of features) {
      expect(validPlans).toContain(FEATURE_PLANS[feature]);
    }
  });

  it("churn_prediction and custom_reports require scale", () => {
    expect(FEATURE_PLANS.churn_prediction).toBe("scale");
    expect(FEATURE_PLANS.custom_reports).toBe("scale");
  });

  it("api_access requires scale", () => {
    expect(FEATURE_PLANS.api_access).toBe("scale");
  });
});
