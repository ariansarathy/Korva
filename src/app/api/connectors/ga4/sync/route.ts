import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GA4Client } from "@/lib/connectors/ga4";
import { mapGA4TrafficSource } from "@/lib/connectors/ga4-mappers";

/**
 * POST /api/connectors/ga4/sync
 * Fetch GA4 traffic source data and upsert into traffic_sources table.
 * Body: { storeId: string, days?: number }
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

    const { storeId, days = 30 } = await request.json();
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Get GA4 integration connection
    const { data: connection } = await adminSupabase
      .from("integration_connections")
      .select("*")
      .eq("store_id", storeId)
      .eq("platform", "ga4")
      .eq("status", "active")
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "GA4 not connected" },
        { status: 404 }
      );
    }

    // Verify store ownership
    const { data: store } = await adminSupabase
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single();

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const ga4Client = new GA4Client({
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token ?? "",
    });

    const propertyId =
      (connection.config as Record<string, string>)?.property_id ??
      connection.account_id;

    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const rows = await ga4Client.fetchTrafficSources(propertyId, {
      start,
      end,
    });

    // Map and upsert
    const mapped = rows.map((r) => mapGA4TrafficSource(r, storeId));

    if (mapped.length > 0) {
      // Upsert in batches of 500
      for (let i = 0; i < mapped.length; i += 500) {
        const batch = mapped.slice(i, i + 500);
        await adminSupabase.from("traffic_sources").upsert(batch, {
          onConflict: "store_id,source,medium,campaign,date",
        });
      }
    }

    // Update token if refreshed
    const newToken = ga4Client.getAccessToken();
    if (newToken !== connection.access_token) {
      await adminSupabase
        .from("integration_connections")
        .update({ access_token: newToken })
        .eq("id", connection.id);
    }

    return NextResponse.json({
      success: true,
      rows_synced: mapped.length,
    });
  } catch (error) {
    console.error("GA4 sync error:", error);
    return NextResponse.json(
      { error: "GA4 sync failed" },
      { status: 500 }
    );
  }
}
