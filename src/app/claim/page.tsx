'use client';

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyMemberClaim } from "@/actions/claim";

function ClaimContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [claimToken, setClaimToken] = useState(tokenFromUrl);
  const [memberPhone, setMemberPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (tokenFromUrl) setClaimToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimToken.trim()) {
      setErrorMessage("Please enter a valid claim invite token.");
      return;
    }
    setIsVerifying(true);
    setErrorMessage("");

    const res = await verifyMemberClaim("m-103");
    setIsVerifying(false);

    if (res.success) {
      setIsClaimed(true);
    } else {
      setErrorMessage(res.error || "Failed to claim profile. Please check the token.");
    }
  };

  if (isClaimed) {
    return (
      <div className="max-w-md mx-auto px-4 w-full text-center">
        <div className="bg-white border-2 border-emerald-300 rounded-3xl p-8 shadow-warmLg">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-bold mx-auto mb-4 border border-emerald-300">
            ✓
          </div>
          <span className="inline-block text-xs font-bold uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full mb-2">
            Profile Claimed & Locked
          </span>
          <h1 className="text-2xl font-black text-brand-primary mb-3">
            Self-Verification Complete!
          </h1>
          <p className="text-xs text-body-text leading-relaxed mb-6">
            You now independently manage your personal profile in the <strong>ANTARRASHTRIYA AGARWAL SAMAJ DIRECTORY</strong>. Your profile is locked from household head edits.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/directory" className="px-6 py-3 rounded-full text-xs font-bold text-white va-btn-maroon">
              Browse Global Directory →
            </Link>
            <Link href="/" className="px-6 py-2.5 rounded-full text-xs font-bold text-body-heading hover:bg-canvas-warm">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
          Member Self-Claim • व्यक्तिगत प्रोफाइल दावा
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
          Claim Your Profile
        </h1>
        <p className="text-xs text-body-muted mt-1">
          Verify your identity with OTP to gain independent edit rights over your community profile.
        </p>
      </div>

      <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm">
        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Invite Claim Token
            </label>
            <input
              type="text"
              value={claimToken}
              onChange={(e) => setClaimToken(e.target.value)}
              placeholder="e.g. CLM-2026-m-103-X89K2A"
              className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Your Direct Mobile Number
            </label>
            <input
              type="tel"
              value={memberPhone}
              onChange={(e) => setMemberPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-body-heading mb-1.5">
              Enter Verification Passcode (OTP)
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
            />
            
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
          >
            {isVerifying ? "Verifying..." : "Verify & Claim Independent Profile →"}
          </button>
        </form>

        <div className="pt-6 mt-6 border-t border-brand-accent/20 text-center text-xs text-body-muted">
          Need help? Contact Foundation Helpline: <strong>+91 98765 43210</strong>
        </div>
      </div>
    </div>
  );
}

export default function MemberClaimPage() {
  return (
    <main className="py-14 bg-canvas-page">
      <Suspense fallback={<div className="text-center text-xs text-body-muted py-12">Loading claim verification...</div>}>
        <ClaimContent />
      </Suspense>
    </main>
  );
}