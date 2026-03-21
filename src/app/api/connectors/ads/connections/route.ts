import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/connectors/ads/connections
 * Returns all ad connections for the user's store.
 */
export async function GET() {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: connections } = await supabase
      .from("ad_connections")
      .select("id, platform, account_name, status, last_synced_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ connections: connections ?? [] });
  } catch (error) {
    console.error("Ad connections fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad connections" },
      { status: 500 }
    );
  }
}
