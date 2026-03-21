import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/supabase/types";

// ─── Feature → Plan mapping ─────────────────────────────────────

export type Feature =
  | "reports"
  | "team"
  | "anomaly_alerts"
  | "api_access"
  | "ad_tracking"
  | "forecasting"
  | "data_export"
  | "scheduled_reports"
  | "cohort_analysis"
  | "profit_margins"
  | "geographic_revenue"
  | "churn_prediction"
  | "inventory_velocity"
  | "custom_reports"
  | "conversion_funnel"
  | "revenue_breakdown"
  | "ltv_distribution"
  | "product_comparison";

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  scale: 3,
};

/**
 * Minimum plan required for each feature.
 */
export const FEATURE_PLANS: Record<Feature, Plan> = {
  reports: "growth",
  team: "growth",
  anomaly_alerts: "growth",
  ad_tracking: "growth",
  forecasting: "growth",
  scheduled_reports: "growth",
  data_export: "growth",
  cohort_analysis: "growth",
  profit_margins: "growth",
  geographic_revenue: "growth",
  churn_prediction: "scale",
  inventory_velocity: "growth",
  custom_reports: "scale",
  api_access: "scale",
  conversion_funnel: "starter",
  revenue_breakdown: "growth",
  ltv_distribution: "growth",
  product_comparison: "growth",
};

/**
 * Check if a plan has access to a feature.
 */
export function canUseFeature(plan: Plan, feature: Feature): boolean {
  const requiredPlan = FEATURE_PLANS[feature];
  return PLAN_RANK[plan] >= PLAN_RANK[requiredPlan];
}

/**
 * Check if a user can access a specific store
 * (either as the owner or as a team member).
 */
export async function canAccessStore(
  userId: string,
  storeId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Check direct ownership
  const { data: ownedStore } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("user_id", userId)
    .single();

  if (ownedStore) return true;

  // Check team membership
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("member_id", userId)
    .eq("status", "accepted")
    .single();

  if (!teamMember) return false;

  // Resolve whether the team owner has this store
  const { data: membership } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("member_id", userId)
    .eq("status", "accepted")
    .single();

  if (!membership) return false;

  const { data: ownerStore } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("user_id", membership.user_id)
    .single();

  return !!ownerStore;
}

/**
 * Check if a user can manage team members for a store.
 * Only owners and admins can manage team.
 */
export async function canManageTeam(
  userId: string,
  storeId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Check if user is the store owner
  const { data: ownedStore } = await supabase
    .from("stores")
    .select("user_id")
    .eq("id", storeId)
    .single();

  if (ownedStore?.user_id === userId) return true;

  // Check if user is an admin team member for the store owner
  if (ownedStore) {
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", ownedStore.user_id)
      .eq("member_id", userId)
      .eq("status", "accepted")
      .in("role", ["admin"])
      .single();

    return !!member;
  }

  return false;
}

/**
 * Get the current user's plan from their active subscription.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (sub?.plan as Plan) ?? "free";
}

/**
 * Check if a user's plan allows access to a feature.
 * Returns plan info and whether access is granted.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: Feature
): Promise<{ allowed: boolean; currentPlan: Plan; requiredPlan: Plan }> {
  const currentPlan = await getUserPlan(userId);
  const requiredPlan = FEATURE_PLANS[feature];

  return {
    allowed: canUseFeature(currentPlan, feature),
    currentPlan,
    requiredPlan,
  };
}

/**
 * Check if a user has Scale plan for API access.
 */
export async function checkApiAccess(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return canUseFeature(plan, "api_access");
}
