import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/connectors/ga4/install
 * Redirects to Google OAuth for GA4 Data API access.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL!));
  }

  const clientId = process.env.GA4_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/ga4/callback`;
  const scope = "https://www.googleapis.com/auth/analytics.readonly";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    state: user.id,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
