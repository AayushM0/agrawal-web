'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getMemberProfile } from "@/actions/search";
import { revealContact } from "@/actions/reveal";

export default function MemberProfilePage() {
  const params = useParams();
  const memberId = params?.id as string;
  const [member, setMember] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [contactData, setContactData] = useState<{ phone: string; email: string } | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState("");

  useEffect(() => {
    async function loadMember() {
      if (!memberId) return;
      setIsLoading(true);
      const res = await getMemberProfile(memberId);
      if (res.success && res.data) {
        setMember(res.data);
      } else {
        setMember(null);
      }
      setIsLoading(false);
    }
    loadMember();
  }, [memberId]);

  const handleReveal = async () => {
    if (!member) return;
    setIsRevealing(true);
    setRevealError("");
    const res = await revealContact({
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

  if (isLoading) {
    return (
      <main className="py-16 bg-canvas-page min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-body-muted">Loading verified member profile from database...</p>
        </div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="py-16 bg-canvas-page">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-8 shadow-warm">
            <h1 className="text-xl font-bold text-brand-primary mb-2">Member Profile Not Found</h1>
            <p className="text-xs text-body-muted mb-6">
              The requested profile does not exist or is pending community moderation approval.
            </p>
            <Link href="/directory" className="px-6 py-3 rounded-full text-xs font-bold text-white va-btn-maroon inline-block">
              ← Return to Directory Search
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="/directory" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary mb-6 hover:underline">
          ← Back to Directory Search
        </Link>

        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warmLg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-brand-accent/20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border-2 border-brand-accent flex items-center justify-center text-2xl font-black text-brand-primary shadow-sm shrink-0">
              {member.fullName ? member.fullName.charAt(0) : "A"}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-brand-primary">{member.fullName}</h1>
                <span className="text-[11px] font-mono font-bold va-badge-gold px-2 py-0.5 rounded-full">
                  #{member.householdCode}
                </span>
              </div>
              <p className="text-xs font-bold text-brand-gold font-devanagari mb-2">
                Gotra: {member.gotra} {member.relationToHead && `• Relation: ${member.relationToHead.toUpperCase()}`}
              </p>
              <p className="text-xs text-body-heading font-medium">
                {member.profession || "Profession not specified"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-brand-accent/20 text-xs">
            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Location</span>
              <p className="font-semibold text-body-heading">{member.currentCity || member.nativePlace}, {member.currentCountry || "India"}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Ancestral Native Place</span>
              <p className="font-semibold text-body-heading">{member.nativePlace || "Not specified"}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Marital Status & Gender</span>
              <p className="font-semibold text-body-heading">{member.maritalStatus || "Unspecified"} • {member.gender || "Unspecified"}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Age</span>
              <p className="font-semibold text-body-heading">
                {member.visibility?.dob === "members_only" && member.dob ? member.dob : "Protected by privacy preference"}
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
                <p><strong>Phone:</strong> {contactData.phone || "Not provided"}</p>
                <p><strong>Email:</strong> {contactData.email || "Not provided"}</p>
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
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon shadow-sm"
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