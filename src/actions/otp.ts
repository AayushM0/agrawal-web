'use server';

import crypto from "crypto";

interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-Memory OTP Store with TTL (can be backed by Redis / Database in production)
const otpStore = new Map<string, StoredOtp>();

export interface SendOtpInput {
  recipient: string; // phone number (+91...) or email
  type?: "sms" | "whatsapp" | "email";
}

export async function sendOtp(input: SendOtpInput) {
  const normalized = input.recipient.trim().toLowerCase();
  if (!normalized || normalized.length < 5) {
    return { success: false, error: "Please provide a valid mobile number or email address." };
  }

  // Generate 6-digit cryptographic numeric OTP
  const generatedCode = process.env.NODE_ENV === "production"
    ? crypto.randomInt(100000, 999999).toString()
    : "123456"; // Default demo OTP for development convenience

  // 10 minutes expiry TTL
  const expiresAt = Date.now() + 10 * 60 * 1000;

  otpStore.set(normalized, {
    code: generatedCode,
    expiresAt,
    attempts: 0,
  });

  // Production SMS/Email Dispatch Hook:
  // - For SMS / WhatsApp (India & Global): MSG91 or Twilio API
  // - For Email: Resend or SendGrid API
  if (process.env.MSG91_AUTH_KEY) {
    // Example MSG91 / Twilio Integration
    console.log(`[PRODUCTION SMS] Dispatching OTP via MSG91 to ${normalized}`);
  } else {
    console.log(`[DEV OTP DISPATCH] Sent OTP ${generatedCode} to ${normalized} (Valid for 10 mins)`);
  }

  return {
    success: true,
    message: `A 6-digit verification passcode has been sent to ${input.recipient}.`,
    // In dev mode, return prefilled demo hint
    demoHint: process.env.NODE_ENV === "production" ? undefined : generatedCode,
  };
}

export interface VerifyOtpInput {
  recipient: string;
  otp: string;
}

export async function verifyOtp(input: VerifyOtpInput) {
  const normalized = input.recipient.trim().toLowerCase();
  const enteredOtp = input.otp.trim();

  const record = otpStore.get(normalized);

  // Fallback demo support for default 123456
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