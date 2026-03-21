const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.korva.app";

/**
 * Team invite email HTML template.
 */
export function renderInviteEmail(
  inviterEmail: string,
  inviteToken: string,
  role: string
): string {
  const acceptUrl = `${APP_URL}/api/team/invite/accept?token=${inviteToken}`;

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
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px;text-align:center;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;font-weight:700;">You&rsquo;ve been invited!</h2>
              <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6;">
                <strong>${escapeHtml(inviterEmail)}</strong> has invited you to join their team on Korva as a <strong>${escapeHtml(role)}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#71717a;font-size:13px;">
                Korva is an AI-powered analytics platform for e-commerce stores.
              </p>
              <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;background-color:#6366f1;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
                Accept Invitation
              </a>
              <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;">
                If you didn&rsquo;t expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#fafafa;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;">
                Powered by <strong style="color:#71717a;">Korva</strong> &middot; AI-Powered E-Commerce Analytics
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
