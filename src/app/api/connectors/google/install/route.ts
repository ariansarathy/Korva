import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.korva.app";

/**
 * GET /api/connectors/google/install
 * Initiates Google OAuth flow with Ads API scopes.
 */
export async function GET() {
  try {
    await requireAuth();

    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "Google Ads client not configured" },
        { status: 500 }
      );
    }

    const redirectUri = `${APP_URL}/api/connectors/google/callback`;
    const scopes = ["https://www.googleapis.com/auth/adwords"];

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    return NextResponse.redirect(authUrl.toString());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
