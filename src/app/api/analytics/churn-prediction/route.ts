import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/analytics/churn-prediction
 * Predict churn risk for customers based on order recency and frequency.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all customers with their order data
    const { data: customers } = await supabase
      .from("customers")
      .select(
        "id, first_name, last_name, last_order_date, first_order_date, order_count, lifetime_value, segment"
      )
      .eq("store_id", store.id)
      .gt("order_count", 0)
      .order("last_order_date", { ascending: true });

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        predictions: [],
        summary: {
          total_customers: 0,
          high_risk: 0,
          medium_risk: 0,
          low_risk: 0,
          churned: 0,
          at_risk_revenue: 0,
        },
      });
    }

    const now = Date.now();

    const predictions = customers.map((c) => {
      const lastOrderDate = c.last_order_date
        ? new Date(c.last_order_date)
        : null;
      const firstOrderDate = c.first_order_date
        ? new Date(c.first_order_date)
        : null;

      const daysSinceLastOrder = lastOrderDate
        ? Math.floor((now - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const customerLifespanDays =
        firstOrderDate && lastOrderDate
          ? Math.max(
              1,
              Math.floor(
                (lastOrderDate.getTime() - firstOrderDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 1;

      // Average order frequency (days between orders)
      const avgOrderFrequency =
        c.order_count > 1 ? customerLifespanDays / (c.order_count - 1) : 90;

      // Churn risk score: higher = more likely to churn
      // Based on ratio of days since last order to avg purchase frequency
      const recencyRatio = daysSinceLastOrder / avgOrderFrequency;

      let risk: "low" | "medium" | "high" | "churned";
      let churnProbability: number;

      if (recencyRatio >= 4 || daysSinceLastOrder > 180) {
        risk = "churned";
        churnProbability = Math.min(0.95, 0.7 + recencyRatio * 0.05);
      } else if (recencyRatio >= 2.5 || daysSinceLastOrder > 90) {
        risk = "high";
        churnProbability = Math.min(0.7, 0.4 + recencyRatio * 0.1);
      } else if (recencyRatio >= 1.5 || daysSinceLastOrder > 45) {
        risk = "medium";
        churnProbability = Math.min(0.4, 0.15 + recencyRatio * 0.1);
      } else {
        risk = "low";
        churnProbability = Math.max(0.05, recencyRatio * 0.1);
      }

      return {
        customer_id: c.id,
        name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown",
        segment: c.segment,
        order_count: c.order_count,
        lifetime_value: c.lifetime_value,
        days_since_last_order: daysSinceLastOrder,
        avg_order_frequency: Math.round(avgOrderFrequency),
        risk,
        churn_probability: Math.round(churnProbability * 100),
      };
    });

    // Sort by churn probability (highest risk first)
    predictions.sort((a, b) => b.churn_probability - a.churn_probability);

    const summary = {
      total_customers: predictions.length,
      high_risk: predictions.filter((p) => p.risk === "high").length,
      medium_risk: predictions.filter((p) => p.risk === "medium").length,
      low_risk: predictions.filter((p) => p.risk === "low").length,
      churned: predictions.filter((p) => p.risk === "churned").length,
      at_risk_revenue: Math.round(
        predictions
          .filter((p) => p.risk === "high" || p.risk === "churned")
          .reduce((sum, p) => sum + p.lifetime_value, 0) * 100
      ) / 100,
    };

    return NextResponse.json({
      predictions: predictions.slice(0, 100),
      summary,
    });
  } catch (error) {
    console.error("Churn prediction error:", error);
    return NextResponse.json(
      { error: "Failed to compute churn predictions" },
      { status: 500 }
    );
  }
}
