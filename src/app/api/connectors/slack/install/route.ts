import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/connectors/slack/install
 * Redirect to Slack OAuth v2 authorization.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL!));
  }

  const clientId = process.env.SLACK_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/slack/callback`;
  const scopes = "channels:read,chat:write,groups:read";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: user.id,
  });

  return NextResponse.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
}
