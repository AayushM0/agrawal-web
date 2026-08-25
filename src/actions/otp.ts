'use server';

import { cookies } from "next/headers";
import crypto from "crypto";
import { normalizePhoneNumber } from "@/lib/phone";

function getSecret() {
  if (!process.env.AUTH_SECRET) throw new Error("Missing AUTH_SECRET environment variable");
  return process.env.AUTH_SECRET;
}

function signOtpChallenge(recipient: string, code: string, expiresAt: number, attempts: number = 0): string {
  const payload = `${recipient}|${code}|${expiresAt}|${attempts}`;
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}|${signature}`;
}

function verifyOtpChallenge(token: string) {
  const parts = token.split("|");
  if (parts.length !== 5) return null;
  const [recipient, code, expiresAtStr, attemptsStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  const attempts = parseInt(attemptsStr, 10);
  
  if (Date.now() > expiresAt) return null;
  
  const payload = `${recipient}|${code}|${expiresAt}|${attempts}`;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  
  if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))) {
    return null;
  }
  
  return { recipient, code, expiresAt, attempts, signature };
}

export interface SendOtpInput {
  recipient: string;
  type?: string;
}

// Simple in-memory rate limiter (resets on server restart)
const rateLimits = new Map<string, { count: number, expires: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let record = rateLimits.get(key);
  if (!record || now > record.expires) {
    record = { count: 0, expires: now + windowMs };
  }
  record.count += 1;
  rateLimits.set(key, record);
  return record.count <= limit;
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

  if (!checkRateLimit(`send_${normalized}`, 3, 15 * 60 * 1000)) {
    return { success: false, error: "Too many OTP requests. Please wait 15 minutes before trying again." };
  }

  // 1. Dispatch via EMAIL (Resend via fetch)
  if (!isPhone && process.env.RESEND_API_KEY) {
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

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Maharaja Agrasen Foundation <onboarding@resend.dev>",
          to: normalized,
          subject: `${generatedCode} is your Verification Code`,
          html: emailHtml,
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("[RESEND ERROR]", errorData);
        return { success: false, error: "Unable to dispatch email OTP" };
      }

      return { success: true, message: `A 6-digit verification passcode has been sent to your email (${normalized}).` };
    } catch (err: any) {
      console.error("[RESEND EMAIL ERROR]", err);
      return { success: false, error: "Failed to send email verification code." };
    }
  }

  // 2. Dispatch via Twilio Verify API (SMS)
  if (isPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID) {
    try {
      const cookieStore = await cookies();
      cookieStore.set("otp_challenge", `verify_api:${normalized}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      });

      const authHeader = "Basic " + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64");
      
      const res = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/Verifications`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ To: normalized, Channel: "sms" })
      });

      if (!res.ok) {
         const errorData = await res.json().catch(() => ({}));
         console.error("[TWILIO VERIFY ERROR]", errorData);
         return { success: false, error: "Failed to send SMS verification code via Twilio Verify." };
      }

      return { success: true, message: `A 6-digit verification passcode has been sent via SMS to ${normalized}.` };
    } catch (err: any) {
      console.error("[TWILIO VERIFY ERROR]", err);
      return { success: false, error: `Failed to send SMS verification code: ${err.message}` };
    }
  }

  // 3. Dispatch via Twilio Standard SMS Messages API
  if (isPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
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

      const authHeader = "Basic " + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64");
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER,
          To: normalized,
          Body: `Your Maharaja Agrasen Foundation verification passcode is: ${generatedCode}. Valid for 10 minutes.`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[TWILIO SMS ERROR]", errData);
        return { success: false, error: "Failed to deliver SMS via Twilio Messages API." };
      }

      return { success: true, message: `A 6-digit verification passcode has been sent via SMS to ${normalized}.` };
    } catch (err: any) {
      console.error("[TWILIO SMS ERROR]", err);
      return { success: false, error: `Failed to send SMS: ${err.message}` };
    }
  }

  // Fallback: When no SMS/Email credentials exist in hosting environment
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
  console.warn(
    `[OTP DEV FALLBACK] No gateway configured on this server for ${isPhone ? "phone" : "email"} (${normalized}). Ensure TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID or RESEND_API_KEY are configured in Vercel Environment Variables. Code: ${generatedCode}`
  );
  return { success: true, message: "A 6-digit verification passcode has been dispatched." };
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

  if (!checkRateLimit(`verify_${normalized}`, 5, 10 * 60 * 1000)) {
    return { success: false, error: "Too many failed attempts. Please request a new OTP." };
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
    
    try {
      const authHeader = "Basic " + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64");
      const res = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ To: normalized, Code: enteredOtp })
      });
      
      const check = await res.json();
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

  // Route: HMAC cookie verification
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

  cookieStore.delete("otp_challenge");
  return { success: true, verifiedAt: new Date().toISOString(), message: "Identity verified successfully." };
}
