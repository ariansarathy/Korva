import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MetaAdsClient } from "@/lib/connectors/meta-ads";
import { mapMetaCampaignInsight } from "@/lib/connectors/meta-ads-mappers";
import { GoogleAdsClient } from "@/lib/connectors/google-ads";
import { mapGoogleCampaignMetric } from "@/lib/connectors/google-ads-mappers";
import { TikTokAdsClient } from "@/lib/connectors/tiktok-ads";
import { mapTikTokInsight } from "@/lib/connectors/tiktok-ads-mappers";

/**
 * POST /api/cron/ad-sync
 * Protected by CRON_SECRET. Daily sync of all active ad connections.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Get all active ad connections
    const { data: connections } = await adminSupabase
      .from("ad_connections")
      .select("*")
      .eq("status", "active");

    if (!connections || connections.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    // Sync last 7 days by default for daily cron
    const until = new Date().toISOString().split("T")[0];
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let processed = 0;
    let errors = 0;

    for (const connection of connections) {
      try {
        if (connection.platform === "meta") {
          const client = new MetaAdsClient({
            accessToken: connection.access_token,
            accountId: connection.account_id,
          });

          for await (const insights of client.fetchCampaignInsights({ since, until })) {
            const records = insights.map((i) =>
              mapMetaCampaignInsight(i, connection.store_id)
            );
            if (records.length > 0) {
              await adminSupabase
                .from("ad_spend")
                .upsert(records, { onConflict: "store_id,campaign_id,date" });
            }
          }
        } else if (connection.platform === "google") {
          const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
          if (!developerToken) continue;

          const client = new GoogleAdsClient({
            accessToken: connection.access_token,
            refreshToken: connection.refresh_token ?? "",
            customerId: connection.account_id,
            developerToken,
          });

          for await (const metrics of client.fetchCampaignMetrics({ since, until })) {
            const records = metrics.map((m) =>
              mapGoogleCampaignMetric(m, connection.store_id)
            );
            if (records.length > 0) {
              await adminSupabase
                .from("ad_spend")
                .upsert(records, { onConflict: "store_id,campaign_id,date" });
            }
          }

          // Update access token if refreshed
          const newToken = client.getAccessToken();
          if (newToken !== connection.access_token) {
            await adminSupabase
              .from("ad_connections")
              .update({ access_token: newToken })
              .eq("id", connection.id);
          }
        } else if (connection.platform === "tiktok") {
          const client = new TikTokAdsClient({
            accessToken: connection.access_token,
            advertiserId: connection.account_id,
          });

          for await (const insights of client.fetchCampaignInsights({ start: since, end: until })) {
            const records = insights.map((i) =>
              mapTikTokInsight(i, connection.store_id)
            );
            if (records.length > 0) {
              await adminSupabase
                .from("ad_spend")
                .upsert(records, { onConflict: "store_id,campaign_id,date" });
            }
          }
        }

        // Update last_synced_at
        await adminSupabase
          .from("ad_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connection.id);

        processed++;
      } catch (err) {
        console.error(`Ad sync failed for connection ${connection.id}:`, err);

        // Mark as expired if token issue
        if (err instanceof Error && err.message.includes("token")) {
          await adminSupabase
            .from("ad_connections")
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
    console.error("Cron ad-sync error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
