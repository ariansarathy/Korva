import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.korva.app";

/**
 * GET /api/connectors/meta/install
 * Initiates Meta OAuth flow with Marketing API permissions.
 */
export async function GET() {
  try {
    await requireAuth();

    const appId = process.env.META_APP_ID;
    if (!appId) {
      return NextResponse.json(
        { error: "Meta App ID not configured" },
        { status: 500 }
      );
    }

    const redirectUri = `${APP_URL}/api/connectors/meta/callback`;
    const scopes = ["ads_read", "ads_management", "business_management"];

    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes.join(","));
    authUrl.searchParams.set("response_type", "code");

    return NextResponse.redirect(authUrl.toString());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
