import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TikTokAdsClient } from "@/lib/connectors/tiktok-ads";
import { mapTikTokInsight } from "@/lib/connectors/tiktok-ads-mappers";

/**
 * POST /api/connectors/tiktok/sync
 * Sync TikTok campaign insights to ad_spend table.
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

    const adminSupabase = createAdminClient();
    const { data: connection } = await adminSupabase
      .from("ad_connections")
      .select("*")
      .eq("store_id", storeId)
      .eq("platform", "tiktok")
      .eq("status", "active")
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "No active TikTok Ads connection" },
        { status: 404 }
      );
    }

    const client = new TikTokAdsClient({
      accessToken: connection.access_token,
      advertiserId: connection.account_id,
    });

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const dateRange = {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };

    let insightsSynced = 0;
    for await (const batch of client.fetchCampaignInsights(dateRange)) {
      const mapped = batch.map((i) => mapTikTokInsight(i, storeId));

      await adminSupabase.from("ad_spend").upsert(mapped, {
        onConflict: "store_id,campaign_id,platform,date",
      });

      insightsSynced += batch.length;
    }

    await adminSupabase
      .from("ad_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);

    return NextResponse.json({
      success: true,
      stats: { insights: insightsSynced },
    });
  } catch (error) {
    console.error("TikTok sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
