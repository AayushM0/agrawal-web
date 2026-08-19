'use client';

import { createClaimInvite } from "@/actions/claim";


import React, { useState } from "react";
import Link from "next/link";
import { initialMockHouseholds } from "@/data/mockMembers";
import { Member } from "@/types/household";

export default function DashboardPage() {
  const [household, setHousehold] = useState(initialMockHouseholds[0]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyClaimLink = async (memberId: string) => {
    const res = await createClaimInvite(memberId);
    if (res.success && res.claimUrl) {
      navigator.clipboard.writeText(res.claimUrl);
      setCopiedToken(memberId);
      setTimeout(() => setCopiedToken(null), 2500);
    }
  };

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
                {household.headName}&apos;s Family
              </h1>
              <p className="text-xs text-body-muted mt-0.5">
                Gotra: <strong>{household.gotra}</strong> • Native Place: <strong>{household.nativePlace}</strong>
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <span className="text-xs font-mono font-bold bg-canvas-warm border border-brand-accent px-3 py-1 rounded-full text-brand-primary">
                #{household.householdCode}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                ✓ Status: LIVE (Verified)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs text-center">
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Total Members</span>
              <strong className="text-base text-brand-primary">{household.members.length}</strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Self-Claimed</span>
              <strong className="text-base text-brand-primary">
                {household.members.filter((m) => m.verifiedBySelf).length}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Head Managed</span>
              <strong className="text-base text-brand-primary">
                {household.members.filter((m) => !m.verifiedBySelf).length}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-canvas-warm/40 border border-brand-accent/20">
              <span className="text-body-muted block text-[11px]">Directory Visibility</span>
              <strong className="text-base text-emerald-700">Active</strong>
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
            <Link
              href="/signup"
              className="px-4 py-2 rounded-full text-xs font-bold text-white va-btn-maroon shrink-0"
            >
              + Add Family Member
            </Link>
          </div>

          <div className="space-y-4">
            {household.members.map((m) => (
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

                  <p className="text-xs text-body-heading">{m.profession}</p>
                  <p className="text-[11px] text-body-muted">
                    {m.currentCity}, {m.currentCountry} • DOB: {m.dob}
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
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyClaimLink(m.id)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-primary bg-white border border-brand-accent hover:bg-canvas-warm transition-all"
                      >
                        {copiedToken === m.id ? "✓ Link Copied!" : "Invite to Claim"}
                      </button>
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}