import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WooCommerceClient } from "@/lib/connectors/woocommerce";

/**
 * POST /api/connectors/woocommerce/connect
 * Validates WooCommerce credentials and creates a store record.
 * Body: { url: string; consumerKey: string; consumerSecret: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, consumerKey, consumerSecret } = await request.json();

    if (!url || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: "URL, consumer key, and consumer secret are required" },
        { status: 400 }
      );
    }

    // Normalize URL
    let storeUrl = url.trim();
    if (!storeUrl.startsWith("http")) {
      storeUrl = `https://${storeUrl}`;
    }
    storeUrl = storeUrl.replace(/\/$/, "");

    // Validate credentials by calling the API
    const woo = new WooCommerceClient({
      url: storeUrl,
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
    });

    let storeInfo;
    try {
      storeInfo = await woo.getStoreInfo();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid credentials";
      return NextResponse.json(
        { error: `Failed to connect: ${message}` },
        { status: 400 }
      );
    }

    // Store credentials (consumer key as access_token, secret encoded with it)
    const adminSupabase = createAdminClient();
    const encodedCredentials = Buffer.from(
      `${consumerKey.trim()}:${consumerSecret.trim()}`
    ).toString("base64");

    const { data: store, error: insertError } = await adminSupabase
      .from("stores")
      .insert({
        user_id: user.id,
        platform: "woocommerce",
        name:
          storeInfo.environment?.site_url
            ?.replace(/^https?:\/\//, "")
            .replace(/\/$/, "") || storeUrl.replace(/^https?:\/\//, ""),
        url: storeUrl,
        access_token: encodedCredentials,
        currency: storeInfo.settings?.currency || "USD",
        timezone: "UTC",
        sync_status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to create store:", insertError);
      return NextResponse.json(
        { error: "Failed to save store connection" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      storeId: store.id,
      storeName: storeInfo.environment?.site_url || storeUrl,
    });
  } catch (error) {
    console.error("WooCommerce connect error:", error);
    return NextResponse.json(
      { error: "Failed to connect WooCommerce store" },
      { status: 500 }
    );
  }
}
