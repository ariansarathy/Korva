import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.korva.app";

/**
 * GET /api/connectors/meta/callback
 * Handles Meta OAuth callback — exchanges code for long-lived token.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=meta_oauth_failed`
      );
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=meta_not_configured`
      );
    }

    // Exchange code for short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", `${APP_URL}/api/connectors/meta/callback`);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=meta_token_exchange`
      );
    }

    const { access_token: shortToken } = await tokenRes.json();

    // Exchange for long-lived token
    const longTokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
    longTokenUrl.searchParams.set("client_id", appId);
    longTokenUrl.searchParams.set("client_secret", appSecret);
    longTokenUrl.searchParams.set("fb_exchange_token", shortToken);

    const longTokenRes = await fetch(longTokenUrl.toString());
    const longTokenData = await longTokenRes.json();
    const longLivedToken = longTokenData.access_token ?? shortToken;
    const expiresIn = longTokenData.expires_in ?? 5184000; // 60 days default

    // Get ad accounts
    const accountsUrl = new URL("https://graph.facebook.com/v19.0/me/adaccounts");
    accountsUrl.searchParams.set("access_token", longLivedToken);
    accountsUrl.searchParams.set("fields", "id,name");

    const accountsRes = await fetch(accountsUrl.toString());
    const accountsData = await accountsRes.json();
    const firstAccount = accountsData.data?.[0];

    if (!firstAccount) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=meta_no_ad_account`
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

    // Create ad connection
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await supabase.from("ad_connections").insert({
      store_id: store.id,
      platform: "meta",
      account_id: firstAccount.id,
      account_name: firstAccount.name,
      access_token: longLivedToken,
      token_expires_at: tokenExpiresAt,
      status: "active",
    });

    return NextResponse.redirect(`${APP_URL}/settings?ad_connected=meta`);
  } catch {
    return NextResponse.redirect(
      `${APP_URL}/settings?error=meta_callback_failed`
    );
  }
}
