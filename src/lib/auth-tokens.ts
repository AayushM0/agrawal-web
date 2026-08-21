import crypto from "crypto";
import type { SessionData } from "@/actions/auth";

const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  return process.env.AUTH_SECRET || "agarwal_dir_secure_hmac_secret_2026_super_key_998127";
}

export function signSessionToken(data: SessionData): string {
  const payload = JSON.stringify({ ...data, loggedInAt: data.loggedInAt || Date.now() });
  const payloadB64 = Buffer.from(payload, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): SessionData | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");

  const sigBufferA = Buffer.from(signature);
  const sigBufferB = Buffer.from(expectedSignature);

  if (sigBufferA.length !== sigBufferB.length) return null;
  if (!crypto.timingSafeEqual(sigBufferA, sigBufferB)) return null;

  try {
    const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const data: SessionData = JSON.parse(jsonStr);

    if (data.loggedInAt && Date.now() - data.loggedInAt > MAX_SESSION_AGE) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}