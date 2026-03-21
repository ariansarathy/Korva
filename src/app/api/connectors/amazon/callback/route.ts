import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";

/**
 * GET /api/connectors/amazon/callback
 * Handles LWA OAuth callback, exchanges code for refresh token,
 * creates store record.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("spapi_oauth_code");
    const sellingPartnerId = request.nextUrl.searchParams.get("selling_partner_id");

    if (!code) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=missing_code`
      );
    }

    const clientId = process.env.AMAZON_SP_CLIENT_ID;
    const clientSecret = process.env.AMAZON_SP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=not_configured`
      );
    }

    // Verify authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${request.nextUrl.origin}/login`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch(LWA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=token_exchange_failed`
      );
    }

    const tokens = await tokenRes.json();
    const refreshToken = tokens.refresh_token;

    // Create store record
    const adminSupabase = createAdminClient();
    const { data: store, error } = await adminSupabase
      .from("stores")
      .insert({
        user_id: user.id,
        platform: "amazon",
        name: `Amazon Store (${sellingPartnerId ?? "SP"})`,
        url: sellingPartnerId ?? null,
        currency: "USD",
        timezone: "America/New_York",
        access_token: refreshToken,
        sync_status: "pending",
        connected_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !store) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=store_creation_failed`
      );
    }

    return NextResponse.redirect(
      `${request.nextUrl.origin}/onboarding?store=${store.id}&step=sync&platform=amazon`
    );
  } catch (err) {
    console.error("Amazon callback error:", err);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?error=callback_failed`
    );
  }
}
