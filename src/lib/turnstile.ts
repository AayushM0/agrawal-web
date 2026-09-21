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
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  const isDevOrTest = process.env.NODE_ENV !== "production" || process.env.CI;

  // 1. Graceful Dev & Automated Test Bypass
  if (!secretKey) {
    if (isDevOrTest) {
      return { success: true, isDevBypass: true };
    }
    return {
      success: false,
      error: "Turnstile secret key is not configured in production.",
    };
  }

  // 2. Token presence check
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Missing Turnstile anti-bot token. Please complete the verification challenge.",
    };
  }

  // 3. Allow recognized test tokens in non-production
  if (isDevOrTest && (token === "dev-bypass-token" || token === "cf-test-mock-token")) {
    return { success: true, isDevBypass: true };
  }

  // 4. Verify against Cloudflare siteverify endpoint
  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token.trim());
    if (remoteIp && remoteIp !== "127.0.0.1") {
      formData.append("remoteip", remoteIp);
    }

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
      return {
        success: false,
        error: `Turnstile verification service responded with status ${response.status}`,
      };
    }

    const data = (await response.json()) as CloudflareVerifyApiResponse;

    if (!data.success) {
      const errorMsg =
        data["error-codes"] && data["error-codes"].length > 0
          ? data["error-codes"].join(", ")
          : "Turnstile validation failed";
      return {
        success: false,
        error: `Bot verification failed: ${errorMsg}`,
      };
    }

    return {
      success: true,
      hostname: data.hostname,
      challengeTs: data.challenge_ts,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      // In case of external timeout, log warning and allow graceful handling or strict fail
      return {
        success: false,
        error: "Turnstile challenge verification timed out. Please try again.",
      };
    }

    return {
      success: false,
      error: "Unable to verify bot challenge. Please try again.",
    };
  }
}
