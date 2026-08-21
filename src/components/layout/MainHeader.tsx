'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSession, clearSession, SessionData } from "@/actions/auth";
import { useRouter, usePathname } from "next/navigation";

export default function MainHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    // Only re-verify session if entering auth or dashboard routes
    const isAuthTransition = pathname === "/login" || pathname === "/signup" || pathname === "/dashboard" || pathname.startsWith("/admin");
    if (!session || isAuthTransition) {
      getSession().then((current) => {
        setSession(current);
        setIsLoading(false);
      });
    }
  }, [pathname, session]);

  const handleLogout = async () => {
    await clearSession();
    setSession(null);
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const isLoggedIn = !!session;
  const isAdmin = session?.role === "admin";

  return (
    <header className="sticky top-0 z-50 bg-[#fffdf8]/95 backdrop-blur-md border-b border-brand-accent/25 shadow-warm transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 text-decoration-none group shrink-0">
          <div className="relative w-11 h-11 sm:w-14 sm:h-14 shrink-0 transition-transform group-hover:scale-105">
            <Image
              src="/images/logo.png"
              alt="Maharaja Agrasen Foundation Limited Singapore Logo"
              width={58}
              height={58}
              className="object-contain drop-shadow-[0_2px_8px_rgba(217,83,30,0.22)]"
              priority
            />
          </div>
          <div>
            <span className="inline-block text-[8px] sm:text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full va-badge-gold mb-0.5">
              ANTARRASHTRIYA AGARWAL SAMAJ DIRECTORY
            </span>
            <h2 className="text-xs sm:text-base font-extrabold text-brand-primary leading-tight tracking-tight uppercase">
              ANTARRASHTRIYA AGARWAL SAMAJ DIRECTORY
            </h2>
            <p className="text-[9px] sm:text-[11px] text-body-muted font-medium truncate max-w-[200px] sm:max-w-none">
              Maharaja Agrasen Foundation Limited Singapore
            </p>
          </div>
        </Link>

        {/* Desktop Navigation (hidden on mobile <768px) */}
        <nav aria-label="Main Desktop Navigation" className="hidden md:flex items-center gap-2">
          <Link
            href="/"
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              pathname === "/" ? "bg-canvas-warm text-brand-primary font-bold" : "text-body-heading hover:text-brand-primary hover:bg-canvas-warm"
            }`}
          >
            Home
          </Link>

          <Link
            href="/about"
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              pathname === "/about" ? "bg-canvas-warm text-brand-primary font-bold" : "text-body-heading hover:text-brand-primary hover:bg-canvas-warm"
            }`}
          >
            About & Pillars
          </Link>

          <Link
            href="/directory"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
              pathname.startsWith("/directory")
                ? "bg-brand-primary text-white shadow-sm"
                : "text-brand-primary bg-white hover:bg-canvas-warm border border-brand-accent/30 shadow-sm"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>Directory Search</span>
          </Link>

          {/* DYNAMIC LOGGED IN NAVIGATION */}
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin/moderation"
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                    pathname.startsWith("/admin")
                      ? "bg-brand-burgundy text-white"
                      : "text-brand-burgundy bg-amber-50 border border-brand-accent/40 hover:bg-amber-100"
                  }`}
                >
                  Moderation Queue
                </Link>
              )}

              <Link
                href="/dashboard"
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                  pathname === "/dashboard"
                    ? "bg-brand-primary text-white"
                    : "text-body-heading bg-canvas-warm/70 hover:bg-canvas-warm border border-brand-accent/30"
                }`}
              >
                My Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs font-semibold text-body-muted hover:text-red-700 rounded-full hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            /* DYNAMIC GUEST NAVIGATION */
            !isLoading && (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-body-heading hover:text-brand-primary rounded-full hover:bg-canvas-warm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-xs font-bold text-white va-btn-join rounded-full shadow-goldCta"
                >
                  Register Family Free
                </Link>
              </>
            )
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {!isLoggedIn && !isLoading && (
            <Link
              href="/signup"
              className="px-3 py-1.5 text-[11px] font-bold text-white va-btn-join rounded-full shadow-sm"
            >
              Join Free
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-brand-primary hover:bg-canvas-warm border border-brand-accent/30 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-over Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#fffdf8] border-b-2 border-brand-accent/40 shadow-2xl p-5 space-y-4 max-h-[calc(100vh-60px)] overflow-y-auto">
            <div className="space-y-1">
              <Link
                href="/"
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                  pathname === "/" ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                }`}
              >
                <span>🏠 Home</span>
                <span>→</span>
              </Link>

              <Link
                href="/about"
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                  pathname === "/about" ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                }`}
              >
                <span>🏛️ About & 7 Strategic Pillars</span>
                <span>→</span>
              </Link>

              <Link
                href="/directory"
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                  pathname.startsWith("/directory") ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                }`}
              >
                <span>🔍 Search 18 Gotras Directory</span>
                <span>→</span>
              </Link>
            </div>

            <div className="pt-3 border-t border-brand-accent/20 space-y-2">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent/30"
                  >
                    <span>📊 My Household Dashboard</span>
                    <span>→</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin/moderation"
                      className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-burgundy bg-amber-50 border border-brand-accent/40"
                    >
                      <span>🛡️ Community Moderation Queue</span>
                      <span>→</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left p-3 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    🚪 Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center justify-center p-3 rounded-xl text-xs font-bold text-brand-primary bg-white border border-brand-accent/40 shadow-sm"
                  >
                    Sign In to Portal
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center p-3 rounded-xl text-xs font-bold text-white va-btn-join shadow-goldCta"
                  >
                    Register Family Free →
                  </Link>
                </>
              )}
            </div>

            <div className="pt-2 text-center text-[10px] text-body-muted">
              One Community • One Platform • One Global Family
            </div>
          </div>
        </div>
      )}
    </header>
  );
}