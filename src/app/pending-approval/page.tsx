'use client';

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getApplicationStatus } from "@/actions/register";

function PendingApprovalContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || "";

  const [refInput, setRefInput] = useState(initialRef);
  const [isSearching, setIsSearching] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchStatus = async (ref: string) => {
    if (!ref || ref.trim().length < 2) return;
    setIsSearching(true);
    setErrorMessage("");
    try {
      const res = await getApplicationStatus(ref.trim());
      if (res.found) {
        setStatusResult(res);
      } else {
        setErrorMessage(res.error || "No registration record found for this reference code.");
        setStatusResult(null);
      }
    } catch {
      setErrorMessage("Unable to fetch status at this moment. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      fetchStatus(initialRef);
    }
  }, [initialRef]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refInput.trim()) {
      fetchStatus(refInput.trim());
    }
  };

  return (
    <main className="py-10 sm:py-16 bg-canvas-page min-h-[75vh] flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 w-full">
        {/* Top Community Badge */}
        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block shadow-sm">
            Membership Verification • सदस्यता सत्यापन
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
            Registration Awaiting Verification
          </h1>
          <p className="text-xs sm:text-sm text-body-muted mt-1 max-w-md mx-auto">
            All member submissions undergo administrative audit before directory and matrimonial access are activated.
          </p>
        </div>

        {/* Main Status Container */}
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          {/* Progress Timeline Stepper */}
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold border-2 border-emerald-400 mb-2 shadow-sm">
                  ✓
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-brand-primary">
                  1. Submission
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  Completed
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 mb-2 shadow-sm ${
                    statusResult?.status === "live"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-400"
                      : statusResult?.status === "rejected"
                      ? "bg-red-100 text-red-700 border-red-400"
                      : "bg-amber-100 text-amber-800 border-amber-400 animate-pulse"
                  }`}
                >
                  {statusResult?.status === "live" ? "✓" : statusResult?.status === "rejected" ? "✕" : "⏳"}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-brand-primary">
                  2. Admin Audit
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    statusResult?.status === "live"
                      ? "text-emerald-700"
                      : statusResult?.status === "rejected"
                      ? "text-red-600"
                      : "text-amber-700"
                  }`}
                >
                  {statusResult?.status === "live"
                    ? "Approved"
                    : statusResult?.status === "rejected"
                    ? "Action Needed"
                    : "In Progress"}
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 mb-2 shadow-sm ${
                    statusResult?.status === "live"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-400"
                      : "bg-canvas-warm text-body-muted border-brand-accent/30"
                  }`}
                >
                  {statusResult?.status === "live" ? "✓" : "🔒"}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-brand-primary">
                  3. Activation
                </span>
                <span className="text-[10px] text-body-muted font-medium">
                  {statusResult?.status === "live" ? "Unlocked" : "Locked"}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Status Card */}
          {statusResult ? (
            <div className="mb-6">
              {statusResult.status === "live" ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center mb-4">
                  <span className="text-2xl block mb-2">🎉</span>
                  <h3 className="text-base font-bold text-emerald-900 mb-1">
                    Application Approved & Verified!
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed mb-4">
                    Your family registration has been officially approved by the community moderators. You may now log in to access the directory, download cards, and utilize the matrimonial portal.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-md"
                  >
                    <span>Proceed to Login</span>
                    <span>→</span>
                  </Link>
                </div>
              ) : statusResult.status === "rejected" ? (
                <div className="p-5 rounded-2xl bg-red-50 border border-red-300 text-center mb-4">
                  <span className="text-2xl block mb-2">⚠️</span>
                  <h3 className="text-base font-bold text-red-900 mb-1">
                    Application Requires Attention
                  </h3>
                  <p className="text-xs text-red-800 leading-relaxed mb-2">
                    Your registration application was not approved during administrative verification.
                  </p>
                  {statusResult.rejectionReason && (
                    <div className="p-3 bg-white/80 rounded-xl border border-red-200 text-xs text-red-900 font-medium mb-3">
                      <strong>Reason:</strong> {statusResult.rejectionReason}
                    </div>
                  )}
                  <p className="text-[11px] text-red-700">
                    Please contact our support helpdesk on WhatsApp with your serial number to resolve this.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-300 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⏳</span>
                    <div>
                      <h3 className="text-sm font-bold text-amber-950 mb-1">
                        Application Under Administrative Review
                      </h3>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        Your family record and identity documents are currently queued for verification. To maintain privacy and trust within the Agarwal community, all submissions are manually reviewed before portal activation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Record Summary Box */}
              <div className="p-4 rounded-2xl bg-canvas-warm border border-brand-accent/30 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-brand-accent/20">
                  <span className="text-body-muted font-medium">Assigned Serial No:</span>
                  <span className="font-mono font-bold text-brand-primary text-sm">
                    #{statusResult.serialNo}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-brand-accent/20">
                  <span className="text-body-muted font-medium">Head of Household:</span>
                  <span className="font-bold text-brand-primary">
                    {statusResult.headName}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-brand-accent/20">
                  <span className="text-body-muted font-medium">Family Gotra:</span>
                  <span className="font-semibold text-brand-primary">
                    {statusResult.gotra}
                  </span>
                </div>
                {statusResult.nativePlace && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-body-muted font-medium">Native Place:</span>
                    <span className="font-medium text-body-text">
                      {statusResult.nativePlace}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-canvas-warm border border-brand-accent/30 mb-6 text-center">
              <span className="text-3xl block mb-2">🛡️</span>
              <h3 className="text-sm font-bold text-brand-primary mb-1">
                Moderation & Activation Policy
              </h3>
              <p className="text-xs text-body-muted leading-relaxed max-w-md mx-auto">
                Newly registered households cannot activate their login credentials or access the directory until verified by a community moderator. Verification is typically completed within <strong>24–48 hours</strong>.
              </p>
            </div>
          )}

          {/* Reference Lookup Bar */}
          <form onSubmit={handleSearchSubmit} className="mb-6">
            <label className="block text-[11px] font-bold text-body-muted mb-1.5">
              Check / Refresh Application Status
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="Enter Serial No (#MAFL-...) or registered Mobile/Email"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-brand-accent/40 bg-white text-xs text-body-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              <button
                type="submit"
                disabled={isSearching || !refInput.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white va-btn-maroon shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                {isSearching ? "Checking..." : "Check Status"}
              </button>
            </div>
            {errorMessage && (
              <p className="text-[11px] font-semibold text-red-600 mt-1.5">
                {errorMessage}
              </p>
            )}
          </form>

          {/* Action Links & Community Helpdesk */}
          <div className="border-t border-brand-accent/20 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <Link
              href="/"
              className="text-body-muted hover:text-brand-primary font-medium flex items-center gap-1 transition-colors"
            >
              <span>←</span>
              <span>Back to Home</span>
            </Link>

            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/6592774444?text=Hello%2C%20I%20am%20inquiring%20about%20my%20Agarwal%20Foundation%20membership%20application."
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[11px]"
              >
                <span>💬</span>
                <span>WhatsApp Helpdesk</span>
              </a>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-full bg-canvas-warm text-brand-primary border border-brand-accent/30 font-semibold hover:bg-white transition-colors text-[11px]"
              >
                Member Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense
      fallback={
        <main className="py-20 bg-canvas-page min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-bold text-body-muted">Loading verification status...</p>
          </div>
        </main>
      }
    >
      <PendingApprovalContent />
    </Suspense>
  );
}
