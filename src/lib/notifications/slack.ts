/**
 * Send a message to a Slack channel via incoming webhook.
 * Uses Slack Block Kit formatting for rich messages.
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<void> {
  const blocks = buildBlocks(message);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: message.fallbackText,
      blocks,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${text}`);
  }
}

export interface SlackMessage {
  title: string;
  fallbackText: string;
  sections: Array<{
    text: string;
    type?: "info" | "warning" | "critical" | "success";
  }>;
  footer?: string;
}

function buildBlocks(message: SlackMessage) {
  const severityEmoji: Record<string, string> = {
    info: ":information_source:",
    warning: ":warning:",
    critical: ":rotating_light:",
    success: ":white_check_mark:",
  };

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: message.title,
        emoji: true,
      },
    },
    { type: "divider" },
  ];

  for (const section of message.sections) {
    const emoji = severityEmoji[section.type ?? "info"] ?? "";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} ${section.text}`,
      },
    });
  }

  if (message.footer) {
    blocks.push(
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: message.footer,
          },
        ],
      }
    );
  }

  return blocks;
}
