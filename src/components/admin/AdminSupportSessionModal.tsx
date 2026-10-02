'use client';

import React, { useState, useEffect, useCallback } from "react";
import type { Household } from "@/types/household";
import type { AdminSupportSession } from "@/types/support-session";
import {
  requestAdminSupportSession,
  verifyAdminSupportSession,
  getActiveSupportSessionAction,
  revokeAdminSupportSessionAction,
} from "@/actions/support-session";
import AdminSupportCorrectionForm from "./AdminSupportCorrectionForm";
import { ShieldCheck, KeyRound, Clock, UserCheck } from "./AdminSupportIcons";

interface AdminSupportSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household | null;
  initialMemberId?: string | null;
  initialSession?: AdminSupportSession | null;
  onSessionChanged?: () => void;
  onSessionRevoked?: () => void;
}

export default function AdminSupportSessionModal({
  isOpen,
  onClose,
  household,
  initialMemberId,
  initialSession,
  onSessionChanged,
  onSessionRevoked,
}: AdminSupportSessionModalProps) {
  // Modal step state: 'request' | 'verify' | 'active'
  const [step, setStep] = useState<"request" | "verify" | "active">("request");

  // Step 1: Request
  const [reason, setReason] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  // Step 2: OTP Verification
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [maskedRecipient, setMaskedRecipient] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Step 3: Active Session
  const [activeSession, setActiveSession] = useState<AdminSupportSession | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");

  // Error / message state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer calculation for digital countdown pill: format HH:MM:SS (displays time remaining)
  const updateCountdown = useCallback((expiresAt?: string | null) => {
    if (!expiresAt) {
      setRemainingTime("Active");
      return;
    }
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) {
      setRemainingTime("00:00:00");
      return;
    }
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setRemainingTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
  }, []);

  useEffect(() => {
    if (!activeSession?.expiresAt || step !== "active") return;
    updateCountdown(activeSession.expiresAt);
    const interval = setInterval(() => {
      updateCountdown(activeSession.expiresAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, step, updateCountdown]);

  // Initialize or check for existing active session on modal open
  useEffect(() => {
    if (!isOpen || !household) return;

    setErrorMessage(null);
    setOtp("");
    setDevOtp(null);
    setShowRevokeConfirm(false);

    if (initialSession && initialSession.status === "active") {
      const isUnexpired = initialSession.expiresAt && new Date(initialSession.expiresAt).getTime() > Date.now();
      if (isUnexpired) {
        setActiveSession(initialSession);
        setSessionId(initialSession.id);
        setStep("active");
        updateCountdown(initialSession.expiresAt);
        return;
      }
    }

    // Check active session via server action
    getActiveSupportSessionAction({ householdId: household.id }).then((res) => {
      if (res.success && res.session && res.session.status === "active") {
        setActiveSession(res.session);
        setSessionId(res.session.id);
        setStep("active");
        updateCountdown(res.session.expiresAt);
      } else {
        setStep("request");
        setActiveSession(null);
        setSessionId(null);
        setReason("Member requested correction of registration details");
      }
    });
  }, [isOpen, household, initialSession, updateCountdown]);

  if (!isOpen || !household) return null;

  // Selected member information
  const targetMember = initialMemberId
    ? household.members?.find((m) => m.id === initialMemberId)
    : null;

  // Step 1: Send Authorization Code
  const handleRequestAuthorization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setErrorMessage("Please provide a valid reason (minimum 3 characters).");
      return;
    }

    setIsRequesting(true);
    setErrorMessage(null);

    try {
      const res = await requestAdminSupportSession({
        householdId: household.id,
        memberId: initialMemberId || null,
        reason: reason.trim(),
      });

      if (res.success && res.sessionId) {
        setSessionId(res.sessionId);
        setMaskedRecipient(res.maskedRecipient || res.maskedEmail || "registered email");
        if (res.devOtp) setDevOtp(res.devOtp);
        setStep("verify");
      } else {
        setErrorMessage(res.error || "Failed to request authorization. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while requesting authorization.");
    } finally {
      setIsRequesting(false);
    }
  };

  // Step 2: Verify & Activate Session
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !otp.trim()) {
      setErrorMessage("Please enter the 6-digit authorization code.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyAdminSupportSession({
        sessionId,
        otp: otp.trim(),
      });

      if (res.success && res.session) {
        setActiveSession(res.session);
        setStep("active");
        updateCountdown(res.session.expiresAt);
        if (onSessionChanged) onSessionChanged();
      } else {
        setErrorMessage(res.error || "Invalid authorization code. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while verifying code.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 3: End Session Early (Revoke)
  const handleRevokeSession = async () => {
    if (!activeSession) return;

    setIsRevoking(true);
    setErrorMessage(null);

    try {
      const res = await revokeAdminSupportSessionAction({
        sessionId: activeSession.id,
      });

      if (res.success) {
        setActiveSession(null);
        setSessionId(null);
        setStep("request");
        setShowRevokeConfirm(false);
        if (onSessionRevoked) onSessionRevoked();
        if (onSessionChanged) onSessionChanged();
      } else {
        setErrorMessage(res.error || "Failed to revoke support session.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while revoking session.");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border-2 border-brand-accent/40 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-canvas-warm/50 border-b border-brand-accent/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-1">
                Admin Support Workspace • Issue 052
              </span>
              <h2 className="text-base sm:text-lg font-black text-brand-primary truncate">
                Member-Authorized Support Session
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-canvas-warm border border-brand-accent/30 text-body-muted hover:text-brand-primary transition flex items-center justify-center text-sm font-bold shrink-0"
            title="Close support session modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-300 text-xs font-medium text-red-950 animate-in fade-in flex items-start gap-2">
              <span className="text-red-600 font-bold shrink-0">✕</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Request Authorization */}
          {step === "request" && (
            <form onSubmit={handleRequestAuthorization} className="space-y-4">
              <div className="p-4 rounded-2xl bg-canvas-warm/40 border border-brand-accent/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-body-heading">Target Household:</span>
                  <span className="font-mono font-bold text-brand-primary">
                    #{household.serialNo || household.householdCode}
                  </span>
                </div>
                <div className="text-xs text-body-text">
                  <strong>Head:</strong> {household.headName} • <strong>Gotra:</strong> {household.gotra}
                </div>
                {targetMember && (
                  <div className="text-xs text-brand-primary pt-1 border-t border-brand-accent/20 flex items-center gap-1.5 font-medium">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>
                      Target Member: {targetMember.fullName} ({targetMember.relationToHead})
                    </span>
                  </div>
                )}
                <div className="text-xs text-body-muted pt-1">
                  <strong>Registered Contact:</strong> {household.verifiedContact || "On file"}
                </div>
              </div>

              {/* Security Policy Information */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-xs text-amber-950 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>Two-Party Security Invariant</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-900">
                  To eliminate un-audited direct database tampering, administrators cannot unilaterally modify personal profiles.
                  Requesting authorization generates a cryptographic 6-digit passcode delivered to the member&apos;s registered email. Once confirmed, a 24-hour editing window is authorized.
                </p>
              </div>

              {/* Reason input */}
              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Reason for Support Session <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  minLength={3}
                  rows={3}
                  className="w-full p-3 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="e.g. Correcting typo in member full name and gotra as requested via WhatsApp ticket #402"
                />
              </div>

              {/* CTA Button (44px touch target) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRequesting || !reason.trim()}
                  className="w-full h-11 px-5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 shadow-warm transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {isRequesting ? "Sending Authorization Code..." : "Send Authorization Code"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: OTP Verification Dialog */}
          {step === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-300 space-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-200 text-amber-900 mx-auto flex items-center justify-center">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-amber-950">
                  Enter 6-Digit Authorization Passcode
                </h3>
                <p className="text-xs text-amber-900 max-w-md mx-auto">
                  A verification code has been dispatched to the registered email{" "}
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-amber-300">
                    {maskedRecipient}
                  </span>
                  . Please obtain this code from the member to unlock the 24-hour editing session.
                </p>
                {devOtp && (
                  <div className="mt-2 text-[11px] font-mono font-bold text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded inline-block">
                    [Non-Prod Dev Hint: {devOtp}]
                  </div>
                )}
              </div>

              <div>
                <label className="block text-center text-xs font-bold text-body-heading mb-2">
                  Authorization Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  placeholder="••••••"
                  className="w-full text-center text-2xl font-mono font-black tracking-[0.5em] py-3 px-4 bg-canvas-warm/40 border-2 border-brand-primary/40 rounded-xl text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[44px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="flex-1 h-11 px-4 rounded-xl text-xs font-bold text-body-heading bg-canvas-warm hover:bg-canvas-warm/80 border border-brand-accent/30 transition flex items-center justify-center min-h-[44px]"
                >
                  Back to Request
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || otp.trim().length !== 6}
                  className="flex-1 h-11 px-5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 shadow-warm transition flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isVerifying ? "Verifying & Activating..." : "Verify & Activate Session"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Active Session View */}
          {step === "active" && activeSession && (
            <div className="space-y-5">
              {/* Active Session Status & Countdown Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Active Support Session</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-800 block mt-0.5">
                      ⏳ {remainingTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!showRevokeConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowRevokeConfirm(true)}
                      disabled={isRevoking}
                      className="h-10 px-3.5 rounded-xl text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-300 shadow-2xs transition flex items-center gap-1.5 min-h-[40px]"
                      title="Immediately end and revoke this support session"
                    >
                      <span>🔒</span>
                      <span>End Session Early</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRevokeSession}
                        disabled={isRevoking}
                        className="h-10 px-3.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-xs transition flex items-center gap-1.5 min-h-[40px]"
                      >
                        <span>{isRevoking ? "Ending..." : "Confirm End Session"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRevokeConfirm(false)}
                        disabled={isRevoking}
                        className="h-10 px-3 rounded-xl text-xs font-bold text-body-heading bg-white hover:bg-canvas-warm border border-brand-accent/30 transition min-h-[40px]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Embedded Support Correction Form */}
              <AdminSupportCorrectionForm
                sessionId={activeSession.id}
                household={household}
                initialMemberId={initialMemberId}
                onCorrectionSaved={() => {
                  if (onSessionChanged) onSessionChanged();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
