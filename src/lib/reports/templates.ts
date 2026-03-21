import type { ReportType } from "@/lib/supabase/types";
import { REPORT_TYPE_TITLES } from "./prompts";

/**
 * Render a report's structured JSON data into an inline-CSS HTML email.
 */
export function renderReportEmail(
  reportData: Record<string, unknown>,
  reportType: ReportType,
  storeName: string
): string {
  const title = REPORT_TYPE_TITLES[reportType] ?? "Report";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build sections based on report type
  let sectionsHtml = "";

  switch (reportType) {
    case "weekly_performance":
      sectionsHtml = renderWeeklyPerformance(reportData);
      break;
    case "monthly_deep_dive":
      sectionsHtml = renderMonthlyDeepDive(reportData);
      break;
    case "product_performance":
      sectionsHtml = renderProductPerformance(reportData);
      break;
    case "customer_insights":
      sectionsHtml = renderCustomerInsights(reportData);
      break;
    default:
      sectionsHtml = renderGenericReport(reportData);
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="600" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#18181b;border-radius:12px 12px 0 0;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Korva</h1>
              <p style="margin:8px 0 0;color:#a1a1aa;font-size:14px;">${escapeHtml(storeName)}</p>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 32px 16px;">
              <h2 style="margin:0;color:#18181b;font-size:20px;font-weight:700;">${escapeHtml(title)}</h2>
              <p style="margin:4px 0 0;color:#71717a;font-size:13px;">${escapeHtml(dateStr)}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background-color:#ffffff;padding:0 32px 32px;">
              ${sectionsHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;border-radius:0 0 12px 12px;padding:24px 32px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                Powered by <strong style="color:#71717a;">Korva</strong> &middot; AI-Powered E-Commerce Analytics
              </p>
              <p style="margin:8px 0 0;color:#a1a1aa;font-size:11px;">
                Manage your report preferences in <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.korva.app"}/settings" style="color:#6366f1;text-decoration:none;">Settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Section renderers ──────────────────────────────────────────

function renderWeeklyPerformance(data: Record<string, unknown>): string {
  const kpiCommentary = data.kpi_commentary as Record<string, string> | undefined;
  const recommendations = data.recommendations as string[] | undefined;

  return `
    ${sectionBlock("Summary", String(data.summary || ""))}
    ${kpiCommentary ? `
      ${kpiGrid([
        { label: "Revenue", value: kpiCommentary.revenue },
        { label: "Orders", value: kpiCommentary.orders },
        { label: "Avg Order Value", value: kpiCommentary.aov },
        { label: "Customers", value: kpiCommentary.customers },
      ])}
    ` : ""}
    ${sectionBlock("Top Performers", String(data.top_performers || ""))}
    ${sectionBlock("Areas of Concern", String(data.concerns || ""))}
    ${recommendations ? recommendationsList(recommendations) : ""}
  `;
}

function renderMonthlyDeepDive(data: Record<string, unknown>): string {
  const revenueAnalysis = data.revenue_analysis as Record<string, string> | undefined;
  const customerAnalysis = data.customer_analysis as Record<string, string> | undefined;
  const productAnalysis = data.product_analysis as Record<string, string> | undefined;
  const opportunities = data.growth_opportunities as string[] | undefined;
  const risks = data.risks as string[] | undefined;

  return `
    ${sectionBlock("Executive Summary", String(data.executive_summary || ""))}
    ${revenueAnalysis ? `
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">Revenue Analysis</h3>
        <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(revenueAnalysis.overview || "")}</p>
        <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(revenueAnalysis.trend || "")}</p>
        <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(revenueAnalysis.breakdown || "")}</p>
      </div>
    ` : ""}
    ${customerAnalysis ? `
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">Customer Analysis</h3>
        <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(customerAnalysis.segments || "")}</p>
        <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(customerAnalysis.retention || "")}</p>
        <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(customerAnalysis.lifetime_value || "")}</p>
      </div>
    ` : ""}
    ${productAnalysis ? `
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">Product Analysis</h3>
        <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(productAnalysis.top_products || "")}</p>
        <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(productAnalysis.inventory_health || "")}</p>
      </div>
    ` : ""}
    ${opportunities ? `
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">Growth Opportunities</h3>
        ${bulletList(opportunities)}
      </div>
    ` : ""}
    ${risks ? `
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">Risks</h3>
        ${bulletList(risks)}
      </div>
    ` : ""}
    ${sectionBlock("Next Month Focus", String(data.next_month_focus || ""))}
  `;
}

