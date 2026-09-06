'use server';

import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { normalizePhoneNumber } from "@/lib/phone";
import { db } from "@/lib/db";
import { verifyPassword, evaluateLockout, validatePassword, hashPassword } from "@/lib/auth-crypto";
import { sendOtp, verifyOtp } from "@/actions/otp";
import { getSession, createSession, clearSession, type SessionData } from "./session";

export { getSession, createSession, clearSession, type SessionData };

export async function verifyAdminPassword(password: string): Promise<{ success: boolean; error?: string }> {
  const reqHeaders = await headers();
  const forwardedFor = reqHeaders.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : reqHeaders.get("x-real-ip") || "127.0.0.1";

  // Check lockout
  const lockout = await db.checkAdminLockout(clientIp);
  if (lockout.locked) {
    return { success: false, error: lockout.error || "Account temporarily locked." };
  }

  const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
  if (!password || !masterPassword) {
    await db.recordAdminAttempt(clientIp, false);
    return { success: false, error: "Invalid admin credentials." };
  }

  const hashA = crypto.createHash("sha256").update(password).digest();
  const hashB = crypto.createHash("sha256").update(masterPassword).digest();

  const isMatch = crypto.timingSafeEqual(hashA, hashB);
  await db.recordAdminAttempt(clientIp, isMatch);

  if (!isMatch) {
    return { success: false, error: "Invalid admin master password." };
  }

  return { success: true };
}

export async function loginWithVerifiedContact(contact: string): Promise<{ success: boolean; role: "head" | "member"; error?: string }> {
  if (!contact || contact.trim().length < 5) {
    return { success: false, role: "head", error: "Valid contact required." };
  }

  const clean = contact.trim();
  const isPhone = !clean.includes("@");
  const canonicalContact = isPhone ? normalizePhoneNumber(clean) : clean.toLowerCase();

  try {
    const [member, household] = await Promise.all([
      db.getMemberByContact(canonicalContact),
      db.getHouseholdByContact(canonicalContact),
    ]);

    const effectiveUserId = member?.id || household?.id;
    if (!effectiveUserId) {
      return { success: false, role: "head", error: "No registered member found for this contact." };
    }

    const effectiveRole: "head" | "member" = member?.relationToHead === "self" || !member ? "head" : "member";
    const effectiveStatus = household?.status || "live";

    await createSession({
      userId: String(effectiveUserId),
      role: effectiveRole,
      contact: canonicalContact,
      householdStatus: effectiveStatus,
    });

    return { success: true, role: effectiveRole };
  } catch (err: any) {
    console.error("loginWithVerifiedContact error:", err);
    return { success: false, role: "head", error: err.message || "Failed to establish login session." };
  }
}

export async function checkLoginLockout(identifier: string, ip: string) {
  const attempts = await db.getRecentLoginAttempts(identifier, ip, 15);
  return evaluateLockout(attempts);
}

export async function loginWithPassword(params: {
  identifier: string;
  password: string;
}): Promise<{
  success: boolean;
  role?: "head" | "member";
  householdStatus?: string;
  needsActivation?: boolean;
  contact?: string;
  error?: string;
}> {
  const { identifier, password } = params;
  if (!identifier || !password) {
    return { success: false, error: "Please enter your email or mobile and password." };
  }

  const reqHeaders = await headers();
  const forwardedFor = reqHeaders.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : reqHeaders.get("x-real-ip") || "127.0.0.1";

  const clean = identifier.trim();
  const isEmail = clean.includes("@");
  const canonicalContact = isEmail ? clean.toLowerCase() : normalizePhoneNumber(clean);

  // 1. Concurrently check lockout and look up account to minimize cross-region latency
  const [lockout, member, household] = await Promise.all([
    checkLoginLockout(canonicalContact, clientIp),
    db.getMemberByContact(canonicalContact),
    db.getHouseholdByContact(canonicalContact),
  ]);

  if (lockout.locked) {
    return {
      success: false,
      error: `Too many failed login attempts. Account temporarily locked. Please try again in ${lockout.remainingMinutes || 15} minutes.`,
    };
  }

  try {

    const storedHash = member?.passwordHash || household?.passwordHash;

    // Detect unactivated accounts registered without upfront password
    if (!storedHash && (member || household)) {
      return {
        success: false,
        needsActivation: true,
        contact: canonicalContact,
        error: "Your account is pending activation. Please verify your contact with OTP and set your password to log in.",
      };
    }

    // OWASP Timing attack defense: if account does not exist or has no password hash, perform dummy compare
    const DUMMY_HASH = "$2a$12$e8k4Vv2wV9kF7Xh20z.GTuV9x8oD7Q9P4j8s5.Vv8A6p.12345678";
    const hashToVerify = storedHash || DUMMY_HASH;

    const isMatch = await verifyPassword(password, hashToVerify);

    if (!storedHash || !isMatch) {
      await db.recordLoginAttempt(canonicalContact, clientIp, false);
      return {
        success: false,
        error: "Invalid email or password.",
      };
    }

    // 3. Successful login
    await db.recordLoginAttempt(canonicalContact, clientIp, true);

    const effectiveUserId = member?.id || household?.id;
    const effectiveRole: "head" | "member" = member?.relationToHead === "self" || !member ? "head" : "member";
    const effectiveStatus = household?.status || member?.householdStatus || "live";

    await createSession({
      userId: String(effectiveUserId),
      role: effectiveRole,
      contact: canonicalContact,
      householdStatus: effectiveStatus,
      isActivated: true,
      hasPassword: true,
    });

    return {
      success: true,
      role: effectiveRole,
      householdStatus: effectiveStatus,
    };
  } catch (err: any) {
    console.error("loginWithPassword error:", err);
    return {
      success: false,
      error: "An error occurred during authentication. Please try again.",
    };
  }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; error?: string }> {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
    return { success: false, error: "Please enter a valid email address.", message: "" };
  }

  // 1. Account existence check
  const member = await db.getMemberByContact(cleanEmail);
  const household = await db.getHouseholdByContact(cleanEmail);

  // If account exists, send OTP via Resend
  if (member || household) {
    try {
      const otpRes = await sendOtp({ recipient: cleanEmail, type: "email" });
      if (!otpRes.success) {
        console.warn("requestPasswordReset sendOtp warning:", otpRes.error);
      }
    } catch (err) {
      console.error("requestPasswordReset sendOtp error:", err);
    }
  } else {
    // Mitigate timing side-channel: normalize network latency to prevent account enumeration
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 200));
  }

  // Anti-enumeration: Return generic success regardless of account existence
  return {
    success: true,
    message: "If an account exists with this email, a 6-digit verification code has been sent.",
  };
}

