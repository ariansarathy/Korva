import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { MetaAdsClient } from "@/lib/connectors/meta-ads";
import { mapMetaCampaignInsight } from "@/lib/connectors/meta-ads-mappers";
import { GoogleAdsClient } from "@/lib/connectors/google-ads";
import { mapGoogleCampaignMetric } from "@/lib/connectors/google-ads-mappers";

/**
 * POST /api/connectors/ads/sync
 * Body: { connectionId: string, days?: number }
 * Triggers an ad data sync for a specific ad connection.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectionId, days = 30 } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the ad connection
    const { data: connection, error: connError } = await supabase
      .from("ad_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("store_id", store.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "Ad connection not found" },
        { status: 404 }
      );
    }

    // Calculate date range
    const until = new Date().toISOString().split("T")[0];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let recordsUpserted = 0;

    if (connection.platform === "meta") {
      const client = new MetaAdsClient({
        accessToken: connection.access_token,
        accountId: connection.account_id,
      });

      for await (const insights of client.fetchCampaignInsights({ since, until })) {
        const records = insights.map((i) => mapMetaCampaignInsight(i, store.id));

        if (records.length > 0) {
          await supabase
            .from("ad_spend")
            .upsert(records, { onConflict: "store_id,campaign_id,date" });
          recordsUpserted += records.length;
        }
      }
    } else if (connection.platform === "google") {
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      if (!developerToken) {
        return NextResponse.json(
          { error: "Google Ads developer token not configured" },
          { status: 500 }
        );
      }

      const client = new GoogleAdsClient({
        accessToken: connection.access_token,
        refreshToken: connection.refresh_token ?? "",
        customerId: connection.account_id,
        developerToken,
      });

      for await (const metrics of client.fetchCampaignMetrics({ since, until })) {
        const records = metrics.map((m) => mapGoogleCampaignMetric(m, store.id));

        if (records.length > 0) {
          await supabase
            .from("ad_spend")
            .upsert(records, { onConflict: "store_id,campaign_id,date" });
          recordsUpserted += records.length;
        }
      }

      // Update access token if it was refreshed
      const newToken = client.getAccessToken();
      if (newToken !== connection.access_token) {
        await supabase
          .from("ad_connections")
          .update({ access_token: newToken })
          .eq("id", connectionId);
      }
    }

    // Update last_synced_at
    await supabase
      .from("ad_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connectionId);

    return NextResponse.json({
      success: true,
      records: recordsUpserted,
      dateRange: { since, until },
    });
  } catch (error) {
    console.error("Ad sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync ad data" },
      { status: 500 }
    );
  }
}
