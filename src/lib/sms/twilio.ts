export interface TwilioSendParams {
  phone: string;
  message: string;
}

export async function sendInternationalSmsTwilio(params: TwilioSendParams) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[DEV MODE - Twilio] Message to ${params.phone}: ${params.message}`);
    return { success: true, mode: "dev_simulation" };
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const formData = new URLSearchParams({
      To: params.phone,
      From: fromNumber,
      Body: params.message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error("[Twilio Error]", error);
    return { success: false, error: "Failed to dispatch international SMS via Twilio" };
  }
}