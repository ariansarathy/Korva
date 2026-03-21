import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GA4Client } from "@/lib/connectors/ga4";

/**
 * GET /api/connectors/ga4/callback
 * Google OAuth callback — exchanges code for tokens, stores in integration_connections,
 * fetches available GA4 properties.
 */
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // userId
    const error = url.searchParams.get("error");

    if (error || !code || !state) {
      return NextResponse.redirect(
        `${siteUrl}/settings?tab=integrations&error=${error || "missing_code"}`
      );
    }

    // Verify user session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== state) {
      return NextResponse.redirect(
        `${siteUrl}/settings?tab=integrations&error=auth_mismatch`
      );
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.GA4_CLIENT_ID!,
        client_secret: process.env.GA4_CLIENT_SECRET!,
        redirect_uri: `${siteUrl}/api/connectors/ga4/callback`,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${siteUrl}/settings?tab=integrations&error=token_exchange_failed`
      );
    }

    const tokens = await tokenRes.json();

    // Fetch GA4 properties to get a display name
    const ga4Client = new GA4Client({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    let accountName = "Google Analytics";
    let propertyId = "";
    try {
      const properties = await ga4Client.listProperties();
      if (properties.length > 0) {
        accountName = properties[0].displayName;
        propertyId = properties[0].name.replace("properties/", "");
      }
    } catch {
      // Continue with defaults
    }

    // Get user's primary store
    const adminSupabase = createAdminClient();
    const { data: store } = await adminSupabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!store) {
      return NextResponse.redirect(
        `${siteUrl}/settings?tab=integrations&error=no_store`
      );
    }

    // Store in integration_connections
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await adminSupabase.from("integration_connections").upsert(
      {
        store_id: store.id,
        platform: "ga4",
        account_id: propertyId,
        account_name: accountName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        config: { property_id: propertyId },
        status: "active",
      },
      { onConflict: "store_id,platform" }
    );

    return NextResponse.redirect(
      `${siteUrl}/settings?tab=integrations&success=ga4_connected`
    );
  } catch (err) {
    console.error("GA4 callback error:", err);
    return NextResponse.redirect(
      `${siteUrl}/settings?tab=integrations&error=ga4_callback_failed`
    );
  }
}
