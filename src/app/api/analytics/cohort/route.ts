import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode } from "@/lib/demo";

/**
 * GET /api/analytics/cohort
 * Returns cohort retention data for charts.
 */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ cohorts: [] });
  }

  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: snapshots } = await supabase
      .from("cohort_snapshots")
      .select("*")
      .eq("store_id", store.id)
      .order("cohort_month", { ascending: true })
      .order("months_since_first", { ascending: true });

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({ cohorts: [] });
    }

    // Group by cohort_month
    const cohortMap = new Map<
      string,
      Array<{
        months_after: number;
        customer_count: number;
        retention_rate: number;
        revenue: number;
      }>
    >();

    for (const s of snapshots) {
      const key = s.cohort_month;
      if (!cohortMap.has(key)) {
        cohortMap.set(key, []);
      }

      cohortMap.get(key)!.push({
        months_after: s.months_since_first,
        customer_count: s.customer_count,
        retention_rate: s.retention_rate ?? 0,
        revenue: s.revenue,
      });
    }

    const cohorts = Array.from(cohortMap.entries()).map(([month, data]) => ({
      cohort_month: month,
      total_customers: data[0]?.customer_count ?? 0,
      retention: data,
    }));

    return NextResponse.json({ cohorts });
  } catch (error) {
    console.error("Cohort analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cohort data" },
      { status: 500 }
    );
  }
}
