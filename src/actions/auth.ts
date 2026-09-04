'use server';

import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { signSessionToken, verifySessionToken } from "@/lib/auth-tokens";
import { normalizePhoneNumber } from "@/lib/phone";
import { db } from "@/lib/db";
import { verifyPassword, evaluateLockout } from "@/lib/auth-crypto";

export interface SessionData {
  userId: string;
  role: "head" | "member" | "admin";
  contact: string;
  householdStatus?: "pending_review" | "live" | "rejected";
  loggedInAt?: number;
}

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

export async function createSession(data: SessionData) {
  const cookieStore = await cookies();
  const token = signSessionToken(data);

  cookieStore.set("auth_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
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
    const member = await db.getMemberByContact(canonicalContact);
    const household = await db.getHouseholdByContact(canonicalContact);

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

  // 1. Rate limiting & Brute-force protection: check lockout
  const lockout = await checkLoginLockout(canonicalContact, clientIp);
  if (lockout.locked) {
    return {
      success: false,
      error: `Too many failed login attempts. Account temporarily locked. Please try again in ${lockout.remainingMinutes || 15} minutes.`,
    };
  }

  try {
    // 2. Lookup account by contact in members or households
    const member = await db.getMemberByContact(canonicalContact);
    const household = await db.getHouseholdByContact(canonicalContact);

    const storedHash = member?.passwordHash || household?.passwordHash;

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


export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auth_session")?.value;
  if (!sessionCookie) return null;
  return verifySessionToken(sessionCookie);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_session");
  return { success: true };
}