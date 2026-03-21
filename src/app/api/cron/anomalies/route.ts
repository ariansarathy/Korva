import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectAnomalies } from "@/lib/analytics/anomaly-detector";
import { sendNotification } from "@/lib/notifications/dispatcher";
import { renderAnomalyAlertEmail } from "@/lib/notifications/templates";

/**
 * POST /api/cron/anomalies
 * Protected by CRON_SECRET. Runs anomaly detection on all active stores.
 * Dispatches alerts to users with anomaly_alerts enabled.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Get all active stores
    const { data: stores } = await adminSupabase
      .from("stores")
      .select("id, user_id, name")
      .eq("sync_status", "synced");

    if (!stores || stores.length === 0) {
      return NextResponse.json({ processed: 0, anomalies: 0 });
    }

    let totalAnomalies = 0;
    let processed = 0;

    for (const store of stores) {
      try {
        const anomalies = await detectAnomalies(store.id);

        if (anomalies.length > 0) {
          totalAnomalies += anomalies.length;

          // Send notification
          const emailHtml = renderAnomalyAlertEmail(store.name, anomalies);

          await sendNotification(store.user_id, store.id, {
            type: "anomaly_alert",
            subject: `Anomaly Alert — ${store.name}`,
            emailHtml,
            slackMessage: {
              title: `🔔 Anomaly Alert — ${store.name}`,
              fallbackText: `${anomalies.length} anomaly(ies) detected in ${store.name}`,
              sections: anomalies.map((a) => ({
                text: `*${a.metric.replace(/_/g, " ")}*: ${a.description} (${a.deviation_percent > 0 ? "+" : ""}${a.deviation_percent}%)`,
                type: a.severity as "info" | "warning" | "critical",
              })),
              footer: "Korva Analytics • Manage alerts in Settings",
            },
          });
        }

        processed++;
      } catch (err) {
        console.error(`Anomaly detection failed for store ${store.id}:`, err);
      }
    }

    return NextResponse.json({
      processed,
      stores: stores.length,
      anomalies: totalAnomalies,
    });
  } catch (error) {
    console.error("Cron anomalies error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
