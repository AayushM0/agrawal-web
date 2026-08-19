'use server';

import crypto from "crypto";
import twilio from "twilio";

interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-Memory OTP Store with TTL (can be backed by Redis in production)
const otpStore = new Map<string, StoredOtp>();

// Initialize Twilio client if credentials are configured
let twilioClient: twilio.Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export interface SendOtpInput {
  recipient: string; // phone number (+91... or 9876543210) or email
  type?: "sms" | "whatsapp" | "email";
}

function normalizePhoneNumber(input: string): string {
  let cleaned = input.trim().replace(/[\s\-\(\)]/g, "");
  if (!cleaned.startsWith("+")) {
    // If entered as 10 digits without country code, default to India (+91)
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

export async function sendOtp(input: SendOtpInput) {
  let normalized = input.recipient.trim();
  const isPhone = !normalized.includes("@");

  if (isPhone) {
    normalized = normalizePhoneNumber(normalized);
  } else {
    normalized = normalized.toLowerCase();
  }

  if (!normalized || normalized.length < 6) {
    return { success: false, error: "Please provide a valid mobile number or email address." };
  }

  // Generate 6-digit cryptographic numeric OTP
  const generatedCode = crypto.randomInt(100000, 999999).toString();

  // 10 minutes expiry TTL
  const expiresAt = Date.now() + 10 * 60 * 1000;

  otpStore.set(normalized, {
    code: generatedCode,
    expiresAt,
    attempts: 0,
  });

  // 1. Dispatch via Twilio WhatsApp if configured
  if (isPhone && twilioClient && process.env.TWILIO_WHATSAPP_FROM) {
    try {
      const whatsappTo = `whatsapp:${normalized}`;
      const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

      console.log(`[TWILIO WHATSAPP] Sending OTP to ${whatsappTo} from ${whatsappFrom}...`);

      const msg = await twilioClient.messages.create({
        body: `Your Global Agrawal Directory verification code is: *${generatedCode}*.\n\nValid for 10 minutes.\n- Maharaja Agrasen Foundation Limited`,
        from: whatsappFrom,
        to: whatsappTo,
      });

      console.log(`[TWILIO WHATSAPP SUCCESS] Message SID: ${msg.sid} | Status: ${msg.status}`);

      return {
        success: true,
        message: `A 6-digit verification passcode has been sent to your WhatsApp (${normalized}).`,
        demoHint: generatedCode,
      };
    } catch (err: any) {
      console.error("[TWILIO WHATSAPP ERROR]", err?.message || err);
      // If WhatsApp dispatch fails (e.g. sandbox join code needed), return helpful message
      return {
        success: true,
        message: `OTP generated: ${generatedCode}. (Twilio note: make sure your number joined the Twilio WhatsApp sandbox).`,
        demoHint: generatedCode,
      };
    }
  }

  // 2. Dev / Fallback mode
  console.log(`[DEV OTP DISPATCH] Sent OTP ${generatedCode} to ${normalized} (Valid for 10 mins)`);
  return {
    success: true,
    message: `Verification code sent to ${normalized}.`,
    demoHint: generatedCode,
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
  const record = otpStore.get(normalized);

  // Fallback demo support for default 123456 in dev
  if (process.env.NODE_ENV !== "production" && enteredOtp === "123456") {
    return { success: true, message: "Verification successful!" };
  }

  if (!record) {
    return { success: false, error: "No active verification request found. Please request a new OTP." };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalized);
    return { success: false, error: "Verification code has expired. Please request a fresh OTP." };
  }

  if (record.attempts >= 5) {
    otpStore.delete(normalized);
    return { success: false, error: "Too many failed attempts. Please request a fresh OTP." };
  }

  if (record.code !== enteredOtp) {
    record.attempts += 1;
    return { success: false, error: `Invalid verification code. (${5 - record.attempts} attempts remaining)` };
  }

  // Verification succeeded - clear OTP
  otpStore.delete(normalized);

  return {
    success: true,
    verifiedAt: new Date().toISOString(),
    message: "Identity verified successfully.",
  };
}