import dns from "node:dns";

// Enforce IPv4 DNS resolution for all Node.js Undici fetch requests
// Prevents Cloudflare IPv6 timeouts (UND_ERR_CONNECT_TIMEOUT) on systems with incomplete IPv6 routing.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (_) {}

let lastDispatchTimestamp = 0;
const MIN_DISPATCH_INTERVAL_MS = 650;

/** Enforce minimum 650ms gap between outbound emails to strictly comply with Resend 2 req/sec rate limit */
export async function waitForRateLimitPacing(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastDispatchTimestamp;
  if (elapsed < MIN_DISPATCH_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DISPATCH_INTERVAL_MS - elapsed));
  }
  lastDispatchTimestamp = Date.now();
}

export interface ResendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
  }>;
}

export interface DispatchResendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
  retryable?: boolean;
}

/**
 * Centrally managed Resend email dispatcher with IPv4 DNS, rate-limit pacing, and timeout guard.
 */
export async function dispatchResendEmail(payload: ResendEmailPayload): Promise<DispatchResendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured", retryable: false };
  }

  await waitForRateLimitPacing();

  try {
    const from =
      payload.from ||
      process.env.RESEND_FROM_EMAIL ||
      "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
        attachments: payload.attachments,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const statusCode = res.status;
      const isRetryable = statusCode === 429 || statusCode >= 500;
      return {
        success: false,
        statusCode,
        error: data?.message || `Resend API error (${statusCode})`,
        retryable: isRetryable,
      };
    }

    return {
      success: true,
      messageId: data?.id,
      statusCode: res.status,
    };
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      success: false,
      error: isTimeout ? "Resend request timed out after 15s" : err?.message || "Network error sending email",
      retryable: true,
    };
  }
}

/** HTML-escape user content before interpolating into email HTML to prevent injection. */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface SendMessageRequestEmailInput {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  senderGotra?: string | null;
  senderCity?: string | null;
  messagePreview: string;
  conversationId: string;
}

/**
 * Dispatch an email notification to a recipient when a community member sends them a first-turn message request.
 * Dispatches via Resend API using native fetch and non-blocking error handling.
 */
export async function sendMessageRequestNotificationEmail(input: SendMessageRequestEmailInput): Promise<{
  success: boolean;
  error?: string;
  simulated?: boolean;
}> {
  try {
    const cleanEmail = input.recipientEmail?.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
      return { success: false, error: "Invalid recipient email address" };
    }

    // Strip newlines to prevent email header injection (VULN-006)
    const senderName = (input.senderName?.trim() || "A Community Member").replace(/[\r\n]/g, " ");
    const recipientName = (input.recipientName?.trim() || "Valued Member").replace(/[\r\n]/g, " ");
    const senderGotra = input.senderGotra ? `Gotra: ${input.senderGotra}` : "";
    const senderLocation = input.senderCity ? `Location: ${input.senderCity}` : "";
    const senderMeta = [senderGotra, senderLocation].filter(Boolean).join(" • ");
    const cleanPreview = input.messagePreview?.trim() || "Sent you a connection request note.";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maharajaagrasenfoundation.com";
    const chatUrl = `${appUrl}/dashboard/messages?conv=${encodeURIComponent(input.conversationId)}`;

    if (!process.env.RESEND_API_KEY) {
      console.warn(
        `[EMAIL DEV NOTICE] RESEND_API_KEY not configured. Simulated message request email to ${cleanEmail} from ${senderName}`
      );
      return { success: true, simulated: true };
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message Request</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #faf6f0; color: #2a1810;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #ebd8be; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(217, 83, 30, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #d9531e 0%, #b83f12 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
                Maharaja Agrasen Foundation
              </h1>
              <p style="color: #fde08b; margin: 6px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Community Directory & Matrimony
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <p style="font-size: 15px; margin: 0 0 16px 0; color: #422b22;">
                Namaste <b>${escHtml(recipientName)}</b>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; color: #422b22;">
                You have received a new connection message request from <b>${escHtml(senderName)}</b>${senderMeta ? ` (${escHtml(senderMeta)})` : ""}:
              </p>

              <div style="background-color: #fffdfa; border-left: 4px solid #d9531e; border-top: 1px solid #f2e4d0; border-right: 1px solid #f2e4d0; border-bottom: 1px solid #f2e4d0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; font-style: italic; color: #5a3d31; line-height: 1.6;">
                  &ldquo;${escHtml(cleanPreview)}&rdquo;
                </p>
              </div>

              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${chatUrl}" target="_blank" style="background-color: #d9531e; color: #ffffff; display: inline-block; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(217, 83, 30, 0.25);">
                  View Request & Respond &rarr;
                </a>
              </div>

              <div style="background-color: #fcf8f2; border: 1px solid #f0dfc8; border-radius: 12px; padding: 14px 18px; margin-top: 24px;">
                <p style="margin: 0; font-size: 12px; color: #7a5e52; line-height: 1.5;">
                  🔒 <b>Your Privacy is Protected:</b> Your mobile number, personal email, and residential address remain strictly private. The sender can only see what you choose to share after you accept this request. You can accept, decline, or block this request at any time.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fdfaf7; border-top: 1px solid #f0dfc8; padding: 20px; text-align: center;">
              <p style="font-size: 11px; color: #8e7266; margin: 0;">
                Maharaja Agrasen Foundation Limited Singapore &bull; One Community &bull; One Platform
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const result = await dispatchResendEmail({
      to: cleanEmail,
      subject: `New Message Request from ${senderName} on Maharaja Agrasen Foundation`,
      text: `Namaste ${recipientName},\n\nYou have received a new connection request from ${senderName}${senderMeta ? ` (${senderMeta})` : ""}.\n\nMessage preview:\n"${cleanPreview}"\n\nLog in to your dashboard to view and respond:\n${chatUrl}\n\nYour contact details remain strictly hidden until you choose to accept.`,
      html: emailHtml,
    });

    if (!result.success) {
      console.warn("[RESEND EMAIL WARNING] Unable to dispatch message request notification:", result.error);
      return { success: false, error: result.error || "Failed to dispatch via Resend API" };
    }

    return { success: true };
  } catch (err: any) {
    console.warn("[MESSAGE REQUEST EMAIL NON-FATAL ERROR]:", err?.message || err);
    return { success: false, error: err?.message || "Internal error sending email" };
  }
}
