'use server';

import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  role: "head" | "member" | "admin";
  contact: string;
  householdStatus?: "pending_review" | "live" | "rejected";
}

export async function createSession(data: SessionData) {
  const cookieStore = await cookies();
  cookieStore.set("auth_session", JSON.stringify({ ...data, loggedInAt: Date.now() }), {
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
  try {
    return JSON.parse(sessionCookie);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_session");
  return { success: true };
}