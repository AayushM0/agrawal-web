import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const authCookie = req.cookies.get("auth_session")?.value;

  const isProtectedAdminRoute = pathname.startsWith("/admin");
  const isProtectedDirectoryRoute = pathname.startsWith("/directory");
  const isProtectedDashboardRoute = pathname.startsWith("/dashboard");

  // In demo/dev mode without cookies, allow seamless exploration
  // In production with cookies, enforce redirect with returnUrl
  if ((isProtectedDirectoryRoute || isProtectedDashboardRoute || isProtectedAdminRoute) && !authCookie) {
    // If strict production mode is turned on via env
    if (process.env.ENFORCE_STRICT_AUTH === "true") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("returnUrl", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/directory/:path*", "/dashboard/:path*", "/admin/:path*"],
};