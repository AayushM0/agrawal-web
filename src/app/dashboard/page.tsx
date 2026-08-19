'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import { createClaimInvite } from "@/actions/claim";
import { clearSession } from "@/actions/auth";
import { Household } from "@/types/household";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [sessionContact, setSessionContact] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await getCurrentHouseholdDashboard();
      if (res.success && res.household) {
        setHousehold(res.household);
        setSessionContact(res.sessionContact);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleCopyClaimLink = async (memberId: string) => {
    const res = await createClaimInvite(memberId);
    if (res.success && res.claimUrl) {
      navigator.clipboard.writeText(res.claimUrl);
      setCopiedToken(memberId);
      setTimeout(() => setCopiedToken(null), 2500);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <main className="py-16 bg-canvas-page min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-body-muted">Loading your live household records from database...</p>
        </div>
      </main>
    );
  }

  if (!household) {
    return (
      <main className="py-16 bg-canvas-page">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-8 shadow-warm">
            <h1 className="text-xl font-bold text-brand-primary mb-2">No Registered Household Found</h1>
            <p className="text-xs text-body-muted mb-6">
              You are signed in as <strong>{sessionContact || "Guest"}</strong>, but no family registration is associated with this contact yet.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/signup" className="px-6 py-3 rounded-full text-xs font-bold text-white va-btn-maroon">
                Register Your Family Free →
              </Link>
              <button onClick={handleLogout} className="text-xs text-body-muted hover:underline mt-2">
                Sign Out & Try Another Number
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isLive = household.status === "live";
  const isPending = household.status === "pending_review";
  const isRejected = household.status === "rejected";

  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-5xl mx-auto px-4">
        {/* Top Household Banner */}
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-accent/20">
            <div>
              <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-1 inline-block">
                Head of Household Dashboard • मुखिया डैशबोर्ड
              </span>
              <h1 className="text-2xl font-black text-brand-primary">
                {household.headName ? `${household.headName}'s Family` : "Your Family Household"}
              </h1>
              <p className="text-xs text-body-muted mt-0.5">
                Gotra: <strong>{household.gotra || "Not specified"}</strong> • Native Place: <strong>{household.nativePlace || "Not specified"}</strong>
                {household.verifiedContact && (
                  <span> • Verified Contact: <strong>{household.verifiedContact}</strong></span>
                )}
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <span className="text-xs font-mono font-bold bg-canvas-warm border border-brand-accent px-3 py-1 rounded-full text-brand-primary">
                #{household.householdCode}
              </span>
              {isLive && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  ✓ Status: LIVE (Verified)
                </span>
              )}
              {isPending && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                  ⏳ Status: Pending Community Moderation
                </span>
              )}
              {isRejected && (
                <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-300">
                  ✕ Status: Revision Needed
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-[11px] text-body-muted hover:text-brand-primary hover:underline mt-1"
              >
                Sign Out
              </button>
            </div>
          </div>

          {isPending && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Application Under Verification:</strong> Your registration has been submitted into the community moderation queue. Once approved by a moderator, your family will become searchable across the global directory.
            </div>
          )}

          {isRejected && household.rejectionReason && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
              <strong>Moderator Feedback:</strong> {household.rejectionReason}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs text-center">
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Total Members</span>
              <strong className="text-base text-brand-primary">{household.members?.length || 0}</strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Self-Claimed</span>
              <strong className="text-base text-brand-primary">
                {household.members?.filter((m) => m.verifiedBySelf).length || 0}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Head Managed</span>
              <strong className="text-base text-brand-primary">
                {household.members?.filter((m) => !m.verifiedBySelf).length || 0}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Directory Visibility</span>
              <strong className={`text-base ${isLive ? "text-emerald-700" : "text-amber-700"}`}>
                {isLive ? "Active (Live)" : "Gated (Review)"}
              </strong>
            </div>
          </div>
        </div>

        {/* Member Management List */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-accent/20">
            <div>
              <h2 className="text-lg font-extrabold text-brand-primary">
                Family Members & Claim Status
              </h2>
              <p className="text-xs text-body-muted">
                You have full edit rights on unclaimed members. Self-claimed adult members manage their own data.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {(!household.members || household.members.length === 0) ? (
              <p className="text-xs text-body-muted italic text-center py-6">No family members registered yet.</p>
            ) : (
              household.members.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl border border-brand-accent/30 bg-canvas-warm/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-brand-primary">{m.fullName}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full va-badge-gold uppercase">
                        {m.relationToHead}
                      </span>
                      {m.ownerLocked ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                          🔒 Self-Claimed & Locked
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                          👤 Managed by You
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-body-heading">{m.profession || "Profession not listed"}</p>
                    <p className="text-[11px] text-body-muted">
                      {m.currentCity || household.nativePlace}, {m.currentCountry || "India"} {m.dob && `• DOB: ${m.dob}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.ownerLocked ? (
                      <span
                        title="This adult member has independently verified and manages their own profile."
                        className="text-xs text-body-muted italic px-3 py-1.5"
                      >
                        View-Only
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCopyClaimLink(m.id)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-primary bg-white border border-brand-accent hover:bg-canvas-warm transition-all"
                      >
                        {copiedToken === m.id ? "✓ Link Copied!" : "Invite to Claim"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}