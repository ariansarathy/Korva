import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email via Resend.
 * Returns the email ID on success, throws on failure.
 */
export async function sendEmail(options: SendEmailOptions): Promise<string> {
  const resend = getResend();

  const fromAddress =
    options.from || process.env.EMAIL_FROM || "Korva <reports@korva.app>";

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    replyTo: options.replyTo,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data?.id ?? "unknown";
}
