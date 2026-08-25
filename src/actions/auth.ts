'use server';

import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { signSessionToken, verifySessionToken } from "@/lib/auth-tokens";
import { normalizePhoneNumber } from "@/lib/phone";
import { db } from "@/lib/db";

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