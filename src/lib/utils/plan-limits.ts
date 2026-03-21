import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/supabase/types";
import { FEATURE_PLANS, type Feature } from "@/lib/utils/permissions";

// Re-export for convenience
export { FEATURE_PLANS, type Feature };

// ─── Plan configuration ─────────────────────────────────────────

export const PLAN_LIMITS: Record<Plan, { orders: number; aiQueries: number; stores: number }> = {
  free: { orders: 0, aiQueries: 10, stores: 1 },
  starter: { orders: 1000, aiQueries: 100, stores: 1 },
  growth: { orders: 10000, aiQueries: 500, stores: 3 },
  scale: { orders: 100000, aiQueries: -1, stores: 10 }, // -1 = unlimited
};

// ─── Limit checks ────────────────────────────────────────────────

export interface LimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  plan: Plan;
}

/**
 * Check if the user can ingest more orders this billing period.
 */
export async function checkOrderLimit(userId: string): Promise<LimitCheckResult> {
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, orders_used, orders_limit, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    // No subscription — use free plan limits
    return {
      allowed: false,
      used: 0,
      limit: PLAN_LIMITS.free.orders,
      plan: "free",
    };
  }

  const plan = sub.plan as Plan;
  const limit = sub.orders_limit || PLAN_LIMITS[plan].orders;

  // Unlimited
  if (limit === -1) {
    return { allowed: true, used: sub.orders_used, limit: -1, plan };
  }

  return {
    allowed: sub.orders_used < limit,
    used: sub.orders_used,
    limit,
    plan,
  };
}

/**
 * Check if the user can make more AI queries this billing period.
 */
export async function checkAiQueryLimit(userId: string): Promise<LimitCheckResult> {
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, ai_queries_used, ai_queries_limit, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    // No subscription — use free plan limits
    return {
      allowed: true,
      used: 0,
      limit: PLAN_LIMITS.free.aiQueries,
      plan: "free",
    };
  }

  const plan = sub.plan as Plan;
  const limit = sub.ai_queries_limit || PLAN_LIMITS[plan].aiQueries;

  // Unlimited
  if (limit === -1) {
    return { allowed: true, used: sub.ai_queries_used, limit: -1, plan };
  }

  return {
    allowed: sub.ai_queries_used < limit,
    used: sub.ai_queries_used,
    limit,
    plan,
  };
}

/**
 * Increment the AI query usage count atomically via SQL RPC.
 * Prevents race conditions from concurrent requests.
 */
export async function incrementAiQueryUsage(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_ai_queries", { p_user_id: userId });
}

/**
 * Increment the orders used count atomically via SQL RPC.
 * Prevents race conditions from concurrent requests.
 */
export async function incrementOrderUsage(userId: string, count = 1): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_orders_used", { p_user_id: userId, p_count: count });
}
