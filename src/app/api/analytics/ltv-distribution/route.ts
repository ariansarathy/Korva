import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { isDemoMode, DEMO_LTV } from "@/lib/demo";

const BUCKETS = [
  { range: "$0–50", min: 0, max: 50 },
  { range: "$50–100", min: 50, max: 100 },
  { range: "$100–250", min: 100, max: 250 },
  { range: "$250–500", min: 250, max: 500 },
  { range: "$500–1K", min: 500, max: 1000 },
  { range: "$1K+", min: 1000, max: Infinity },
];

/**
 * GET /api/analytics/ltv-distribution
 * Returns customer LTV histogram with bucket counts and summary statistics.
 */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json(DEMO_LTV);
  }

  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId || !store) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: customers, error } = await supabase
      .from("customers")
      .select("lifetime_value")
      .eq("store_id", store.id)
      .order("lifetime_value", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 }
      );
    }

    const values = (customers ?? []).map((c) => c.lifetime_value);
    const total = values.length;

    if (total === 0) {
      return NextResponse.json({
        buckets: BUCKETS.map((b) => ({ ...b, count: 0, pct: 0 })),
        stats: { median: 0, mean: 0, p75: 0, p90: 0, total_customers: 0 },
      });
    }

    // Bucket counts
    const buckets = BUCKETS.map((bucket) => {
      const count = values.filter(
        (v) => v >= bucket.min && v < bucket.max
      ).length;
      return {
        ...bucket,
        count,
        pct: Math.round((count / total) * 100),
      };
    });

    // Statistics
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = Math.round((sum / total) * 100) / 100;
    const median = total % 2 === 0
      ? Math.round(((values[total / 2 - 1] + values[total / 2]) / 2) * 100) / 100
      : Math.round(values[Math.floor(total / 2)] * 100) / 100;
    const p75 = Math.round(values[Math.floor(total * 0.75)] * 100) / 100;
    const p90 = Math.round(values[Math.floor(total * 0.9)] * 100) / 100;

    return NextResponse.json({
      buckets,
      stats: { median, mean, p75, p90, total_customers: total },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
