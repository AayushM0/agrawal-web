'use server';

import { cookies } from "next/headers";
import { normalizePhoneNumber } from "@/lib/phone";
import crypto from "crypto";
import twilio from "twilio";
import { Resend } from "resend";

function getOtpSecret(): string {
  if (!process.env.AUTH_SECRET) throw new Error("Missing AUTH_SECRET environment variable");
  return process.env.AUTH_SECRET;
}

function signOtpChallenge(recipient: string, code: string, expiresAt: number, attempts: number = 0): string {
  const payload = JSON.stringify({ recipient, code, expiresAt, attempts });
  const payloadB64 = Buffer.from(payload, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getOtpSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

function verifyOtpChallenge(token: string): { recipient: string; code: string; expiresAt: number; attempts: number } | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", getOtpSecret())
    .update(payloadB64)
    .digest("base64url");

  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expectedSignature);
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) return null;

  try {
    const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const data = JSON.parse(jsonStr);
    if (Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Initialize Resend Email client
let resendClient: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

export interface SendOtpInput {
  recipient: string;
  type?: "sms" | "whatsapp" | "email";
}

export async function sendOtp(input: SendOtpInput) {
  let normalized = input.recipient.trim();
  const isPhone = !normalized.includes("@");

  if (isPhone) {
    normalized = normalizePhoneNumber(normalized);
  } else {
    normalized = normalized.toLowerCase();
  }

  if (!normalized || normalized.length < 5) {
    return { success: false, error: "Please provide a valid mobile number or email address." };
  }

  // 1. Dispatch via EMAIL (Resend)
  if (!isPhone && resendClient) {
    try {
      // Generate code for email (Verify API is phone-only)
      const generatedCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const challengeToken = signOtpChallenge(normalized, generatedCode, expiresAt, 0);
      const cookieStore = await cookies();
      cookieStore.set("otp_challenge", challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      });

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #fffdf8; border: 1px solid #e69500; border-radius: 16px; padding: 24px; text-align: center;">
          <h2 style="color: #d9531e; margin-top: 0;">Maharaja Agrasen Foundation Limited Singapore</h2>
          <p style="font-size: 14px; color: #422b22;">Your verification passcode is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #d9531e; margin: 16px 0; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #fde08b;">
            ${generatedCode}
          </div>
          <p style="font-size: 12px; color: #7a5e52;">Valid for 10 minutes. Do not share with anyone.</p>
        </div>
      `;

      const sendRes = await resendClient.emails.send({
        from: "Maharaja Agrasen Foundation <onboarding@resend.dev>",
        to: normalized,
        subject: `${generatedCode} is your Verification Code`,
        html: emailHtml,
      });

      if (sendRes.error) {
        console.error("[RESEND ERROR]", sendRes.error);
        return { success: false, error: `Unable to dispatch email OTP: ${sendRes.error.message}` };
      }

      return {
        success: true,
        message: `A 6-digit verification passcode has been sent to your email (${normalized}).`,
      };
    } catch (err: any) {
      console.error("[RESEND EMAIL ERROR]", err);
      return { success: false, error: "Failed to send email verification code. Please try again." };
    }
  }

  // 2. Dispatch via Twilio Verify API (SMS) — works on any number, no sandbox opt-in
  if (isPhone && twilioClient && process.env.TWILIO_VERIFY_SERVICE_SID) {
    try {
      // Mark phone channel for Verify API — cookie stores normalized number for verify step
      const cookieStore = await cookies();
      // Store a sentinel so verifyOtp knows to use Verify API instead of cookie code
      cookieStore.set("otp_challenge", `verify_api:${normalized}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      });

      await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: normalized, channel: "sms" });

      return {
        success: true,
        message: `A 6-digit verification passcode has been sent via SMS to ${normalized}.`,
      };
    } catch (err: any) {
      console.error("[TWILIO VERIFY ERROR]", err);
      return {
        success: false,
        error: `Failed to send SMS verification code: ${err.message}`,
      };
    }
  }

  // 3. Fallback: WhatsApp sandbox (if Verify not configured)
  if (isPhone && twilioClient && process.env.TWILIO_WHATSAPP_FROM) {
    try {
      const generatedCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const challengeToken = signOtpChallenge(normalized, generatedCode, expiresAt, 0);
      const cookieStore = await cookies();
      cookieStore.set("otp_challenge", challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      });

      await twilioClient.messages.create({
        body: `Your Maharaja Agrasen Foundation verification code is: *${generatedCode}*.\n\nValid for 10 minutes.\n- Maharaja Agrasen Foundation Limited Singapore`,
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${normalized}`,
      });

      return {
        success: true,
        message: `A 6-digit verification passcode has been sent to your WhatsApp (${normalized}).`,
      };
    } catch (err: any) {
      console.error("[TWILIO WHATSAPP ERROR]", err);
      return { success: false, error: `Failed to dispatch OTP: ${err.message}` };
    }
  }

  // 4. No gateway configured — silent cookie fallback for dev
  const generatedCode = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const challengeToken = signOtpChallenge(normalized, generatedCode, expiresAt, 0);
  const cookieStore = await cookies();
  cookieStore.set("otp_challenge", challengeToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  console.warn("[OTP DEV FALLBACK] No gateway configured. Code:", generatedCode);
  return {
    success: true,
    message: "A 6-digit verification passcode has been dispatched.",
  };
}

export interface VerifyOtpInput {
  recipient: string;
  otp: string;
}

export async function verifyOtp(input: VerifyOtpInput) {
  let normalized = input.recipient.trim();
  const isPhone = !normalized.includes("@");

  if (isPhone) {
    normalized = normalizePhoneNumber(normalized);
  } else {
    normalized = normalized.toLowerCase();
  }

  const enteredOtp = input.otp.trim();

  const cookieStore = await cookies();
  const challengeCookie = cookieStore.get("otp_challenge")?.value;

  if (!challengeCookie) {
    return { success: false, error: "OTP expired or not requested. Please click Send OTP." };
  }

  // Route: Twilio Verify API check (phone OTP path)
  if (challengeCookie.startsWith("verify_api:")) {
    const expectedRecipient = challengeCookie.slice("verify_api:".length);
    if (expectedRecipient !== normalized) {
      return { success: false, error: "Contact details do not match the OTP request." };
    }
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      return { success: false, error: "Verification service not configured." };
    }
    try {
      const check = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: normalized, code: enteredOtp });

      if (check.status !== "approved") {
        return { success: false, error: "Invalid OTP code. Please check the SMS and try again." };
      }

      cookieStore.delete("otp_challenge");
      return { success: true, verifiedAt: new Date().toISOString(), message: "Identity verified successfully." };
    } catch (err: any) {
      console.error("[TWILIO VERIFY CHECK ERROR]", err);
      return { success: false, error: "Invalid or expired OTP code. Please request a new one." };
    }
  }

  // Route: HMAC cookie verification (email OTP or WhatsApp fallback path)
  const challenge = verifyOtpChallenge(challengeCookie);
  if (!challenge) {
    return { success: false, error: "Verification token expired. Please request a new OTP." };
  }

  if (challenge.recipient !== normalized) {
    return { success: false, error: "Contact details do not match the OTP request." };
  }

  if (challenge.code !== enteredOtp) {
    return { success: false, error: "Invalid OTP code. Please enter the exact 6-digit code received." };
  }

  // Clear challenge cookie upon success
  cookieStore.delete("otp_challenge");

  return {
    success: true,
    verifiedAt: new Date().toISOString(),
    message: "Identity verified successfully.",
  };
}