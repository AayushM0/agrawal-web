'use client';

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { allMockMembers } from "@/data/mockMembers";
import { revealContact } from "@/actions/reveal";

export default function MemberProfilePage() {
  const params = useParams();
  const memberId = params?.id as string;
  const [showContact, setShowContact] = useState(false);
  const [contactData, setContactData] = useState<{ phone: string; email: string } | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState("");

  const member = allMockMembers.find((m) => m.id === memberId) || allMockMembers[0];

  const handleReveal = async () => {
    setIsRevealing(true);
    setRevealError("");
    const res = await revealContact({
      viewerUserId: "user-current-session",
      targetMemberId: member.id,
    });
    setIsRevealing(false);

    if (res.success && res.phone && res.email) {
      setContactData({ phone: res.phone, email: res.email });
      setShowContact(true);
    } else {
      setRevealError(res.error || "Unable to reveal contact details.");
    }
  };

  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="/directory" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary mb-6 hover:underline">
          ← Back to Directory Search
        </Link>

        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warmLg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-brand-accent/20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border-2 border-brand-accent flex items-center justify-center text-2xl font-black text-brand-primary shadow-sm shrink-0">
              {member.fullName.charAt(0)}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-brand-primary">{member.fullName}</h1>
                <span className="text-[11px] font-mono font-bold va-badge-gold px-2 py-0.5 rounded-full">
                  {member.householdCode}
                </span>
              </div>
              <p className="text-xs font-bold text-brand-gold font-devanagari mb-2">
                Gotra: {member.gotra} • Relation: {member.relationToHead.toUpperCase()}
              </p>
              <p className="text-xs text-body-heading font-medium">
                {member.profession}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-brand-accent/20 text-xs">
            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Location</span>
              <p className="font-semibold text-body-heading">{member.currentCity}, {member.currentCountry}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Ancestral Native Place</span>
              <p className="font-semibold text-body-heading">{member.nativePlace}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Marital Status & Gender</span>
              <p className="font-semibold text-body-heading">{member.maritalStatus} • {member.gender}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Age</span>
              <p className="font-semibold text-body-heading">
                {member.visibility.dob === "members_only" ? member.dob : "Age visible to verified members"}
              </p>
            </div>
          </div>

          {member.bio && (
            <div className="py-6 border-b border-brand-accent/20">
              <h3 className="text-xs font-bold uppercase text-brand-primary tracking-wider mb-2">About & Seva</h3>
              <p className="text-xs text-body-text leading-relaxed">{member.bio}</p>
            </div>
          )}

          {/* Contact Protection Action */}
          <div className="pt-6">
            <h3 className="text-xs font-bold uppercase text-brand-primary tracking-wider mb-3">
              Direct Community Contact
            </h3>

            {showContact && contactData ? (
              <div className="p-4 rounded-xl bg-canvas-warm border border-brand-accent/40 space-y-2 text-xs">
                <p><strong>Phone:</strong> {contactData.phone}</p>
                <p><strong>Email:</strong> {contactData.email}</p>
                <span className="text-[10px] text-body-muted block pt-1">
                  🔒 Displayed securely under anti-scraping rate limits (Max 50 reveals/day).
                </span>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleReveal}
                  disabled={isRevealing}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  {isRevealing ? "Verifying Access..." : "Reveal Verified Contact Info"}
                </button>
                {revealError && (
                  <p className="text-xs text-red-600 font-semibold mt-2">{revealError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}