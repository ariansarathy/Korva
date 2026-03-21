import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe/helpers";

/**
 * POST /api/stripe/checkout
 * Body: { priceId: string }
 * Creates a Stripe Checkout Session with a 14-day free trial.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const customerId = await getOrCreateStripeCustomer(user.id, user.email);
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id },
      },
      success_url: `${appUrl}/settings?tab=billing&success=true`,
      cancel_url: `${appUrl}/settings?tab=billing&cancelled=true`,
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
