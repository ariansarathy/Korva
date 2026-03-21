import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe/helpers";

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session for managing subscriptions.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const customerId = await getOrCreateStripeCustomer(user.id, user.email);
    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings?tab=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
