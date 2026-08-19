export interface Msg91SendParams {
  phone: string;
  otp: string;
  templateId?: string;
}

export async function sendDomesticSmsMsg91(params: Msg91SendParams) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = params.templateId || process.env.MSG91_OTP_TEMPLATE_ID || "AGRAWAL_OTP_DLT";

  if (!authKey) {
    console.log(`[DEV MODE - MSG91] OTP ${params.otp} dispatched to ${params.phone}`);
    return { success: true, mode: "dev_simulation" };
  }

  try {
    const response = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": authKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile: params.phone.replace("+", ""),
        otp: params.otp,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error("[MSG91 Error]", error);
    return { success: false, error: "Failed to dispatch SMS via MSG91" };
  }
}