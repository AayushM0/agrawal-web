/**
 * Isolated Twilio Telecom Service Provider
 * Kept isolated and controlled by TWILIO_ENABLED flag for future enablement.
 */

export interface SendSmsResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  messageSid?: string;
}

export async function sendTwilioSms(phone: string, text: string): Promise<SendSmsResult> {
  // Feature flag isolation: only runs if explicitly activated
  const isEnabled = process.env.TWILIO_ENABLED === "true";
  if (!isEnabled) {
    return { sent: false, skipped: true };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.replace(/['"]/g, "").trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.replace(/['"]/g, "").trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.replace(/['"]/g, "").trim();

  if (!sid || !token || !from) {
    console.warn("[TWILIO SMS SKIP] Missing or incomplete Twilio configuration in environment variables:", {
      hasSid: !!sid,
      hasToken: !!token,
      hasFrom: !!from,
    });
    return { sent: false, skipped: true, error: "Missing configuration" };
  }

  if (!phone) {
    console.warn("[TWILIO SMS SKIP] Recipient phone number is empty.");
    return { sent: false, skipped: true, error: "Empty phone number" };
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      Body: text,
      From: from,
      To: phone,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[TWILIO SMS ERROR]", err);
      return { sent: false, error: JSON.stringify(err) };
    }

    const data = await res.json().catch(() => ({}));
    return { sent: true, messageSid: data?.sid };
  } catch (e: any) {
    console.error("SMS failed:", e);
    return { sent: false, error: e?.message || "SMS failed" };
  }
}
