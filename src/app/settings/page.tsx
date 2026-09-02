'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession } from "@/actions/auth";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import { deleteHouseholdAccount } from "@/actions/account";
import { sendOtp } from "@/actions/otp";

export default function SettingsPage() {
  const router = useRouter();
  const [household, setHousehold] = useState<any | null>(null);
  const [sessionContact, setSessionContact] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Deletion state
  const [otp, setOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function verifyAuth() {
      const session = await getSession();
      if (!session) {
        router.replace("/login?returnUrl=/settings");
      } else {
        setIsAuthChecking(false);
        loadDashboardData();
      }
    }
    verifyAuth();
  }, [router]);

  async function loadDashboardData() {
    setIsLoading(true);
    const res = await getCurrentHouseholdDashboard();
    if (res.success && res.household) {
      setHousehold(res.household);
      setSessionContact(res.sessionContact);
    }
    setIsLoading(false);
  }

  const handleExportData = () => {
    if (!household) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(household, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mafl_family_export_${household.householdCode}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleSendDeletionOtp = async () => {
    if (!household || !household.verifiedContact) return;
    setIsSendingOtp(true);
    setDeleteError("");
    setOtpMessage("");

    const isPhone = !household.verifiedContact.includes("@");
    const res = await sendOtp({
      recipient: household.verifiedContact,
      type: isPhone ? "whatsapp" : "email",
    });

    setIsSendingOtp(false);
    if (res.success) {
      setOtpSent(true);
      setOtpMessage("Security deletion OTP sent successfully to your registered WhatsApp/Email.");
    } else {
      setDeleteError(res.error || "Failed to send verification OTP code.");
    }
  };

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !otp.trim()) {
      setDeleteError("Verification OTP is required to permanently scrub this household.");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await deleteHouseholdAccount({
        householdId: household.id,
        verifiedContact: household.verifiedContact,
        otp: otp.trim(),
      });

      setIsDeleting(false);
      if (res.success) {
        alert(res.message);
        router.push("/");
        router.refresh();
      } else {
        setDeleteError(res.error || "Failed to delete account. Verify the code and try again.");
      }
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteError(err.message || "An unexpected error occurred during account deletion.");
    }
  };

  if (isAuthChecking || isLoading) {
    return (
      <main className="py-16 bg-canvas-page min-h-[60vh] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-body-muted">Loading account settings...</p>
        </div>
      </main>
    );
  }

  if (!household) {
    return (
      <main className="py-12 sm:py-16 bg-canvas-page min-h-[60vh] flex items-center">
        <div className="max-w-md mx-auto px-4 w-full text-center">
          <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm">
            <h1 className="text-lg font-bold text-brand-primary mb-2">No Active Family Profile</h1>
            <p className="text-xs text-body-muted mb-4">Please register or log in first.</p>
            <Link href="/login" className="px-6 py-2 bg-brand-primary text-white text-xs font-bold rounded-full">
              Login to Directory
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-8 sm:py-12 bg-canvas-page min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-1.5 inline-block">
            Dashboard Panel • सेटिंग्स
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-brand-primary">
            Account Settings
          </h1>
          <p className="text-xs text-body-muted mt-1">
            Manage your family profile visibility, export personal data, or permanently delete your record.
          </p>
        </div>

        <div className="space-y-6">
          {/* Section 1: Family Info Summary */}
          <div className="bg-white border border-brand-accent/30 rounded-2xl p-5 sm:p-6 shadow-warm">
            <h2 className="text-sm font-extrabold text-brand-primary mb-3">
              👑 Household Profile Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-canvas-warm/40 rounded-xl border border-brand-accent/25">
                <span className="text-[10px] text-body-muted block">Head of Household Name</span>
                <strong className="text-body-heading">{household.headName}</strong>
              </div>
              <div className="p-3 bg-canvas-warm/40 rounded-xl border border-brand-accent/25">
                <span className="text-[10px] text-body-muted block">Assigned Serial ID (क्रमांक)</span>
                <strong className="font-mono text-brand-primary">#{household.serialNo || household.householdCode}</strong>
              </div>
              <div className="p-3 bg-canvas-warm/40 rounded-xl border border-brand-accent/25">
                <span className="text-[10px] text-body-muted block">Gotra / Lineage</span>
                <strong className="text-brand-gold font-semibold">{household.gotra}</strong>
              </div>
              <div className="p-3 bg-canvas-warm/40 rounded-xl border border-brand-accent/25">
                <span className="text-[10px] text-body-muted block">Verified Contact Identifier</span>
                <strong className="text-body-heading">{household.verifiedContact}</strong>
              </div>
            </div>
            <p className="text-[11px] text-body-muted mt-4">
              📝 <em>Note: To update names, photographs, native places, or visibility policies of individual members, please use the <strong>Edit Profile</strong> buttons directly on the <Link href="/dashboard" className="text-brand-primary hover:underline font-bold">My Dashboard</Link> panel.</em>
            </p>
          </div>

          {/* Section 2: Data Portability (GDPR/DPDP Export) */}
          <div className="bg-white border border-brand-accent/30 rounded-2xl p-5 sm:p-6 shadow-warm">
            <h2 className="text-sm font-extrabold text-brand-primary mb-2">
              📥 Data Portability (Export Family Card)
            </h2>
            <p className="text-xs text-body-muted mb-4 leading-relaxed">
              In compliance with international data privacy rights (including the DPDP framework and GDPR), you have the right to request a copy of all information associated with your household directory record.
            </p>
            <button
              type="button"
              onClick={handleExportData}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-canvas-warm text-brand-primary border border-brand-accent hover:bg-white transition-all shadow-xs"
            >
              Export Family Record (JSON File)
            </button>
          </div>

          {/* Section 3: Permanent Deletion (Dangerous Zone) */}
          <div className="bg-white border border-red-200 rounded-2xl p-5 sm:p-6 shadow-warm">
            <h2 className="text-sm font-extrabold text-red-700 mb-2">
              ⚠️ Permanent Account Deletion (Danger Zone)
            </h2>
            <p className="text-xs text-body-muted mb-4 leading-relaxed font-semibold">
              Deleting your family profile is permanent and irreversible. All personal records, uploaded photographs, and government ID hashes for your household and all associated members will be hard-deleted and completely scrubbed from our active directory databases in compliance with DPDP data hygiene regulations.
            </p>

            {!otpSent ? (
              <button
                type="button"
                onClick={handleSendDeletionOtp}
                disabled={isSendingOtp}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md"
              >
                {isSendingOtp ? "Sending OTP..." : "Send Secure Deletion OTP"}
              </button>
            ) : (
              <form onSubmit={handleDeleteAccountSubmit} className="space-y-3.5 pt-2">
                {otpMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                    ✓ {otpMessage}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Enter Verification OTP Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      setDeleteError("");
                    }}
                    placeholder="Enter 6-digit OTP code"
                    className="w-full max-w-xs px-3 py-2 rounded-xl border border-brand-accent/40 text-xs font-mono text-body-heading focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    required
                  />
                  <span className="text-[10px] text-body-muted block mt-1">
                    Sent to {household.verifiedContact}. Verify identity code to execute cascade database delete.
                  </span>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                    ⚠️ {deleteError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isDeleting}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-red-700 hover:bg-red-800 transition-all shadow-md"
                  >
                    {isDeleting ? "Processing Deletion..." : "Permanently Delete & Scrub Profile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setDeleteError("");
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-body-heading bg-canvas-warm hover:bg-white border border-brand-accent/30"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
