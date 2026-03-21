import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/connectors/slack/callback
 * Slack OAuth v2 callback — exchanges code for bot token.
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

    // Exchange code for bot token
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: `${siteUrl}/api/connectors/slack/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error("Slack OAuth error:", tokenData.error);
      return NextResponse.redirect(
        `${siteUrl}/settings?tab=integrations&error=slack_token_failed`
      );
    }

    const botToken = tokenData.access_token;
    const teamName = tokenData.team?.name ?? "Slack Workspace";
    const teamId = tokenData.team?.id ?? "";

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
    await adminSupabase.from("integration_connections").upsert(
      {
        store_id: store.id,
        platform: "slack",
        account_id: teamId,
        account_name: teamName,
        access_token: botToken,
        refresh_token: null,
        token_expires_at: null,
        config: {
          team_id: teamId,
          team_name: teamName,
          bot_user_id: tokenData.bot_user_id ?? null,
          channel_id: null,
          channel_name: null,
        },
        status: "active",
      },
      { onConflict: "store_id,platform" }
    );

    return NextResponse.redirect(
      `${siteUrl}/settings?tab=integrations&success=slack_connected`
    );
  } catch (err) {
    console.error("Slack callback error:", err);
    return NextResponse.redirect(
      `${siteUrl}/settings?tab=integrations&error=slack_callback_failed`
    );
  }
}
