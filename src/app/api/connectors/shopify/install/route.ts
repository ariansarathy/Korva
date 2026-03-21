import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

/**
 * GET /api/connectors/shopify/install?shop=mystore.myshopify.com
 * Initiates the Shopify OAuth flow by redirecting to Shopify's authorization page.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = request.nextUrl.searchParams.get("shop");
    if (!shop) {
      return NextResponse.json(
        { error: "Missing 'shop' parameter (e.g. mystore.myshopify.com)" },
        { status: 400 }
      );
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!clientId || !appUrl) {
      return NextResponse.json(
        { error: "Shopify credentials not configured" },
        { status: 500 }
      );
    }

    // Sanitize shop domain
    const shopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!shopDomain.endsWith(".myshopify.com")) {
      return NextResponse.json(
        { error: "Invalid Shopify domain. Must be yourstore.myshopify.com" },
        { status: 400 }
      );
    }

    // Generate nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString("hex");

    // Store nonce in cookie for verification on callback
    const redirectUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
    redirectUrl.searchParams.set("client_id", clientId);
    redirectUrl.searchParams.set("scope", "read_products,read_orders,read_customers");
    redirectUrl.searchParams.set("redirect_uri", `${appUrl}/api/connectors/shopify/callback`);
    redirectUrl.searchParams.set("state", nonce);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.set("shopify_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    response.cookies.set("shopify_oauth_shop", shopDomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Shopify install error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Shopify connection" },
      { status: 500 }
    );
  }
}
