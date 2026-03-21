import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/connectors/tiktok/install
 * Redirects to TikTok Business Center OAuth.
 */
export async function GET(request: NextRequest) {
  const appId = process.env.TIKTOK_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "TikTok Ads not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/connectors/tiktok/callback`;
  const state = crypto.randomUUID();

  const authUrl = new URL("https://business-api.tiktok.com/portal/auth");
  authUrl.searchParams.set("app_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
