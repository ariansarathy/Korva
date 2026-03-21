import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKPIs, getTopProducts, getRevenueTrend } from "@/lib/utils/queries";
import { renderWeeklyDigestEmail } from "@/lib/notifications/templates";
import { sendEmail } from "@/lib/email/resend";

/**
 * POST /api/cron/weekly-reports
 * Sends weekly performance digests to users who opted in.
 * Runs every Monday at 9am (see vercel.json).
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  try {
    // Find all users who have weekly_report enabled
    const { data: preferences } = await adminSupabase
      .from("notification_preferences")
      .select("user_id, store_id, email_enabled")
      .eq("weekly_report", true);

    if (!preferences || preferences.length === 0) {
      return NextResponse.json({ sent: 0, message: "No subscribers" });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const pref of preferences) {
      try {
        // Skip if email is not enabled
        if (!pref.email_enabled) continue;

        // Get the user's email
        const { data: profile } = await adminSupabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", pref.user_id)
          .single();

        if (!profile?.email) continue;

        // Get the store
        const storeId = pref.store_id;
        if (!storeId) continue;

        const { data: store } = await adminSupabase
          .from("stores")
          .select("id, name")
          .eq("id", storeId)
          .single();

        if (!store) continue;

        // Gather weekly metrics
        const [kpis, topProducts, revenueTrend] = await Promise.all([
          getKPIs(store.id, "7d"),
          getTopProducts(store.id, "7d"),
          getRevenueTrend(store.id, "7d"),
        ]);

        // Render email
        const html = renderWeeklyDigestEmail(store.name, {
          totalRevenue: kpis.totalRevenue,
          revenueChange: kpis.revenueChange,
          totalOrders: kpis.totalOrders,
          ordersChange: kpis.ordersChange,
          avgOrderValue: kpis.avgOrderValue,
          aovChange: kpis.aovChange,
        });

        // Send email
        await sendEmail({
          to: profile.email,
          subject: `Weekly Performance Report - ${store.name}`,
          html,
        });

        // Log notification
        await adminSupabase.from("notification_log").insert({
          user_id: pref.user_id,
          store_id: store.id,
          channel: "email",
          type: "weekly_digest",
          subject: `Weekly Performance Report - ${store.name}`,
          status: "sent",
          metadata: { recipientEmail: profile.email },
        });

        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`User ${pref.user_id}: ${msg}`);
      }
    }

    return NextResponse.json({
      sent,
      total: preferences.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Weekly reports cron error:", error);
    return NextResponse.json(
      { error: "Failed to send weekly reports" },
      { status: 500 }
    );
  }
}
