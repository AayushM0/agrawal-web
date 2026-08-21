'use client';

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getClaimMemberDetails, verifyMemberClaim, checkContactAvailability } from "@/actions/claim";
import { sendOtp } from "@/actions/otp";

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [claimToken, setClaimToken] = useState(tokenFromUrl);
  const [memberDetails, setMemberDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [contactValue, setContactValue] = useState("");
  const [contactConflict, setContactConflict] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-fetch member details when token is available
  useEffect(() => {
    if (tokenFromUrl) {
      setClaimToken(tokenFromUrl);
      fetchDetails(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const fetchDetails = async (token: string) => {
    if (!token.trim()) return;
    setIsLoadingDetails(true);
    setTokenError("");
    const res = await getClaimMemberDetails(token.trim());
    setIsLoadingDetails(false);
    if (res.success && res.member) {
      setMemberDetails(res.member);
      if (res.member.existingPhone) {
        setContactType("phone");
        setContactValue(res.member.existingPhone);
      } else if (res.member.existingEmail) {
        setContactType("email");
        setContactValue(res.member.existingEmail);
      }
    } else {
      setTokenError(res.error || "Unable to find member associated with this claim token.");
      setMemberDetails(null);
    }
  };

  const handleTokenBlur = () => {
    if (claimToken.trim()) {
      fetchDetails(claimToken.trim());
    }
  };

  const handleContactChange = async (val: string) => {
    setContactValue(val);
    setContactConflict(null);
    setOtpSent(false);
    setOtpMessage("");
    setErrorMessage("");

    if (val.trim().length >= 7) {
      const avail = await checkContactAvailability(val.trim(), memberDetails?.id);
      if (!avail.available && avail.conflict) {
        setContactConflict(
          `This ${contactType === "phone" ? "number" : "email"} is already registered in the directory (${avail.conflict.name ? `associated with ${avail.conflict.name}` : `#${avail.conflict.householdCode}`}).`
        );
      }
    }
  };

  const handleSendOtp = async () => {
    if (!contactValue.trim() || contactValue.trim().length < 5) {
      setErrorMessage("Please enter a valid mobile number or email address.");
      return;
    }
    if (contactConflict) {
      setErrorMessage("Please enter a contact number/email that is not already registered.");
      return;
    }
    setIsSendingOtp(true);
    setErrorMessage("");
    setOtpMessage("");

    const res = await sendOtp({
      recipient: contactValue.trim(),
      type: contactType === "phone" ? "sms" : "email",
    });
    setIsSendingOtp(false);
    if (res.success) {
      setOtpSent(true);
      setOtpMessage(res.message || "Passcode sent successfully.");
    } else {
      setErrorMessage(res.error || "Failed to dispatch verification OTP.");
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimToken.trim()) {
      setErrorMessage("Please enter a valid claim invite token.");
      return;
    }
    if (!contactValue.trim()) {
      setErrorMessage("Please provide your direct mobile number or email.");
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit OTP code received.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");

    const res = await verifyMemberClaim({
      token: claimToken.trim(),
      contact: contactValue.trim(),
      otp: otp.trim(),
    });
    setIsVerifying(false);

    if (res.success) {
      setIsClaimed(true);
    } else {
      setErrorMessage(res.error || "Failed to claim profile. Please check the passcode and token.");
    }
  };

  if (isClaimed) {
    return (
      <div className="max-w-md mx-auto px-4 w-full text-center py-12">
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
            Congratulations! You now independently manage your personal profile in the <strong>Maharaja Agrasen Foundation Limited Singapore</strong> platform. Your profile is locked from household head edits.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link href="/dashboard" className="px-6 py-3 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta">
              Go to Your Member Dashboard →
            </Link>
            <Link href="/directory" className="px-6 py-2.5 rounded-full text-xs font-bold text-body-heading hover:bg-canvas-warm border border-brand-accent/30">
              Browse Global Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
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

      <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-5">
        {/* Token Input Section */}
        <div>
          <label className="block text-xs font-bold text-body-heading mb-1.5">
            Invite Claim Token
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={claimToken}
              onChange={(e) => setClaimToken(e.target.value)}
              onBlur={handleTokenBlur}
              placeholder="e.g. CLM_9cc6236e_X89K2A"
              className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="button"
              onClick={() => fetchDetails(claimToken)}
              disabled={isLoadingDetails || !claimToken.trim()}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-canvas-warm text-brand-primary border border-brand-accent hover:bg-white transition-all shrink-0"
            >
              {isLoadingDetails ? "Checking..." : "Verify Token"}
            </button>
          </div>
          {tokenError && (
            <p className="text-[11px] font-semibold text-red-600 mt-1.5">{tokenError}</p>
          )}
        </div>

        {/* Member Profile Preview Card */}
        {memberDetails && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-brand-accent/40 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary block">
              Profile Being Claimed:
            </span>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-brand-primary">{memberDetails.fullName}</h3>
                <p className="text-[11px] text-body-muted">
                  Relation: <strong>{memberDetails.relationToHead}</strong> • Gotra: <strong>{memberDetails.gotra}</strong> • Family ID: <strong>#{memberDetails.householdCode}</strong>
                </p>
                {memberDetails.fatherName && (
                  <p className="text-[11px] text-body-muted">s/o {memberDetails.fatherName}</p>
                )}
              </div>
              {memberDetails.alreadyClaimed ? (
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-300">
                  Already Claimed 🔒
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  Ready to Claim ✓
                </span>
              )}
            </div>
          </div>
        )}

        {/* Claim Verification Form */}
        {memberDetails && !memberDetails.alreadyClaimed && (
          <form onSubmit={handleClaim} className="space-y-4 pt-2 border-t border-brand-accent/20">
            <div>
              <label className="block text-xs font-bold text-body-heading mb-1.5">
                Verification Channel
              </label>
              <div className="flex gap-4 text-xs mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="claimContactType"
                    checked={contactType === "phone"}
                    onChange={() => {
                      setContactType("phone");
                      setContactValue("");
                      setContactConflict(null);
                      setOtpSent(false);
                    }}
                    className="text-brand-primary focus:ring-brand-primary"
                  />
                  <span>Mobile (WhatsApp)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="claimContactType"
                    checked={contactType === "email"}
                    onChange={() => {
                      setContactType("email");
                      setContactValue("");
                      setContactConflict(null);
                      setOtpSent(false);
                    }}
                    className="text-brand-primary focus:ring-brand-primary"
                  />
                  <span>Email Address</span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type={contactType === "phone" ? "tel" : "email"}
                  value={contactValue}
                  onChange={(e) => handleContactChange(e.target.value)}
                  placeholder={contactType === "phone" ? "+91 98765 43210" : "member@example.com"}
                  className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:ring-2 focus:ring-brand-primary"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || !contactValue.trim() || !!contactConflict}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-canvas-warm text-brand-primary border border-brand-accent hover:bg-white transition-all shrink-0"
                >
                  {isSendingOtp ? "Sending..." : (otpSent ? "Resend OTP" : "Send OTP")}
                </button>
              </div>

              {contactConflict && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] font-semibold text-red-700 mt-2">
                  ⚠️ {contactConflict}
                </div>
              )}
              {otpMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 mt-2">
                  {otpMessage}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-body-heading mb-1.5">
                Enter 6-Digit Verification Passcode (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading bg-canvas-warm/30 focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !otpSent || otp.length !== 6}
              className={`w-full py-3 rounded-full text-xs font-bold text-white transition-all shadow-goldCta ${
                !isVerifying && otpSent && otp.length === 6
                  ? "va-btn-join cursor-pointer"
                  : "bg-gray-400 cursor-not-allowed opacity-60"
              }`}
            >
              {isVerifying ? "Verifying..." : "Verify & Claim Independent Profile →"}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-brand-accent/20 text-center text-[11px] text-body-muted">
          Need assistance? Contact Foundation Support at <strong>support@agarwal-foundation.org</strong>
        </div>
      </div>
    </div>
  );
}

export default function MemberClaimPage() {
  return (
    <main className="py-10 bg-canvas-page min-h-[75vh]">
      <Suspense fallback={<div className="text-center text-xs text-body-muted py-12">Loading claim verification...</div>}>
        <ClaimContent />
      </Suspense>
    </main>
  );
}