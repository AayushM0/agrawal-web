'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSession, clearSession, SessionData } from "@/actions/auth";
import { getConversations } from "@/actions/chat";
import { useRouter, usePathname } from "next/navigation";

export default function MainHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notification & Messages State
  const [unreadRequests, setUnreadRequests] = useState<any[]>([]);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotificationPanel(false);
    getSession().then((current) => {
      setSession(current);
      setIsLoading(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    async function loadNotifications() {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await getConversations();
        if (res.success && isMounted) {
          setUnreadRequests(res.requests || []);
          setRecentConversations(res.active || []);
        }
      } catch {}
    }
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [session, pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(e.target as Node)) {
        setShowNotificationPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await clearSession();
    setSession(null);
    setMobileMenuOpen(false);
    setShowNotificationPanel(false);
    router.push("/");
    router.refresh();
  };

  const isLoggedIn = !!session;
  const isAdmin = session?.role === "admin";
  const totalUnreadCount = unreadRequests.length + recentConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <header className="sticky top-0 z-50 bg-[#fffdf8]/95 backdrop-blur-md border-b border-brand-accent/25 shadow-warm transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 text-decoration-none group">
          <div className="relative w-9 h-9 sm:w-12 sm:h-12 shrink-0 transition-transform group-hover:scale-105">
            <Image
              src="/images/logo-transparent.png"
              alt="Maharaja Agrasen Foundation Limited Singapore Logo"
              width={120}
              height={120}
              quality={95}
              className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(217,83,30,0.22)]"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[8px] sm:text-[9px] font-bold tracking-wider uppercase px-1.5 sm:px-2 py-0.5 rounded-full va-badge-gold mb-0.5 whitespace-nowrap">
              Maharaja Agrasen Foundation
            </span>
            <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-brand-primary leading-tight tracking-tight truncate">
              Maharaja Agrasen Foundation Limited Singapore
            </h2>
            <p className="text-[9px] sm:text-[11px] text-body-muted font-medium truncate hidden sm:block">
              One Community • One Platform • One Global Family
            </p>
          </div>
        </Link>

        {/* Desktop Navigation (hidden on mobile <768px) */}
        <nav aria-label="Main Desktop Navigation" className="hidden md:flex items-center gap-2 shrink-0">
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
              {/* NOTIFICATION BUTTON & POPUP WINDOW */}
              <div className="relative" ref={notificationDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className={`relative p-2 rounded-full transition-all ${
                    showNotificationPanel
                      ? "bg-[#800020] text-white shadow-md"
                      : "text-brand-primary bg-white hover:bg-canvas-warm border border-brand-accent/30 shadow-sm"
                  }`}
                  aria-label="Messages & Notifications"
                  title="Messages & Notifications"
                >
                  <span className="text-sm">💬</span>
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                    </span>
                  )}
                </button>

                {/* Floating Notification & Messages Window */}
                {showNotificationPanel && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-brand-accent/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 bg-[#800020] text-white flex items-center justify-between border-b border-[#68001A]">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">🔔</span>
                        <h3 className="font-serif font-bold text-sm text-[#D4AF37]">Messages & Notifications</h3>
                      </div>
                      <Link
                        href="/dashboard/messages"
                        onClick={() => setShowNotificationPanel(false)}
                        className="text-[11px] text-amber-200 hover:text-white underline font-medium"
                      >
                        Open Inbox →
                      </Link>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                      {/* Section 1: Message Requests */}
                      {unreadRequests.length > 0 && (
                        <div className="p-2 bg-amber-50/70">
                          <div className="px-2 py-1 text-[11px] font-bold text-[#800020] uppercase tracking-wider flex items-center justify-between">
                            <span>Pending Requests ({unreadRequests.length})</span>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                          </div>
                          {unreadRequests.map((req) => (
                            <Link
                              key={req.id}
                              href="/dashboard/messages"
                              onClick={() => setShowNotificationPanel(false)}
                              className="block p-2.5 rounded-xl hover:bg-white transition text-left group"
                            >
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#800020] text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0">
                                  {req.otherParticipant?.fullName?.charAt(0) || "M"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-[#800020]">
                                      {req.otherParticipant?.fullName}
                                    </h4>
                                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                                      Request
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                    {req.lastMessagePreview || "Sent you a message request"}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Section 2: Active Conversations */}
                      {recentConversations.length > 0 ? (
                        <div className="p-2">
                          <div className="px-2 py-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Recent Messages
                          </div>
                          {recentConversations.slice(0, 4).map((conv) => (
                            <Link
                              key={conv.id}
                              href="/dashboard/messages"
                              onClick={() => setShowNotificationPanel(false)}
                              className="block p-2.5 rounded-xl hover:bg-[#FAF6F0] transition text-left group"
                            >
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-brand-accent/40 text-brand-primary flex items-center justify-center font-bold text-xs shrink-0">
                                  {conv.otherParticipant?.fullName?.charAt(0) || "M"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-[#800020]">
                                      {conv.otherParticipant?.fullName}
                                    </h4>
                                    {conv.unreadCount > 0 && (
                                      <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                    {conv.lastMessagePreview || "No messages yet"}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        unreadRequests.length === 0 && (
                          <div className="p-8 text-center text-gray-400">
                            <div className="text-2xl mb-1">💬</div>
                            <p className="text-xs text-gray-600 font-medium">No new messages or requests</p>
                            <Link
                              href="/directory"
                              onClick={() => setShowNotificationPanel(false)}
                              className="inline-block mt-3 text-[11px] font-bold text-[#800020] hover:underline"
                            >
                              Browse Directory to Connect →
                            </Link>
                          </div>
                        )
                      )}
                    </div>

                    <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
                      <Link
                        href="/dashboard/messages"
                        onClick={() => setShowNotificationPanel(false)}
                        className="text-xs font-bold text-[#800020] hover:text-[#68001A] block w-full py-1"
                      >
                        View All Conversations in Messages →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

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

              <Link
                href="/settings"
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                  pathname === "/settings"
                    ? "bg-brand-primary text-white"
                    : "text-body-heading bg-canvas-warm/70 hover:bg-canvas-warm border border-brand-accent/30"
                }`}
              >
                ⚙️ Settings
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

        {/* Mobile Action Buttons & Hamburger (Always visible on phone) */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2 shrink-0 z-10">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-brand-primary rounded-full shadow-sm whitespace-nowrap"
            >
              Dashboard
            </Link>
          ) : !isLoading ? (
            <Link
              href="/signup"
              className="px-2.5 py-1.5 text-[11px] font-bold text-white va-btn-join rounded-full shadow-sm whitespace-nowrap"
            >
              Join Free
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 sm:p-2 rounded-xl text-brand-primary hover:bg-canvas-warm border border-brand-accent/40 bg-white shadow-xs transition-colors shrink-0"
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
                    href="/dashboard/messages"
                    className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-primary bg-amber-50/80 border border-brand-accent/30"
                  >
                    <div className="flex items-center space-x-2">
                      <span>💬 Messages & Requests</span>
                      {totalUnreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                          {totalUnreadCount}
                        </span>
                      )}
                    </div>
                    <span>→</span>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent/30"
                  >
                    <span>📊 My Household Dashboard</span>
                    <span>→</span>
                  </Link>

                  <Link
                    href="/settings"
                    className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent/30"
                  >
                    <span>⚙️ Account Settings</span>
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