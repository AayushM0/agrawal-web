/**
 * Cloudflare Turnstile Server Verification Service
 * Validates invisible anti-bot challenge tokens at the server boundary.
 */

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
  hostname?: string;
  challengeTs?: string;
  isDevBypass?: boolean;
}

interface CloudflareVerifyApiResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Extracts real client IP address, prioritizing Cloudflare's authenticated proxy header.
 */
export function getClientIp(headerList: { get(name: string): string | null }): string {
  return (
    headerList.get("cf-connecting-ip")?.trim() ||
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}

/**
 * Validates a client Turnstile response token with Cloudflare's siteverify endpoint.
 * Includes automatic dev bypass when keys are unconfigured in non-production environments.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const rawSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  const secretKey = rawSecret ? rawSecret.replace(/["']/g, "").trim() : undefined;
  const isDevOrTest = process.env.NODE_ENV !== "production" || process.env.CI;

  // 1. Graceful Dev & Automated Test Bypass
  if (!secretKey) {
    if (isDevOrTest) {
      return { success: true, isDevBypass: true };
    }
    console.error("[TURNSTILE CONFIG ERROR] Secret key is not configured in production environment.");
    return {
      success: false,
      error: "Security verification could not be completed. Please try again later.",
    };
  }

  // 2. Token presence check
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Please complete the security verification challenge before continuing.",
    };
  }

  // 3. Allow recognized test tokens in non-production or preview deployments
  const isPreviewOrDev = isDevOrTest || process.env.VERCEL_ENV === "preview";
  if (isPreviewOrDev && (token === "dev-bypass-token" || token === "cf-test-mock-token" || token.startsWith("XXXX."))) {
    return { success: true, isDevBypass: true };
  }

  // 4. Verify against Cloudflare siteverify endpoint
  try {
    const verifySecret = (isPreviewOrDev && token.startsWith("XXXX."))
      ? "1x0000000000000000000000000000000AA"
      : secretKey;

    const formData = new URLSearchParams();
    formData.append("secret", verifySecret);
    formData.append("response", token.trim());

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(4000),
      }
    );

    if (!response.ok) {
      console.error(`[TURNSTILE HTTP ERROR] Cloudflare siteverify returned HTTP ${response.status}`);
      return {
        success: false,
        error: "Security verification service is temporarily unavailable. Please try again.",
      };
    }

    const data = (await response.json()) as CloudflareVerifyApiResponse;

    if (!data.success) {
      console.error("[TURNSTILE VERIFY ERROR] Cloudflare error codes:", data["error-codes"]);
      return {
        success: false,
        error: "Security verification failed. Please refresh the challenge and try again.",
      };
    }

    return {
      success: true,
      hostname: data.hostname,
      challengeTs: data.challenge_ts,
    };
  } catch (err: unknown) {
    console.error("[TURNSTILE UNEXPECTED EXCEPTION]", err);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: "Security verification timed out. Please try again.",
      };
    }

    return {
      success: false,
      error: "Unable to verify security challenge. Please try again.",
    };
  }
}
