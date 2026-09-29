'use server';

import { clearSessionCookie, readSession, type SessionData } from "@/lib/session-cookie";

export type { SessionData };

export async function getSession(): Promise<SessionData | null> {
  return readSession();
}

export async function clearSession() {
  await clearSessionCookie();
  return { success: true };
}
