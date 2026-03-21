import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GA4Client } from "@/lib/connectors/ga4";
import { mapGA4TrafficSource } from "@/lib/connectors/ga4-mappers";

/**
 * POST /api/cron/ga4-sync
 * Daily cron to sync GA4 traffic source data for all active connections.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Get all active GA4 connections
    const { data: connections } = await adminSupabase
      .from("integration_connections")
      .select("*")
      .eq("platform", "ga4")
      .eq("status", "active");

    if (!connections || connections.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    // Sync last 7 days
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let processed = 0;
    let errors = 0;

    for (const connection of connections) {
      try {
        const config = (connection.config as Record<string, string>) ?? {};
        const propertyId = config.property_id ?? connection.account_id;

        if (!propertyId) {
          console.warn(`GA4 connection ${connection.id} has no property_id`);
          continue;
        }

        const client = new GA4Client({
          accessToken: connection.access_token,
          refreshToken: connection.refresh_token ?? "",
        });

        const rows = await client.fetchTrafficSources(propertyId, {
          start,
          end,
        });

        const mapped = rows.map((r) =>
          mapGA4TrafficSource(r, connection.store_id)
        );

        if (mapped.length > 0) {
          for (let i = 0; i < mapped.length; i += 500) {
            const batch = mapped.slice(i, i + 500);
            await adminSupabase.from("traffic_sources").upsert(batch, {
              onConflict: "store_id,source,medium,campaign,date",
            });
          }
        }

        // Update token if refreshed
        const newToken = client.getAccessToken();
        if (newToken !== connection.access_token) {
          await adminSupabase
            .from("integration_connections")
            .update({ access_token: newToken })
            .eq("id", connection.id);
        }

        processed++;
      } catch (err) {
        console.error(`GA4 sync failed for connection ${connection.id}:`, err);

        // Mark as expired if token issue
        if (err instanceof Error && err.message.includes("token")) {
          await adminSupabase
            .from("integration_connections")
            .update({ status: "expired" })
            .eq("id", connection.id);
        }

        errors++;
      }
    }

    return NextResponse.json({
      processed,
      errors,
      total: connections.length,
    });
  } catch (error) {
    console.error("GA4 cron sync error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
