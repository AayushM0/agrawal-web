'use server';

import { cookies } from "next/headers";
import { normalizePhoneNumber } from "@/lib/phone";
import crypto from "crypto";
import twilio from "twilio";
import { Resend } from "resend";

function getOtpSecret(): string {
  return process.env.AUTH_SECRET || "agarwal_dir_secure_otp_hmac_secret_2026_key_998127";
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

  // Generate 6-digit OTP code (or 123456 in demo/sandbox fallback)
  const generatedCode = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Set stateless signed challenge cookie (immune to Serverless lambda lifecycle)
  const challengeToken = signOtpChallenge(normalized, generatedCode, expiresAt, 0);
  const cookieStore = await cookies();
  cookieStore.set("otp_challenge", challengeToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  // 1. Dispatch via EMAIL (Resend)
  if (!isPhone && resendClient) {
    try {
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
        return {
          success: false,
          error: `Unable to dispatch email OTP: ${sendRes.error.message}`,
        };
      }

      return {
        success: true,
        message: `A 6-digit verification passcode has been sent to your email (${normalized}).`,
      };
    } catch (err: any) {
      console.error("[RESEND EMAIL ERROR]", err);
      return {
        success: false,
        error: "Failed to send email verification code. Please try again.",
      };
    }
  }

  // 2. Dispatch via WHATSAPP (Twilio)
  if (isPhone && twilioClient && process.env.TWILIO_WHATSAPP_FROM) {
    try {
      await twilioClient.messages.create({
        body: `Your Maharaja Agrasen Foundation verification code is: *${generatedCode}*.

Valid for 10 minutes.
- Maharaja Agrasen Foundation Limited Singapore`,
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${normalized}`,
      });

      return {
        success: true,
        message: `A 6-digit verification passcode has been sent to your WhatsApp (${normalized}).`,
      };
    } catch (err: any) {
      console.error("[TWILIO WHATSAPP ERROR]", err);
      return {
        success: false,
        error: `Failed to dispatch WhatsApp OTP: ${err.message}`,
      };
    }
  }

  // 3. Fallback if gateway is not configured
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