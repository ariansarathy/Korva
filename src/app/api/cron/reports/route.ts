import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReport } from "@/lib/reports/generator";
import { sendEmail } from "@/lib/email/resend";
import { renderReportEmail } from "@/lib/reports/templates";
import { REPORT_TYPE_TITLES } from "@/lib/reports/prompts";
import type { ReportType } from "@/lib/supabase/types";

/**
 * POST /api/cron/reports
 * Protected by CRON_SECRET header.
 * Processes due report schedules: generates reports, sends emails, updates next_send_at.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Find schedules that are due
    const { data: dueSchedules, error: fetchError } = await adminSupabase
      .from("report_schedules")
      .select("*, stores:store_id(name)")
      .eq("enabled", true)
      .lte("next_send_at", new Date().toISOString());

    if (fetchError) {
      console.error("Failed to fetch due schedules:", fetchError);
      return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;
    let errors = 0;

    for (const schedule of dueSchedules) {
      try {
        const reportType = schedule.report_type as ReportType;
        const storeRecord = schedule.stores as unknown as { name: string } | null;
        const storeName = storeRecord?.name ?? "Your Store";

        // Generate the report
        const report = await generateReport(
          schedule.store_id,
          reportType,
          schedule.user_id
        );

        // Render and send email to each recipient
        const reportData = report.data as Record<string, unknown>;
        const html = renderReportEmail(reportData, reportType, storeName);
        const title = REPORT_TYPE_TITLES[reportType] ?? "Report";
        const subject = `${title} — ${storeName}`;

        const recipients = (schedule.recipients as string[]) ?? [];

        if (recipients.length > 0) {
          await sendEmail({ to: recipients, subject, html });

          // Update report html_content
          await adminSupabase
            .from("reports")
            .update({ html_content: html })
            .eq("id", report.id);

          // Log notification
          await adminSupabase.from("notification_log").insert({
            user_id: schedule.user_id,
            store_id: schedule.store_id,
            channel: "email",
            type: "scheduled_report",
            subject,
            status: "sent",
            metadata: {
              report_id: report.id,
              schedule_id: schedule.id,
              recipients,
            },
          });
        }

        // Calculate and update next_send_at
        const nextSend = calculateNextSend(
          schedule.schedule,
          schedule.day_of_week,
          schedule.day_of_month
        );

        await adminSupabase
          .from("report_schedules")
          .update({
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSend,
          })
          .eq("id", schedule.id);

        processed++;
      } catch (err) {
        console.error(`Failed to process schedule ${schedule.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ processed, errors, total: dueSchedules.length });
  } catch (error) {
    console.error("Cron reports error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

function calculateNextSend(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null
): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly": {
      const targetDay = dayOfWeek ?? 1;
      next.setDate(next.getDate() + 7);
      // Adjust to correct day of week
      const diff = targetDay - next.getDay();
      next.setDate(next.getDate() + diff);
      break;
    }
    case "monthly": {
      const targetDate = dayOfMonth ?? 1;
      next.setMonth(next.getMonth() + 1);
      next.setDate(targetDate);
      break;
    }
  }

  return next.toISOString();
}