function renderProductPerformance(data: Record<string, unknown>): string {
  const topProducts = data.top_products as Array<{
    title: string;
    revenue: string;
    units: string;
    commentary: string;
  }> | undefined;
  const recommendations = data.recommendations as string[] | undefined;

  return `
    ${sectionBlock("Summary", String(data.summary || ""))}
    ${topProducts ? `
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">Top Products</h3>
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
          <tr style="background-color:#fafafa;">
            <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#71717a;border-bottom:1px solid #e4e4e7;">Product</td>
            <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#71717a;border-bottom:1px solid #e4e4e7;text-align:right;">Revenue</td>
            <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#71717a;border-bottom:1px solid #e4e4e7;text-align:right;">Units</td>
          </tr>
          ${topProducts.map(p => `
            <tr>
              <td style="padding:10px 12px;font-size:13px;color:#3f3f46;border-bottom:1px solid #f4f4f5;">${escapeHtml(p.title)}</td>
              <td style="padding:10px 12px;font-size:13px;color:#3f3f46;border-bottom:1px solid #f4f4f5;text-align:right;font-weight:600;">${escapeHtml(p.revenue)}</td>
              <td style="padding:10px 12px;font-size:13px;color:#3f3f46;border-bottom:1px solid #f4f4f5;text-align:right;">${escapeHtml(p.units)}</td>
            </tr>
          `).join("")}
        </table>
      </div>
    ` : ""}
    ${sectionBlock("Underperformers", String(data.underperformers || ""))}
    ${sectionBlock("Inventory Alerts", String(data.inventory_alerts || ""))}
    ${sectionBlock("Pricing Insights", String(data.pricing_insights || ""))}
    ${recommendations ? recommendationsList(recommendations) : ""}
  `;
}

function renderCustomerInsights(data: Record<string, unknown>): string {
  const segmentAnalysis = data.segment_analysis as Record<string, string> | undefined;
  const keyMetrics = data.key_metrics as Record<string, string> | undefined;
  const recommendations = data.recommendations as string[] | undefined;

  return `
    ${sectionBlock("Summary", String(data.summary || ""))}
    ${segmentAnalysis ? `
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">Segment Analysis</h3>
        ${Object.entries(segmentAnalysis).map(([segment, analysis]) => `
          <div style="margin-bottom:12px;padding:12px;background-color:#fafafa;border-radius:8px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6366f1;text-transform:uppercase;">${escapeHtml(segment)}</p>
            <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.5;">${escapeHtml(analysis)}</p>
          </div>
        `).join("")}
      </div>
    ` : ""}
    ${keyMetrics ? `
      ${kpiGrid([
        { label: "Avg Lifetime Value", value: keyMetrics.avg_lifetime_value || "" },
        { label: "Avg Orders", value: keyMetrics.avg_order_count || "" },
      ])}
      ${sectionBlock("Retention", keyMetrics.retention_insight || "")}
    ` : ""}
    ${sectionBlock("Top Customers", String(data.top_customers || ""))}
    ${recommendations ? recommendationsList(recommendations) : ""}
  `;
}

function renderGenericReport(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([key, value]) => {
      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      if (typeof value === "string") {
        return sectionBlock(label, value);
      }
      if (Array.isArray(value)) {
        return `
          <div style="margin-top:24px;">
            <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">${escapeHtml(label)}</h3>
            ${bulletList(value.map(String))}
          </div>
        `;
      }
      return "";
    })
    .join("");
}

// ─── HTML helpers ───────────────────────────────────────────────

function sectionBlock(title: string, content: string): string {
  if (!content) return "";
  return `
    <div style="margin-top:24px;">
      <h3 style="margin:0 0 8px;color:#18181b;font-size:15px;font-weight:600;">${escapeHtml(title)}</h3>
      <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.6;">${escapeHtml(content)}</p>
    </div>
  `;
}

function kpiGrid(items: { label: string; value: string }[]): string {
  const cells = items
    .map(
      (item) => `
    <td style="padding:16px;background-color:#fafafa;border-radius:8px;vertical-align:top;width:${Math.floor(100 / items.length)}%;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(item.label)}</p>
      <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.5;">${escapeHtml(item.value)}</p>
    </td>
  `
    )
    .join('<td style="width:8px;"></td>');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin-top:24px;">
      <tr>${cells}</tr>
    </table>
  `;
}

function bulletList(items: string[]): string {
  return items
    .map(
      (item) =>
        `<p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6;padding-left:16px;">&#8226; ${escapeHtml(item)}</p>`
    )
    .join("");
}

function recommendationsList(items: string[]): string {
  return `
    <div style="margin-top:24px;">
      <h3 style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">Recommendations</h3>
      ${items
        .map(
          (item, i) =>
            `<div style="margin-bottom:8px;padding:12px;background-color:#eef2ff;border-radius:8px;border-left:3px solid #6366f1;">
              <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.5;"><strong style="color:#4f46e5;">${i + 1}.</strong> ${escapeHtml(item)}</p>
            </div>`
        )
        .join("")}
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
