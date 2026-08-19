import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const authCookie = req.cookies.get("auth_session")?.value;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isProtectedAdminRoute = pathname.startsWith("/admin");
  const isProtectedDirectoryRoute = pathname.startsWith("/directory");
  const isProtectedDashboardRoute = pathname.startsWith("/dashboard");

  // 1. If already logged in and visits /login or /signup, redirect straight to dashboard
  if (isAuthPage && authCookie) {
    try {
      const parsed = JSON.parse(authCookie);
      if (parsed.role === "admin") {
        return NextResponse.redirect(new URL("/admin/moderation", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } catch {
      // Invalid cookie, proceed to login
    }
  }

  // 2. If trying to access protected routes without cookie (when strict auth is active)
  if ((isProtectedDirectoryRoute || isProtectedDashboardRoute || isProtectedAdminRoute) && !authCookie) {
    if (process.env.ENFORCE_STRICT_AUTH === "true") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("returnUrl", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/directory/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};