'use server';

import { cookies } from "next/headers";
import crypto from "crypto";
import { signSessionToken, verifySessionToken } from "@/lib/auth-tokens";

export interface SessionData {
  userId: string;
  role: "head" | "member" | "admin";
  contact: string;
  householdStatus?: "pending_review" | "live" | "rejected";
  loggedInAt?: number;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
  if (!password || !masterPassword) return false;

  const hashA = crypto.createHash("sha256").update(password).digest();
  const hashB = crypto.createHash("sha256").update(masterPassword).digest();

  return crypto.timingSafeEqual(hashA, hashB);
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