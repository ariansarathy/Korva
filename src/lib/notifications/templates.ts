import type { AnomalySeverity } from "@/lib/supabase/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.korva.app";

/**
 * Anomaly alert email template
 */
export function renderAnomalyAlertEmail(
  storeName: string,
  anomalies: Array<{
    metric: string;
    description: string;
    severity: AnomalySeverity;
    deviation_percent: number;
    actual_value: number;
    expected_value: number;
  }>
): string {
  const severityColors: Record<AnomalySeverity, string> = {
    info: "#3b82f6",
    warning: "#f59e0b",
    critical: "#ef4444",
  };

  const anomalyRows = anomalies
    .map((a) => {
      const color = severityColors[a.severity];
      const direction = a.deviation_percent > 0 ? "+" : "";
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #f4f4f5;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:8px;"></span>
            <strong style="color:#18181b;font-size:13px;">${escapeHtml(a.metric.replace(/_/g, " "))}</strong>
          </td>
          <td style="padding:12px;border-bottom:1px solid #f4f4f5;text-align:right;font-size:13px;color:${color};font-weight:600;">
            ${direction}${a.deviation_percent}%
          </td>
          <td style="padding:12px;border-bottom:1px solid #f4f4f5;font-size:12px;color:#71717a;">
            ${escapeHtml(a.description)}
          </td>
        </tr>
      `;
    })
    .join("");

  return wrapEmailTemplate(
    storeName,
    "Anomaly Alert",
    `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;">
      We detected unusual patterns in your store metrics that require attention.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <tr style="background-color:#fafafa;">
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;">Metric</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;text-align:right;">Change</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;">Details</td>
      </tr>
      ${anomalyRows}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="${APP_URL}/analytics" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">View Analytics</a>
    </div>
  `
  );
}

/**
 * Low inventory alert email template
 */
export function renderInventoryAlertEmail(
  storeName: string,
  products: Array<{
    title: string;
    inventory_qty: number;
    sku: string | null;
  }>
): string {
  const productRows = products
    .map(
      (p) => `
      <tr>
        <td style="padding:10px 12px;font-size:13px;color:#3f3f46;border-bottom:1px solid #f4f4f5;">${escapeHtml(p.title)}</td>
        <td style="padding:10px 12px;font-size:13px;color:#3f3f46;border-bottom:1px solid #f4f4f5;text-align:center;">${escapeHtml(p.sku || "—")}</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:600;color:${p.inventory_qty <= 0 ? "#ef4444" : "#f59e0b"};border-bottom:1px solid #f4f4f5;text-align:right;">
          ${p.inventory_qty} left
        </td>
      </tr>
    `
    )
    .join("");

  return wrapEmailTemplate(
    storeName,
    "Low Inventory Alert",
    `
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;">
      The following products are running low on stock and may need reordering.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <tr style="background-color:#fafafa;">
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;">Product</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;text-align:center;">SKU</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;text-align:right;">Stock</td>
      </tr>
      ${productRows}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="${APP_URL}/products" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">View Products</a>
    </div>
  `
  );
}

/**
 * Weekly digest email template
 */
export function renderWeeklyDigestEmail(
  storeName: string,
  kpis: {
    totalRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersChange: number;
    avgOrderValue: number;
    aovChange: number;
  }
): string {
  function formatChange(change: number): string {
    const color = change >= 0 ? "#16a34a" : "#ef4444";
    const arrow = change >= 0 ? "&#9650;" : "&#9660;";
    return `<span style="color:${color};font-size:12px;">${arrow} ${Math.abs(change)}%</span>`;
  }

  return wrapEmailTemplate(
    storeName,
    "Weekly Digest",
    `
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;">
      Here&rsquo;s a quick overview of how your store performed this week.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
      <tr>
        <td style="padding:16px;background:#fafafa;border-radius:8px;text-align:center;width:33%;">
          <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Revenue</p>
          <p style="margin:4px 0;font-size:20px;font-weight:700;color:#18181b;">$${kpis.totalRevenue.toLocaleString()}</p>
          ${formatChange(kpis.revenueChange)}
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#fafafa;border-radius:8px;text-align:center;width:33%;">
          <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Orders</p>
          <p style="margin:4px 0;font-size:20px;font-weight:700;color:#18181b;">${kpis.totalOrders.toLocaleString()}</p>
          ${formatChange(kpis.ordersChange)}
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#fafafa;border-radius:8px;text-align:center;width:33%;">
          <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">AOV</p>
          <p style="margin:4px 0;font-size:20px;font-weight:700;color:#18181b;">$${kpis.avgOrderValue.toFixed(2)}</p>
          ${formatChange(kpis.aovChange)}
        </td>
      </tr>
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">View Dashboard</a>
    </div>
  `
  );
}

// ─── Shared wrapper ─────────────────────────────────────────────

function wrapEmailTemplate(storeName: string, title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="600" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#18181b;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Korva</h1>
              <p style="margin:4px 0 0;color:#a1a1aa;font-size:12px;">${escapeHtml(storeName)}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:24px 32px 8px;">
              <h2 style="margin:0;color:#18181b;font-size:18px;font-weight:700;">${escapeHtml(title)}</h2>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:8px 32px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;">
                Powered by <strong style="color:#71717a;">Korva</strong> &middot;
                <a href="${APP_URL}/settings" style="color:#6366f1;text-decoration:none;">Manage notifications</a>
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
