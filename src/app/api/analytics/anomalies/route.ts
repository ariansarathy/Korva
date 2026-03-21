import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";

/**
 * GET /api/analytics/anomalies
 * Returns recent anomalies for the user's store.
 */
export async function GET() {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: anomalies } = await supabase
      .from("anomalies")
      .select("*")
      .eq("store_id", store.id)
      .order("detected_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ anomalies: anomalies ?? [] });
  } catch (error) {
    console.error("Anomalies fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch anomalies" },
      { status: 500 }
    );
  }
}
