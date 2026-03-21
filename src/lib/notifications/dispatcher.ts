import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { sendSlackMessage, type SlackMessage } from "./slack";

export interface NotificationPayload {
  type: "anomaly_alert" | "inventory_alert" | "weekly_digest" | "report";
  subject: string;
  emailHtml: string;
  slackMessage?: SlackMessage;
}

/**
 * Send a notification to a user via their preferred channels.
 * Uses admin client since this often runs in cron/background context
 * where there is no authenticated user session.
 */
export async function sendNotification(
  userId: string,
  storeId: string,
  payload: NotificationPayload
): Promise<void> {
  const supabase = createAdminClient();

  // Fetch user's notification preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Default: email enabled, slack disabled
  const emailEnabled = prefs?.email_enabled ?? true;
  const slackEnabled = prefs?.slack_enabled ?? false;
  const slackWebhookUrl = prefs?.slack_webhook_url;

  // Check per-type preferences
  let typeEnabled = true;
  if (prefs) {
    switch (payload.type) {
      case "anomaly_alert":
        typeEnabled = prefs.anomaly_alerts;
        break;
      case "inventory_alert":
        typeEnabled = prefs.inventory_alerts;
        break;
      case "weekly_digest":
        typeEnabled = prefs.weekly_report;
        break;
      case "report":
        typeEnabled = true; // Always send explicitly triggered reports
        break;
    }
  }

  if (!typeEnabled) return;

  // Get user email from profiles table (works in cron context, unlike auth.getUser)
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  const userEmail = profile?.email;

  // Send email
  if (emailEnabled && userEmail) {
    try {
      await sendEmail({
        to: userEmail,
        subject: payload.subject,
        html: payload.emailHtml,
      });

      await supabase.from("notification_log").insert({
        user_id: userId,
        store_id: storeId,
        channel: "email",
        type: payload.type,
        subject: payload.subject,
        status: "sent",
        metadata: { recipient: userEmail },
      });
    } catch (err) {
      console.error("Email notification failed:", err);
      await supabase.from("notification_log").insert({
        user_id: userId,
        store_id: storeId,
        channel: "email",
        type: payload.type,
        subject: payload.subject,
        status: "failed",
        metadata: { error: err instanceof Error ? err.message : "Unknown error" },
      });
    }
  }

  // Send Slack
  if (slackEnabled && payload.slackMessage) {
    try {
      // Check for Slack OAuth connection first (preferred over webhook)
      const { data: slackConn } = await supabase
        .from("integration_connections")
        .select("access_token, config")
        .eq("store_id", storeId)
        .eq("platform", "slack")
        .eq("status", "active")
        .single();

      const slackConfig = slackConn?.config as Record<string, string> | null;
      const channelId = slackConfig?.channel_id;

      if (slackConn?.access_token && channelId) {
        // Use Slack Web API with OAuth bot token
        const blocks = buildSlackBlocks(payload.slackMessage);
        const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${slackConn.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: channelId,
            text: payload.slackMessage.fallbackText,
            blocks,
          }),
        });
        const slackData = await slackRes.json();
        if (!slackData.ok) {
          throw new Error(`Slack API error: ${slackData.error}`);
        }
      } else if (slackWebhookUrl) {
        // Fallback to legacy webhook
        await sendSlackMessage(slackWebhookUrl, payload.slackMessage);
      } else {
        // No Slack delivery method available
        return;
      }

      await supabase.from("notification_log").insert({
        user_id: userId,
        store_id: storeId,
        channel: "slack",
        type: payload.type,
        subject: payload.subject,
        status: "sent",
        metadata: {},
      });
    } catch (err) {
      console.error("Slack notification failed:", err);
      await supabase.from("notification_log").insert({
        user_id: userId,
        store_id: storeId,
        channel: "slack",
        type: payload.type,
        subject: payload.subject,
        status: "failed",
        metadata: { error: err instanceof Error ? err.message : "Unknown error" },
      });
    }
  }
}

/**
 * Build Slack Block Kit blocks from a SlackMessage for use with the Web API.
 */
function buildSlackBlocks(message: import("./slack").SlackMessage) {
  const severityEmoji: Record<string, string> = {
    info: ":information_source:",
    warning: ":warning:",
    critical: ":rotating_light:",
    success: ":white_check_mark:",
  };

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: message.title, emoji: true },
    },
    { type: "divider" },
  ];

  for (const section of message.sections) {
    const emoji = severityEmoji[section.type ?? "info"] ?? "";
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `${emoji} ${section.text}` },
    });
  }

  if (message.footer) {
    blocks.push(
      { type: "divider" },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: message.footer }],
      }
    );
  }

  return blocks;
}
