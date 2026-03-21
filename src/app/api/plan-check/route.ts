import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { checkFeatureAccess, type Feature } from "@/lib/utils/permissions";
import { PLAN_LIMITS } from "@/lib/utils/plan-limits";
import type { Plan } from "@/lib/supabase/types";

const VALID_FEATURES: Feature[] = [
  "reports",
  "team",
  "anomaly_alerts",
  "api_access",
  "ad_tracking",
  "forecasting",
  "data_export",
  "scheduled_reports",
];

/**
 * GET /api/plan-check?feature=reports
 * Returns whether the user's plan allows access to a feature,
 * plus current subscription usage data.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feature = request.nextUrl.searchParams.get("feature") as Feature;
    if (!feature || !VALID_FEATURES.includes(feature)) {
      return NextResponse.json(
        { error: "Invalid feature parameter" },
        { status: 400 }
      );
    }

    const result = await checkFeatureAccess(userId, feature);

    // Fetch subscription usage data
    const supabase = await createClient();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, orders_used, orders_limit, ai_queries_used, ai_queries_limit")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const plan = (sub?.plan as Plan) ?? "free";
    const limits = PLAN_LIMITS[plan];

    return NextResponse.json({
      allowed: result.allowed,
      currentPlan: result.currentPlan,
      requiredPlan: result.requiredPlan,
      plan,
      status: sub?.status ?? "active",
      ordersUsed: sub?.orders_used ?? 0,
      ordersLimit: sub?.orders_limit ?? limits.orders,
      aiQueriesUsed: sub?.ai_queries_used ?? 0,
      aiQueriesLimit: sub?.ai_queries_limit ?? limits.aiQueries,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to check plan access" },
      { status: 500 }
    );
  }
}
