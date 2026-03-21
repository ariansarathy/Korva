import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.korva.app";

/**
 * GET /api/connectors/google/callback
 * Handles Google OAuth callback — exchanges code for tokens.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=google_oauth_failed`
      );
    }

    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=google_not_configured`
      );
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${APP_URL}/api/connectors/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=google_token_exchange`
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=google_no_token`
      );
    }

    // Get the user's store
    const supabase = await createClient();
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", userId)
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    if (!store) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=no_store`
      );
    }

    const tokenExpiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();

    // Create ad connection (account_id will be populated during first sync)
    await supabase.from("ad_connections").insert({
      store_id: store.id,
      platform: "google",
      account_id: "pending",
      account_name: "Google Ads",
      access_token,
      refresh_token: refresh_token ?? null,
      token_expires_at: tokenExpiresAt,
      status: "active",
    });

    return NextResponse.redirect(`${APP_URL}/settings?ad_connected=google`);
  } catch {
    return NextResponse.redirect(
      `${APP_URL}/settings?error=google_callback_failed`
    );
  }
}
