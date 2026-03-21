import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShopifyClient } from "@/lib/connectors/shopify";

/**
 * GET /api/connectors/shopify/callback
 * Handles the OAuth callback from Shopify: exchanges code for token,
 * creates store record, registers webhooks.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const shop = request.nextUrl.searchParams.get("shop");

    if (!code || !state || !shop) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_params", request.url)
      );
    }

    // Verify nonce matches
    const savedNonce = request.cookies.get("shopify_oauth_nonce")?.value;
    if (!savedNonce || savedNonce !== state) {
      return NextResponse.redirect(
        new URL("/settings?error=invalid_state", request.url)
      );
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !clientSecret || !appUrl) {
      return NextResponse.redirect(
        new URL("/settings?error=config_missing", request.url)
      );
    }

    // Exchange code for access token
    const tokenRes = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(
        new URL("/settings?error=token_exchange", request.url)
      );
    }

    const { access_token } = await tokenRes.json();

    // Fetch shop info
    const shopifyClient = new ShopifyClient({
      shop,
      accessToken: access_token,
    });
    const shopInfo = await shopifyClient.getShopInfo();

    // Create store record using admin client (bypasses RLS for token storage)
    const adminSupabase = createAdminClient();

    // Check if store already connected
    const { data: existingStore } = await adminSupabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .eq("url", shop)
      .single();

    let storeId: string;

    if (existingStore) {
      // Update existing store
      await adminSupabase
        .from("stores")
        .update({
          access_token,
          name: shopInfo.name,
          currency: shopInfo.currency,
          timezone: shopInfo.iana_timezone,
          sync_status: "pending",
        })
        .eq("id", existingStore.id);
      storeId = existingStore.id;
    } else {
      // Create new store
      const { data: newStore, error: insertError } = await adminSupabase
        .from("stores")
        .insert({
          user_id: user.id,
          platform: "shopify",
          name: shopInfo.name,
          url: shop,
          currency: shopInfo.currency,
          timezone: shopInfo.iana_timezone,
          access_token,
          sync_status: "pending",
        })
        .select("id")
        .single();

      if (insertError || !newStore) {
        console.error("Store insert error:", insertError);
        return NextResponse.redirect(
          new URL("/settings?error=store_creation", request.url)
        );
      }
      storeId = newStore.id;
    }

    // Register webhooks
    const webhookTopics = [
      "orders/create",
      "orders/updated",
      "products/create",
      "products/update",
      "customers/create",
      "customers/update",
    ];

    for (const topic of webhookTopics) {
      try {
        await shopifyClient.createWebhook(
          topic,
          `${appUrl}/api/webhooks/shopify`
        );
      } catch (err) {
        // Webhook may already exist — log but don't fail
        console.warn(`Failed to create webhook ${topic}:`, err);
      }
    }

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL(`/onboarding?store=${storeId}&step=sync`, request.url)
    );
    response.cookies.delete("shopify_oauth_nonce");
    response.cookies.delete("shopify_oauth_shop");

    return response;
  } catch (error) {
    console.error("Shopify callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=callback_failed", request.url)
    );
  }
}
