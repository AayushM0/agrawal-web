'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSession, clearSession, SessionData } from "@/actions/session";
import { getConversations } from "@/actions/chat";
import { useRouter, usePathname } from "next/navigation";
import { MessageRequestToast, MessageRequestToastData } from "@/components/chat/MessageRequestToast";
import { getPusherClient } from "@/hooks/useChatRealtime";

export default function MainHeader({ initialSession }: { initialSession?: SessionData | null } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionData | null>(initialSession ?? null);
  const [isLoading, setIsLoading] = useState(initialSession === undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dropdown States
  const [showCommunityMenu, setShowCommunityMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const communityDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Notification & Messages State
  const [unreadRequests, setUnreadRequests] = useState<any[]>([]);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [activeToast, setActiveToast] = useState<MessageRequestToastData | null>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const seenRequestsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  // 1. Instant UI cleanup on route navigation (pure client state)
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotificationPanel(false);
    setShowCommunityMenu(false);
    setShowAccountMenu(false);
  }, [pathname]);

  // Track previous pathname to detect auth transitions
  const prevPathnameRef = useRef(pathname);

  // 2. Fetch session on initial mount (if not hydrated from server) and when window regains focus
  useEffect(() => {
    let isMounted = true;
    const updateSession = () => {
      getSession()
        .then((current) => {
          if (isMounted) {
            setSession(current);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoading(false);
        });
    };

    if (initialSession === undefined) {
      updateSession();
    }

    const onFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        updateSession();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [initialSession]);

  // 3. Re-verify session only when transitioning to/from auth routes
  useEffect(() => {
    const isAuthRoute = (p: string) =>
      p === "/login" || p === "/signin" || p === "/signup" || p.startsWith("/claim");

    const wasAuth = isAuthRoute(prevPathnameRef.current);
    const isNowAuth = isAuthRoute(pathname);
    prevPathnameRef.current = pathname;
    setMobileMenuOpen(false);

    if (wasAuth !== isNowAuth || isNowAuth) {
      getSession()
        .then((current) => {
          setSession(current);
          setIsLoading(false);
        })
        .catch(() => {});
    }
  }, [pathname]);

  // 3b. Real-time Pusher incoming-message listener for logged-in user
  useEffect(() => {
    if (!session?.userId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-user-${session.userId}`);

    channel.bind("incoming-message", (data: any) => {
      // Refresh notifications badge
      getConversations()
        .then((res) => {
          if (res.success) {
            setUnreadRequests(res.requests || []);
            setRecentConversations(res.active || []);
          }
        })
        .catch(() => {});

      // If it's a message request or contains sender name, trigger the real-time popup toast
      if (data && (data.isRequest || data.senderName)) {
        const reqId = String(data.conversationId || Date.now());
        if (!seenRequestsRef.current.has(reqId)) {
          seenRequestsRef.current.add(reqId);
          if (pathname !== "/dashboard/messages") {
            setActiveToast({
              id: reqId,
              senderName: data.senderName || "A Community Member",
              senderGotra: data.senderGotra || null,
              messagePreview: data.messagePreview || "Sent you a message request.",
              conversationId: data.conversationId || "",
            });
          }
        }
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${session.userId}`);
    };
  }, [session?.userId, pathname]);

  // 4. Notifications poll every 30s when logged in - decoupled from navigation
  useEffect(() => {
    if (!session) {
      setUnreadRequests([]);
      setRecentConversations([]);
      return;
    }
    let isMounted = true;
    async function loadNotifications() {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await getConversations();
        if (res.success && isMounted) {
          const reqs = res.requests || [];
          setUnreadRequests(reqs);
          setRecentConversations(res.active || []);

          if (!initialLoadDoneRef.current) {
            // First load: seed seen requests so existing historical requests don't toast
            reqs.forEach((r: any) => seenRequestsRef.current.add(String(r.id)));
            initialLoadDoneRef.current = true;
          } else {
            // Subsequent polls: toast any newly discovered request
            for (const r of reqs) {
              const rId = String(r.id);
              if (!seenRequestsRef.current.has(rId)) {
                seenRequestsRef.current.add(rId);
                if (pathname !== "/dashboard/messages") {
                  setActiveToast({
                    id: rId,
                    senderName: r.otherParticipant?.fullName || "A Community Member",
                    senderGotra: r.otherParticipant?.gotra || null,
                    messagePreview: r.lastMessagePreview || "Sent you a message request.",
                    conversationId: r.id,
                  });
                }
                break;
              }
            }
          }
        }
      } catch {}
    }
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [session?.userId, pathname]);

  // Click outside and Escape key handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(e.target as Node)) {
        setShowNotificationPanel(false);
      }
      if (communityDropdownRef.current && !communityDropdownRef.current.contains(e.target as Node)) {
        setShowCommunityMenu(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowNotificationPanel(false);
        setShowCommunityMenu(false);
        setShowAccountMenu(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await clearSession();
    setSession(null);
    setMobileMenuOpen(false);
    setShowNotificationPanel(false);
    setShowAccountMenu(false);
    router.push("/");
    router.refresh();
  };

  const isLoggedIn = !!session;
  const isAdmin = session?.role === "admin";
  const totalUnreadCount = unreadRequests.length + recentConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const handleOpenChat = (conversationId: string) => {
    router.push(`/dashboard/messages${conversationId ? `?conv=${encodeURIComponent(conversationId)}` : ""}`);
  };

  const isCommunityActive =
    pathname.startsWith("/matrimony") ||
    pathname.startsWith("/businesses") ||
    pathname === "/about" ||
    pathname === "/guide";

  return (
    <>
      <MessageRequestToast
        toast={activeToast}
        onClose={() => setActiveToast(null)}
        onOpenChat={handleOpenChat}
      />
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

          {/* Desktop Navigation (Streamlined Core + Dropdowns) */}
          <nav aria-label="Main Desktop Navigation" className="hidden md:flex items-center gap-2 shrink-0">
            {/* 1. Direct Link: Home */}
            <Link
              href="/"
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                pathname === "/"
                  ? "bg-canvas-warm text-brand-primary font-bold"
                  : "text-body-heading hover:text-brand-primary hover:bg-canvas-warm"
              }`}
            >
              Home
            </Link>

            {/* 2. Direct Link: Directory Search */}
            <Link
              href="/directory"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                pathname.startsWith("/directory")
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-brand-primary bg-white hover:bg-canvas-warm border border-brand-accent/30 shadow-sm"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Directory Search</span>
            </Link>

            {/* 3. Dropdown: Explore Community */}
            <div className="relative" ref={communityDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowCommunityMenu(!showCommunityMenu);
                  setShowAccountMenu(false);
                  setShowNotificationPanel(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                  isCommunityActive || showCommunityMenu
                    ? "bg-canvas-warm text-brand-primary border border-brand-accent/40 shadow-xs"
                    : "text-body-heading hover:text-brand-primary hover:bg-canvas-warm"
                }`}
                aria-haspopup="true"
                aria-expanded={showCommunityMenu}
                aria-label="Explore Community Platforms Menu"
              >
                <span>Explore Community</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${showCommunityMenu ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Explore Community Popover Menu */}
              {showCommunityMenu && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-brand-accent/30 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-body-muted uppercase tracking-wider">
                    Community Initiatives
                  </div>

                  <Link
                    href="/matrimony"
                    onClick={() => setShowCommunityMenu(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-canvas-warm transition text-left group"
                  >
                    <div className="p-2 rounded-lg bg-rose-50 text-rose-700 shrink-0 group-hover:bg-rose-100 transition">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="12" r="5" />
                        <circle cx="15" cy="12" r="5" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 group-hover:text-brand-primary">
                        Matrimonial Platform
                      </div>
                      <div className="text-[11px] text-body-muted leading-tight mt-0.5">
                        वैवाहिक मंच & verified family rishtey
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/businesses"
                    onClick={() => setShowCommunityMenu(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-canvas-warm transition text-left group"
                  >
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-800 shrink-0 group-hover:bg-amber-100 transition">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="2" width="16" height="20" rx="2" />
                        <path d="M9 22v-4h6v4" />
                        <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 group-hover:text-brand-primary">
                        Business Network
                      </div>
                      <div className="text-[11px] text-body-muted leading-tight mt-0.5">
                        व्यापार संजाल & community enterprise
                      </div>
                    </div>
                  </Link>

                  <div className="my-1 border-t border-brand-accent/20"></div>

                  <Link
                    href="/about"
                    onClick={() => setShowCommunityMenu(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-canvas-warm transition text-left group"
                  >
                    <div className="p-2 rounded-lg bg-brand-accent/15 text-brand-primary shrink-0 group-hover:bg-brand-accent/30 transition">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" y1="20" x2="22" y2="20" />
                        <path d="M4 17V8M8 17V8M16 17V8M20 17V8" />
                        <path d="M12 2l10 5H2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 group-hover:text-brand-primary">
                        About & 7 Pillars
                      </div>
                      <div className="text-[11px] text-body-muted leading-tight mt-0.5">
                        संस्था परिचय, दृष्टि & 7 प्रमुख स्तंभ
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/guide"
                    onClick={() => setShowCommunityMenu(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-canvas-warm transition text-left group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 shrink-0 group-hover:bg-emerald-100 transition">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 group-hover:text-brand-primary">
                        User Guide & Rules
                      </div>
                      <div className="text-[11px] text-body-muted leading-tight mt-0.5">
                        उपयोग निर्देशिका, सत्यापन & दिशानिर्देश
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* DYNAMIC RIGHT-SIDE NAVIGATION */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2 ml-1">
                {/* 1. MESSAGES & NOTIFICATIONS POPUP */}
                <div className="relative" ref={notificationDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotificationPanel(!showNotificationPanel);
                      setShowAccountMenu(false);
                      setShowCommunityMenu(false);
                    }}
                    className={`relative p-2 rounded-full transition-all ${
                      showNotificationPanel
                        ? "bg-brand-burgundy text-white shadow-md"
                        : "text-brand-primary bg-white hover:bg-canvas-warm border border-brand-accent/30 shadow-xs"
                    }`}
                    aria-label="Messages & Notifications"
                    title="Messages & Notifications"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {totalUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                      </span>
                    )}
                  </button>

                  {/* Floating Notification & Messages Window */}
                  {showNotificationPanel && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-brand-accent/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-3 bg-brand-burgundy text-white flex items-center justify-between border-b border-[#68001A]">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
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
                        {/* Message Requests */}
                        {unreadRequests.length > 0 && (
                          <div className="p-2 bg-amber-50/70">
                            <div className="px-2 py-1 text-[11px] font-bold text-brand-burgundy uppercase tracking-wider flex items-center justify-between">
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
                                  <div className="w-8 h-8 rounded-full bg-brand-burgundy text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0">
                                    {req.otherParticipant?.fullName?.charAt(0) || "M"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-brand-burgundy">
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

                        {/* Recent Messages */}
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
                                      <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-brand-burgundy">
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
                              <div className="w-10 h-10 mx-auto mb-2 text-gray-400">
                                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                              </div>
                              <p className="text-xs text-gray-600 font-medium">No new messages or requests</p>
                              <Link
                                href="/directory"
                                onClick={() => setShowNotificationPanel(false)}
                                className="inline-block mt-3 text-[11px] font-bold text-brand-burgundy hover:underline"
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
                          className="text-xs font-bold text-brand-burgundy hover:text-[#68001A] block w-full py-1"
                        >
                          View All Conversations in Messages →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. CONSOLIDATED USER ACCOUNT DROPDOWN */}
                <div className="relative" ref={accountDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(!showAccountMenu);
                      setShowCommunityMenu(false);
                      setShowNotificationPanel(false);
                    }}
                    className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border transition-all ${
                      showAccountMenu || pathname.startsWith("/dashboard") || pathname === "/settings"
                        ? "bg-canvas-warm border-brand-accent/50 shadow-xs text-brand-primary"
                        : "bg-white hover:bg-canvas-warm border-brand-accent/30 text-body-heading shadow-xs"
                    }`}
                    aria-haspopup="true"
                    aria-expanded={showAccountMenu}
                    aria-label="User Account Menu"
                  >
                    <div className="w-6 h-6 rounded-full bg-brand-burgundy text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {session.contact?.charAt(0).toUpperCase() || "A"}
                    </div>
                    <span className="text-xs font-bold">My Account</span>
                    {isAdmin && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-brand-burgundy border border-amber-300">
                        Admin
                      </span>
                    )}
                    <svg
                      className={`w-3 h-3 text-body-muted transition-transform duration-200 ${showAccountMenu ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Account Popover Menu */}
                  {showAccountMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-brand-accent/30 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-2 border-b border-brand-accent/20 mb-1">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {session.contact}
                        </div>
                        <div className="text-[10px] text-body-muted uppercase tracking-wider font-semibold mt-0.5">
                          {session.role === "admin" ? "Community Administrator" : "Verified Household"}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <Link
                          href="/dashboard"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-brand-primary hover:bg-canvas-warm transition"
                        >
                          <svg className="w-4 h-4 text-brand-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                          </svg>
                          <span>My Household Dashboard</span>
                        </Link>

                        <Link
                          href="/dashboard/pass"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-brand-primary hover:bg-canvas-warm transition"
                        >
                          <svg className="w-4 h-4 text-amber-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                            <circle cx="9" cy="10" r="2" />
                            <line x1="15" y1="8" x2="17" y2="8" />
                            <line x1="15" y1="12" x2="17" y2="12" />
                            <line x1="7" y1="16" x2="17" y2="16" />
                          </svg>
                          <span>Official ID Passes</span>
                        </Link>

                        {isAdmin && (
                          <Link
                            href="/admin/moderation"
                            onClick={() => setShowAccountMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-brand-burgundy hover:bg-amber-50/70 transition"
                          >
                            <svg className="w-4 h-4 text-brand-burgundy shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              <path d="m9 12 2 2 4-4" />
                            </svg>
                            <span>Community Moderation</span>
                          </Link>
                        )}

                        <Link
                          href="/settings"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-brand-primary hover:bg-canvas-warm transition"
                        >
                          <svg className="w-4 h-4 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                          <span>Account Settings</span>
                        </Link>
                      </div>

                      <div className="my-1.5 border-t border-brand-accent/20"></div>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-700 hover:bg-red-50 transition text-left"
                      >
                        <svg className="w-4 h-4 text-red-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* DYNAMIC GUEST NAVIGATION */
              <div className="flex items-center gap-2 ml-1">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold text-body-heading hover:text-brand-primary rounded-full hover:bg-canvas-warm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-1.5 text-xs font-bold text-white va-btn-join rounded-full shadow-goldCta"
                >
                  Register Family Free
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Action Buttons & Hamburger */}
          <div className="flex md:hidden items-center gap-1.5 sm:gap-2 shrink-0 z-10">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-brand-primary rounded-full shadow-sm whitespace-nowrap"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="px-2.5 py-1.5 text-[11px] font-bold text-white va-btn-join rounded-full shadow-sm whitespace-nowrap"
              >
                Join Free
              </Link>
            )}

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

        {/* Mobile Slide-over Drawer Menu (Zero Emojis, Clean Categorization) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-[60px] z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#fffdf8] border-b-2 border-brand-accent/40 shadow-2xl p-5 space-y-4 max-h-[calc(100vh-60px)] overflow-y-auto">
              {/* Category 1: Primary Navigation */}
              <div className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-body-muted uppercase tracking-wider">
                  Primary Navigation
                </div>

                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/" ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>Home</span>
                  </div>
                  <span>→</span>
                </Link>

                <Link
                  href="/directory"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    pathname.startsWith("/directory") ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Search 18 Gotras Directory</span>
                  </div>
                  <span>→</span>
                </Link>
              </div>

              {/* Category 2: Community Platforms */}
              <div className="pt-2 border-t border-brand-accent/20 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-body-muted uppercase tracking-wider">
                  Community Initiatives
                </div>

                <Link
                  href="/matrimony"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    pathname.startsWith("/matrimony") ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="12" r="5" />
                      <circle cx="15" cy="12" r="5" />
                    </svg>
                    <span>Matrimonial Platform (वैवाहिक मंच)</span>
                  </div>
                  <span>→</span>
                </Link>

                <Link
                  href="/businesses"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    pathname.startsWith("/businesses") ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="2" width="16" height="20" rx="2" />
                      <path d="M9 22v-4h6v4" />
                      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
                    </svg>
                    <span>Business Network (व्यापार संजाल)</span>
                  </div>
                  <span>→</span>
                </Link>

                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/about" ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-brand-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="2" y1="20" x2="22" y2="20" />
                      <path d="M4 17V8M8 17V8M16 17V8M20 17V8" />
                      <path d="M12 2l10 5H2z" />
                    </svg>
                    <span>About & 7 Strategic Pillars</span>
                  </div>
                  <span>→</span>
                </Link>

                <Link
                  href="/guide"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/guide" ? "bg-brand-primary text-white" : "text-body-heading hover:bg-canvas-warm"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-emerald-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <span>User Guide & Rules</span>
                  </div>
                  <span>→</span>
                </Link>
              </div>

              {/* Category 3: User Account / Sign In */}
              <div className="pt-2 border-t border-brand-accent/20 space-y-2">
                <div className="px-2 py-1 text-[10px] font-bold text-body-muted uppercase tracking-wider">
                  Account & Access
                </div>

                {isLoggedIn ? (
                  <>
                    <Link
                      href="/dashboard/messages"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-primary bg-amber-50/80 border border-brand-accent/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-brand-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>Messages & Requests</span>
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
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-brand-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                        <span>My Household Dashboard</span>
                      </div>
                      <span>→</span>
                    </Link>

                    <Link
                      href="/dashboard/pass"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-amber-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <circle cx="9" cy="10" r="2" />
                          <line x1="15" y1="8" x2="17" y2="8" />
                          <line x1="15" y1="12" x2="17" y2="12" />
                          <line x1="7" y1="16" x2="17" y2="16" />
                        </svg>
                        <span>Official ID Passes</span>
                      </div>
                      <span>→</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-gray-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        <span>Account Settings</span>
                      </div>
                      <span>→</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin/moderation"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-brand-burgundy bg-amber-50 border border-brand-accent/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <svg className="w-4 h-4 text-brand-burgundy shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="m9 12 2 2 4-4" />
                          </svg>
                          <span>Community Moderation Queue</span>
                        </div>
                        <span>→</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-red-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Sign Out</span>
                      </div>
                      <span>→</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center p-3 rounded-xl text-xs font-bold text-brand-primary bg-white border border-brand-accent/40 shadow-sm"
                    >
                      Sign In to Portal
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
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
    </>
  );
}