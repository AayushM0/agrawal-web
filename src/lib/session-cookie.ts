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

export async function readSession(): Promise<SessionData | null> {
  const sessionCookie = (await cookies()).get("auth_session")?.value;
  return sessionCookie ? verifySessionToken(sessionCookie) : null;
}

export async function writeSession(data: SessionData) {
  (await cookies()).set("auth_session", signSessionToken(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete("auth_session");
}