export async function resetPasswordWithOtp(params: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const { email, otp, newPassword } = params;
  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "A valid email address is required." };
  }

  // 1. Validate password complexity
  const passCheck = validatePassword(newPassword);
  if (!passCheck.valid) {
    return { success: false, error: passCheck.error || "Password does not meet complexity requirements." };
  }

  // 2. Verify OTP code (verifies 10-min HMAC challenge and invalidates cookie)
  const verifyRes = await verifyOtp({ recipient: cleanEmail, otp: otp?.trim() });
  if (!verifyRes.success) {
    return { success: false, error: verifyRes.error || "Invalid or expired verification code." };
  }

  // 3. Resolve user account
  const member = await db.getMemberByContact(cleanEmail);
  const household = await db.getHouseholdByContact(cleanEmail);

  if (!member && !household) {
    return { success: false, error: "No registered account found matching this email." };
  }

  // 4. Hash new password (cost factor 12)
  const newHash = await hashPassword(newPassword);

  // 5. Update database records
  if (household) {
    await db.updatePasswordHash("household", household.id, newHash);
  }
  if (member) {
    await db.updatePasswordHash("member", member.id, newHash);
    // Only update household credential if the member is the designated household head
    if (member.householdId && member.relationToHead === "self") {
      await db.updatePasswordHash("household", member.householdId, newHash);
    }
  }

  // 6. Establish fresh session automatically
  const effectiveUserId = member?.id || household?.id;
  const effectiveRole: "head" | "member" = member?.relationToHead === "self" || !member ? "head" : "member";
  const effectiveStatus = household?.status || member?.householdStatus || "live";

  await createSession({
    userId: String(effectiveUserId),
    role: effectiveRole,
    contact: cleanEmail,
    householdStatus: effectiveStatus,
  });

  return {
    success: true,
    message: "Your password has been successfully reset. You are now logged in.",
  };
}

export async function activateAccountWithOtp(params: {
  contact?: string;
  otp: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const { otp, newPassword } = params;
  const currentSession = await getSession();
  const rawContact = params.contact || currentSession?.contact;

  if (!rawContact || rawContact.trim().length < 5) {
    return { success: false, error: "Valid email address or mobile number required for activation." };
  }

  const clean = rawContact.trim();
  const isEmail = clean.includes("@");
  const canonicalContact = isEmail ? clean.toLowerCase() : normalizePhoneNumber(clean);

  // 1. Validate password complexity
  const passCheck = validatePassword(newPassword);
  if (!passCheck.valid) {
    return { success: false, error: passCheck.error || "Password does not meet complexity requirements." };
  }

  // 2. Verify OTP challenge
  const verifyRes = await verifyOtp({ recipient: canonicalContact, otp: otp?.trim() });
  if (!verifyRes.success) {
    return { success: false, error: verifyRes.error || "Invalid or expired verification code." };
  }

  // 3. Resolve user account
  const member = await db.getMemberByContact(canonicalContact);
  const household = await db.getHouseholdByContact(canonicalContact);

  if (!member && !household) {
    return { success: false, error: "No registered account found matching this contact." };
  }

  // 4. Hash new password (cost factor 12)
  const newHash = await hashPassword(newPassword);

  // 5. Update database records
  if (household) {
    await db.updatePasswordHash("household", household.id, newHash);
  }
  if (member) {
    await db.updatePasswordHash("member", member.id, newHash);
    if (member.householdId && member.relationToHead === "self") {
      await db.updatePasswordHash("household", member.householdId, newHash);
    }
  }

  // 6. Issue upgraded session with isActivated: true and hasPassword: true
  const effectiveUserId = member?.id || household?.id;
  const effectiveRole: "head" | "member" = member?.relationToHead === "self" || !member ? "head" : "member";
  const effectiveStatus = household?.status || member?.householdStatus || "live";

  await createSession({
    userId: String(effectiveUserId),
    role: effectiveRole,
    contact: canonicalContact,
    householdStatus: effectiveStatus,
    isActivated: true,
    hasPassword: true,
  });

  return {
    success: true,
    message: "Your account has been successfully verified and password activated.",
  };
}