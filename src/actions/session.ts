'use server';

import { cookies } from "next/headers";
import { signSessionToken, verifySessionToken } from "@/lib/auth-tokens";

export interface SessionData {
  userId: string;
  role: "head" | "member" | "admin";
  contact: string;
  householdStatus?: "pending_review" | "live" | "rejected";
  isActivated?: boolean;
  hasPassword?: boolean;
  loggedInAt?: number;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auth_session")?.value;
  if (!sessionCookie) return null;
  return verifySessionToken(sessionCookie);
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

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_session");
  return { success: true };
}
