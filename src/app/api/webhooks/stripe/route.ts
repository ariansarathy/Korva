import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, planFromPriceId, limitsForPlan } from "@/lib/stripe/helpers";
import type { SubscriptionStatus, Plan } from "@/lib/supabase/types";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.warn("Subscription without user_id metadata:", subscription.id);
          break;
        }

        const firstItem = subscription.items.data[0];
        const priceId = firstItem?.price?.id;
        const plan = priceId ? planFromPriceId(priceId) : "starter";
        const limits = limitsForPlan(plan);
        const status = mapStripeStatus(subscription.status);

        // In Stripe v20+, period dates are on SubscriptionItem, not Subscription
        const periodStart = firstItem?.current_period_start;
        const periodEnd = firstItem?.current_period_end;

        // Upsert subscription record
        await adminSupabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId || null,
              plan,
              status,
              current_period_start: periodStart
                ? new Date(periodStart * 1000).toISOString()
                : null,
              current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
              orders_limit: limits.ordersLimit,
              ai_queries_limit: limits.aiQueriesLimit,
            },
            { onConflict: "stripe_subscription_id" }
          );

        // Update profile plan
        await adminSupabase
          .from("profiles")
          .update({ plan })
          .eq("id", userId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) break;

        // Mark subscription as cancelled
        await adminSupabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);

        // Downgrade profile to free
        await adminSupabase
          .from("profiles")
          .update({ plan: "free" })
          .eq("id", userId);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof subRef === "string" ? subRef : subRef?.id;

        if (subscriptionId) {
          await adminSupabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "cancelled";
    case "trialing":
      return "trialing";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "active";
  }
}
