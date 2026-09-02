'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem("cookieConsentDismissed");
      if (!isDismissed) {
        setShowBanner(true);
      }
    }
  }, []);

  const handleAccept = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cookieConsentDismissed", "true");
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div
      role="status"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-5 bg-white/95 border-t border-brand-accent/35 shadow-[0_-8px_24px_rgba(217,83,30,0.08)] backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 text-xs sm:text-sm text-body-text leading-relaxed">
          <p>
            🍪 <strong>Essential Cookies Notice:</strong> We only use strictly necessary functional cookies (such as <code>auth_session</code> and <code>otp_challenge</code>) to maintain secure member login sessions and verification challenges. We do not use advertising, tracking, or marketing cookies. Read more in our{" "}
            <Link href="/cookie-policy" className="font-bold text-brand-primary hover:underline">
              Cookie Policy
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-bold text-brand-primary hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={handleAccept}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/95 transition-all shadow-sm"
          >
            Accept Necessary
          </button>
        </div>
      </div>
    </div>
  );
}
