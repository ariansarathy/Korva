import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KlaviyoClient } from "@/lib/connectors/klaviyo";

/**
 * POST /api/connectors/klaviyo/sync
 * Push customer segments (at_risk, churned, vip) to Klaviyo lists.
 * Body: { storeId: string }
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

    const { storeId } = await request.json();

    const adminSupabase = createAdminClient();
    const { data: connection } = await adminSupabase
      .from("integration_connections")
      .select("*")
      .eq("store_id", storeId)
      .eq("platform", "klaviyo")
      .eq("status", "active")
      .single();

    if (!connection?.access_token) {
      return NextResponse.json(
        { error: "No active Klaviyo connection" },
        { status: 404 }
      );
    }

    const client = new KlaviyoClient({
      apiKey: connection.access_token,
    });

    const segmentsToSync = ["at_risk", "churned", "vip"] as const;
    const results: Record<string, number> = {};

    for (const segment of segmentsToSync) {
      // Fetch customers in this segment (with email_hash)
      const { data: customers } = await adminSupabase
        .from("customers")
        .select("email_hash, first_name, last_name, lifetime_value, order_count")
        .eq("store_id", storeId)
        .eq("segment", segment)
        .not("email_hash", "is", null)
        .limit(500);

      if (!customers || customers.length === 0) {
        results[segment] = 0;
        continue;
      }

      // Create or find list
      const listName = `Korva - ${segment.replace("_", " ").toUpperCase()}`;
      const listId = await client.createOrUpdateList(listName);

      // Add profiles (using email_hash as identifier placeholder)
      const profiles = customers.map((c) => ({
        email: `${c.email_hash}@placeholder.korva.ai`, // Placeholder - real emails should be stored
        properties: {
          segment,
          lifetime_value: c.lifetime_value,
          order_count: c.order_count,
          first_name: c.first_name,
          last_name: c.last_name,
        },
      }));

      await client.addProfilesToList(listId, profiles);
      results[segment] = customers.length;
    }

    // Update last synced
    await adminSupabase
      .from("integration_connections")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", connection.id);

    return NextResponse.json({
      success: true,
      stats: results,
    });
  } catch (error) {
    console.error("Klaviyo sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
