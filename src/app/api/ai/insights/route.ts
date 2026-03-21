import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { getKPIs, getTopProducts, getCustomerSegmentCounts } from "@/lib/utils/queries";
import { INSIGHT_GENERATION_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { InsightCategory, InsightSeverity } from "@/lib/supabase/types";

/**
 * POST /api/ai/insights
 * Body: { storeId: string }
 * Generates AI insights based on store metrics and saves them to the database.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId } = await request.json();
    const targetStoreId = storeId || store?.id;

    if (!targetStoreId) {
      return NextResponse.json(
        { error: "No store connected" },
        { status: 400 }
      );
    }

    // Fetch current metrics for context
    const [kpis30d, kpis7d, topProducts, segments] = await Promise.all([
      getKPIs(targetStoreId, "30d"),
      getKPIs(targetStoreId, "7d"),
      getTopProducts(targetStoreId, "30d", 10),
      getCustomerSegmentCounts(targetStoreId),
    ]);

    const metricsContext = `
Store metrics for insight generation:

Last 30 Days:
- Revenue: $${kpis30d.totalRevenue.toFixed(2)} (${kpis30d.revenueChange > 0 ? "+" : ""}${kpis30d.revenueChange}% vs previous period)
- Orders: ${kpis30d.totalOrders} (${kpis30d.ordersChange > 0 ? "+" : ""}${kpis30d.ordersChange}% vs previous period)
- Avg Order Value: $${kpis30d.avgOrderValue.toFixed(2)} (${kpis30d.aovChange > 0 ? "+" : ""}${kpis30d.aovChange}% vs previous period)
- Unique Customers: ${kpis30d.totalCustomers} (${kpis30d.customersChange > 0 ? "+" : ""}${kpis30d.customersChange}% vs previous period)

Last 7 Days:
- Revenue: $${kpis7d.totalRevenue.toFixed(2)} (${kpis7d.revenueChange > 0 ? "+" : ""}${kpis7d.revenueChange}% vs previous week)
- Orders: ${kpis7d.totalOrders}

Top Products (30d by revenue):
${topProducts.map((p, i) => `${i + 1}. ${p.title} — $${p.totalRevenue.toFixed(2)} (${p.unitsSold} units)`).join("\n")}

Customer Segments:
- New: ${segments.new}
- Active: ${segments.active}
- At Risk: ${segments.at_risk}
- Churned: ${segments.churned}
- VIP: ${segments.vip}
- Total: ${segments.total}
`.trim();

    // Generate insights via Claude
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: INSIGHT_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: metricsContext }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No insights generated" },
        { status: 500 }
      );
    }

    // Parse insights JSON
    let jsonStr = textContent.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let insights: Array<{
      title: string;
      body: string;
      category: string;
      severity: string;
      metric_value: string;
    }>;

    try {
      insights = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse insights" },
        { status: 500 }
      );
    }

    // Save insights to database (admin client — no INSERT RLS policy for insights)
    const adminSupabase = createAdminClient();
    const now = new Date().toISOString();

    const insightRecords = insights.map((insight) => ({
      store_id: targetStoreId as string,
      title: insight.title as string,
      body: insight.body as string,
      category: insight.category as InsightCategory,
      severity: insight.severity as InsightSeverity,
      metric_value: (insight.metric_value || null) as string | null,
      is_read: false,
      generated_at: now,
    }));

    const { data: saved, error: insertError } = await adminSupabase
      .from("insights")
      .insert(insightRecords)
      .select();

    if (insertError) {
      console.error("Failed to save insights:", insertError);
      return NextResponse.json(
        { error: "Failed to save insights" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      insights: saved,
      count: saved?.length ?? 0,
    });
  } catch (error) {
    console.error("Insight generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
