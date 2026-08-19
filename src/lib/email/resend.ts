export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendTransactionalEmail(params: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || "Maharaja Agrasen Foundation <no-reply@agrawal-directory.org>";

  if (!apiKey) {
    console.log(`[DEV MODE - Resend] Email to ${params.to} | Subject: ${params.subject}`);
    return { success: true, mode: "dev_simulation" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error("[Resend Error]", error);
    return { success: false, error: "Failed to dispatch email via Resend" };
  }
}