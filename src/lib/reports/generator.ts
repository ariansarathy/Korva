import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getKPIs, getTopProducts, getCustomerSegmentCounts, getTopCustomers, getRevenueTrend } from "@/lib/utils/queries";
import { REPORT_TYPE_PROMPTS, REPORT_TYPE_TITLES } from "./prompts";
import type { ReportType, Report } from "@/lib/supabase/types";

let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY environment variable");
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

/**
 * Gather all metrics needed for report generation.
 */
async function gatherMetrics(storeId: string, reportType: ReportType) {
  // Different report types need different data
  const [kpis30d, kpis7d, topProducts, segmentCounts, topCustomers, revenueTrend] =
    await Promise.all([
      getKPIs(storeId, "30d"),
      getKPIs(storeId, "7d"),
      getTopProducts(storeId, "30d", 10),
      getCustomerSegmentCounts(storeId),
      getTopCustomers(storeId, 10),
      getRevenueTrend(storeId, "30d"),
    ]);

  // Build context based on report type
  switch (reportType) {
    case "weekly_performance":
      return {
        period: "Last 7 days",
        kpis: kpis7d,
        top_products: topProducts.slice(0, 5),
        customer_segments: segmentCounts,
        revenue_trend: revenueTrend.slice(-7),
      };

    case "monthly_deep_dive":
      return {
        period: "Last 30 days",
        kpis: kpis30d,
        top_products: topProducts,
        customer_segments: segmentCounts,
        top_customers: topCustomers,
        revenue_trend: revenueTrend,
      };

    case "product_performance":
      return {
        period: "Last 30 days",
        kpis: { totalRevenue: kpis30d.totalRevenue, totalOrders: kpis30d.totalOrders },
        top_products: topProducts,
        revenue_trend: revenueTrend,
      };

    case "customer_insights":
      return {
        period: "Last 30 days",
        kpis: { totalCustomers: kpis30d.totalCustomers, customersChange: kpis30d.customersChange },
        customer_segments: segmentCounts,
        top_customers: topCustomers,
      };

    default:
      return {
        period: "Last 30 days",
        kpis: kpis30d,
        top_products: topProducts,
        customer_segments: segmentCounts,
      };
  }
}

/**
 * Generate a report for the given store.
 * Creates a report record, calls Claude for analysis, and updates the record.
 */
export async function generateReport(
  storeId: string,
  reportType: ReportType,
  userId: string
): Promise<Report> {
  const supabase = await createClient();
  const title = REPORT_TYPE_TITLES[reportType] ?? "Report";

  // Create initial report record with pending status
  const { data: report, error: insertError } = await supabase
    .from("reports")
    .insert({
      store_id: storeId,
      user_id: userId,
      type: reportType,
      title,
      status: "generating",
      data: {},
    })
    .select()
    .single();

  if (insertError || !report) {
    throw new Error(`Failed to create report: ${insertError?.message}`);
  }

  try {
    // Gather metrics
    const metrics = await gatherMetrics(storeId, reportType);

    // Call Claude
    const systemPrompt = REPORT_TYPE_PROMPTS[reportType];
    if (!systemPrompt) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here are the current metrics for the store:\n\n${JSON.stringify(metrics, null, 2)}\n\nGenerate the report.`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON — handle markdown code blocks
    let jsonStr = textContent.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const reportData = JSON.parse(jsonStr) as Record<string, unknown>;

    // Update report with data
    const { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update({
        data: reportData,
        status: "completed",
        generated_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    return updatedReport as unknown as Report;
  } catch (error) {
    // Mark report as failed
    await supabase
      .from("reports")
      .update({ status: "failed" })
      .eq("id", report.id);

    throw error;
  }
}
