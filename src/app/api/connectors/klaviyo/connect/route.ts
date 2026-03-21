import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KlaviyoClient } from "@/lib/connectors/klaviyo";

/**
 * POST /api/connectors/klaviyo/connect
 * Accept private API key, verify, store in integration_connections.
 * Body: { storeId: string, apiKey: string }
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

    const { storeId, apiKey } = await request.json();
    if (!storeId || !apiKey) {
      return NextResponse.json(
        { error: "Missing storeId or apiKey" },
        { status: 400 }
      );
    }

    // Verify API key
    const client = new KlaviyoClient({ apiKey });
    const valid = await client.verify();
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid Klaviyo API key" },
        { status: 400 }
      );
    }

    // Store connection
    const adminSupabase = createAdminClient();
    await adminSupabase.from("integration_connections").upsert(
      {
        store_id: storeId,
        platform: "klaviyo",
        account_id: "klaviyo",
        account_name: "Klaviyo",
        access_token: apiKey, // In production, encrypt this
        status: "active",
        config: {},
      },
      { onConflict: "store_id,platform" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Klaviyo connect error:", error);
    return NextResponse.json(
      { error: "Connection failed" },
      { status: 500 }
    );
  }
}
