import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserStore } from "@/lib/utils/auth";
import { sendEmail } from "@/lib/email/resend";
import { renderReportEmail } from "@/lib/reports/templates";
import { REPORT_TYPE_TITLES } from "@/lib/reports/prompts";
import type { ReportType } from "@/lib/supabase/types";

/**
 * POST /api/reports/send
 * Body: { reportId: string, recipients?: string[] }
 * Renders a completed report as HTML email and sends via Resend.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, store } = await getCurrentUserStore();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!store) {
      return NextResponse.json(
        { error: "No store connected." },
        { status: 400 }
      );
    }

    const { reportId, recipients } = await request.json();

    if (!reportId) {
      return NextResponse.json(
        { error: "reportId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the report
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .eq("store_id", store.id)
      .single();

    if (fetchError || !report) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }

    if (report.status !== "completed") {
      return NextResponse.json(
        { error: "Report is not completed yet." },
        { status: 400 }
      );
    }

    // Get user email as default recipient
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const defaultRecipient = user?.email;
    const toAddresses: string[] =
      recipients && recipients.length > 0
        ? recipients
        : defaultRecipient
          ? [defaultRecipient]
          : [];

    if (toAddresses.length === 0) {
      return NextResponse.json(
        { error: "No recipients specified." },
        { status: 400 }
      );
    }

    // Render HTML email
    const reportType = report.type as ReportType;
    const reportData = report.data as Record<string, unknown>;
    const html = renderReportEmail(reportData, reportType, store.name);
    const title = REPORT_TYPE_TITLES[reportType] ?? "Report";
    const subject = `${title} — ${store.name}`;

    // Send email
    const emailId = await sendEmail({
      to: toAddresses,
      subject,
      html,
    });

    // Update report html_content
    await supabase
      .from("reports")
      .update({ html_content: html })
      .eq("id", reportId);

    // Log notification
    await supabase.from("notification_log").insert({
      user_id: userId,
      store_id: store.id,
      channel: "email",
      type: "report",
      subject,
      status: "sent",
      metadata: {
        report_id: reportId,
        report_type: reportType,
        email_id: emailId,
        recipients: toAddresses,
      },
    });

    return NextResponse.json({
      success: true,
      emailId,
      recipients: toAddresses,
    });
  } catch (error) {
    console.error("Report send error:", error);
    return NextResponse.json(
      { error: "Failed to send report." },
      { status: 500 }
    );
  }
}
