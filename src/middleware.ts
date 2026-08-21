import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECRET = process.env.AUTH_SECRET || "agarwal_dir_secure_hmac_secret_2026_super_key_998127";

async function verifyEdgeToken(token: string): Promise<any | null> {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SECRET);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Convert signature from base64url to Uint8Array
    const base64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const sigBytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(payloadB64)
    );

    if (!isValid) return null;

    // Decode payload
    const payloadJson = atob(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/").padEnd(payloadB64.length + ((4 - (payloadB64.length % 4)) % 4), "=")
    );
    const data = JSON.parse(payloadJson);

    // Verify 30-day session TTL
    if (data.loggedInAt && Date.now() - data.loggedInAt > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const authCookie = req.cookies.get("auth_session")?.value;

  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/signin";
  const isProtectedAdminRoute = pathname.startsWith("/admin");
  const isProtectedDirectoryRoute = pathname.startsWith("/directory");
  const isProtectedDashboardRoute = pathname.startsWith("/dashboard");

  const session = authCookie ? await verifyEdgeToken(authCookie) : null;

  // 1. Redirect away from /login, /signup, or /signin if already logged in
  if (isAuthPage && session) {
    if (session.role === "admin") {
      return NextResponse.redirect(new URL("/admin/moderation", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 2. Protect Admin Route strictly: requires verified role === "admin"
  if (isProtectedAdminRoute) {
    if (!session || session.role !== "admin") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("returnUrl", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Enforce Strict Auth in Production or when ENFORCE_STRICT_AUTH === "true"
  const isStrictAuth = process.env.NODE_ENV === "production" || process.env.ENFORCE_STRICT_AUTH === "true";
  if ((isProtectedDirectoryRoute || isProtectedDashboardRoute) && !session && isStrictAuth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("returnUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/signin",
    "/directory/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};