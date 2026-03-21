import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/connectors/tiktok/callback
 * Handles TikTok OAuth callback, exchanges auth code for access token.
 */
export async function GET(request: NextRequest) {
  try {
    const authCode = request.nextUrl.searchParams.get("auth_code");
    if (!authCode) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=missing_auth_code`
      );
    }

    const appId = process.env.TIKTOK_APP_ID;
    const appSecret = process.env.TIKTOK_APP_SECRET;
    if (!appId || !appSecret) {
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

    // Exchange auth code for access token
    const tokenRes = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: appId,
          secret: appSecret,
          auth_code: authCode,
        }),
      }
    );

    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=token_exchange_failed`
      );
    }

    const accessToken = tokenData.data.access_token;
    const advertiserId = tokenData.data.advertiser_ids?.[0] ?? "";

    // Get user's first store
    const adminSupabase = createAdminClient();
    const { data: store } = await adminSupabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!store) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?error=no_store`
      );
    }

    // Store in ad_connections
    await adminSupabase.from("ad_connections").upsert(
      {
        store_id: store.id,
        platform: "tiktok",
        account_id: advertiserId,
        account_name: `TikTok Ads (${advertiserId})`,
        access_token: accessToken,
        status: "active",
      },
      { onConflict: "store_id,platform" }
    );

    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?tab=stores`
    );
  } catch (err) {
    console.error("TikTok callback error:", err);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?error=callback_failed`
    );
  }
}
