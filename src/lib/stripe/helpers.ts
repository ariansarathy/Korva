import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/supabase/types";

// ─── Stripe client ───────────────────────────────────────────────

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    stripeInstance = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }
  return stripeInstance;
}

// ─── Plan configuration ─────────────────────────────────────────

export interface PlanConfig {
  name: string;
  plan: Plan;
  priceId: string | null;
  price: number;
  ordersLimit: number;
  aiQueriesLimit: number;
  storesLimit: number;
  features: string[];
}

export function getPlans(): PlanConfig[] {
  return [
    {
      name: "Starter",
      plan: "starter",
      priceId: process.env.STRIPE_STARTER_PRICE_ID || null,
      price: 49,
      ordersLimit: 1000,
      aiQueriesLimit: 100,
      storesLimit: 1,
      features: ["1 store", "1,000 orders/mo", "100 AI queries/mo", "Email support"],
    },
    {
      name: "Growth",
      plan: "growth",
      priceId: process.env.STRIPE_GROWTH_PRICE_ID || null,
      price: 149,
      ordersLimit: 10000,
      aiQueriesLimit: 500,
      storesLimit: 3,
      features: [
        "3 stores",
        "10,000 orders/mo",
        "500 AI queries/mo",
        "Priority support",
        "Custom reports",
      ],
    },
    {
      name: "Scale",
      plan: "scale",
      priceId: process.env.STRIPE_SCALE_PRICE_ID || null,
      price: 299,
      ordersLimit: -1,
      aiQueriesLimit: -1,
      storesLimit: 10,
      features: [
        "10 stores",
        "Unlimited orders",
        "Unlimited AI queries",
        "API access",
        "Dedicated support",
        "White-label reports",
      ],
    },
  ];
}

// ─── Customer management ─────────────────────────────────────────

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const adminSupabase = createAdminClient();

  // Check if user already has a Stripe customer ID
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  // Save to profile
  await adminSupabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}

// ─── Plan helpers ────────────────────────────────────────────────

export function planFromPriceId(priceId: string): Plan {
  const plans = getPlans();
  const match = plans.find((p) => p.priceId === priceId);
  return match?.plan ?? "starter";
}

export function limitsForPlan(plan: Plan): {
  ordersLimit: number;
  aiQueriesLimit: number;
} {
  const plans = getPlans();
  const match = plans.find((p) => p.plan === plan);
  return {
    ordersLimit: match?.ordersLimit ?? 1000,
    aiQueriesLimit: match?.aiQueriesLimit ?? 100,
  };
}
