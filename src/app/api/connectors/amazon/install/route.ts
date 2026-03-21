import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/connectors/amazon/install
 * Redirects to Login with Amazon (LWA) authorization URL.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.AMAZON_SP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Amazon SP-API not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/connectors/amazon/callback`;

  const authUrl = new URL("https://sellercentral.amazon.com/apps/authorize/consent");
  authUrl.searchParams.set("application_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("version", "beta");

  return NextResponse.redirect(authUrl.toString());
}
