'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getMemberProfile } from "@/actions/search";
import { revealContact } from "@/actions/reveal";
import { calculateAge, maskPhone, maskEmail } from "@/lib/privacy";

export default function MemberProfilePage() {
  const params = useParams();
  const rawId = params?.id as string;
  const memberId = rawId ? decodeURIComponent(rawId) : "";
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

  const age = calculateAge(member.dob);

  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="/directory" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary mb-6 hover:underline">
          ← Back to Directory Search
        </Link>

        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warmLg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-brand-accent/20">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border-2 border-brand-accent flex items-center justify-center text-2xl font-black text-brand-primary shadow-sm shrink-0">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt={member.fullName || "Member"} className="w-full h-full object-cover" />
              ) : (
                member.fullName ? member.fullName.charAt(0) : "A"
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-brand-primary">{member.fullName}</h1>
                <span className="text-[11px] font-mono font-bold va-badge-gold px-2.5 py-0.5 rounded-full">
                  #{member.serialNo || member.householdCode}
                </span>
                {age !== null && (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                    {age} yrs
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-brand-gold font-devanagari mb-1">
                Gotra: {member.gotra} {member.relationToHead && `• Relation: ${member.relationToHead.toUpperCase()}`}
              </p>
              {member.fatherName && (
                <p className="text-xs font-semibold text-body-heading mb-1.5">
                  <span className="text-body-muted">Father&apos;s Name (पिता का नाम):</span> {member.fatherName}
                </p>
              )}
              <p className="text-xs text-body-heading font-medium">
                {member.professionTitle || member.profession || "Profession not specified"}
              </p>
              {member.professionDescription && (
                <p className="text-[11px] text-body-muted italic mt-0.5">
                  &quot;{member.professionDescription}&quot;
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-brand-accent/20 text-xs">
            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Current Location</span>
              <p className="font-semibold text-body-heading">{member.currentCity || member.nativePlace}, {member.currentCountry || "India"}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Ancestral Native Place</span>
              <p className="font-semibold text-body-heading">{member.nativePlace || "Not specified"}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Father&apos;s Full Name</span>
              <p className="font-semibold text-body-heading">{member.fatherName || "Not specified"}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Marital Status &amp; Gender</span>
              <p className="font-semibold text-body-heading">{member.maritalStatus || "Unspecified"} • {member.gender || "Unspecified"}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Calculated Age</span>
              <p className="font-semibold text-body-heading">
                {age !== null ? `${age} years` : "Not specified"}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-body-muted block mb-0.5">Serial Number</span>
              <p className="font-mono font-bold text-brand-primary">
                {member.serialNo || member.householdCode}
              </p>
            </div>
          </div>

          {member.bio && (
            <div className="py-6 border-b border-brand-accent/20">
              <h3 className="text-xs font-bold uppercase text-brand-primary tracking-wider mb-2">About &amp; Seva</h3>
              <p className="text-xs text-body-text leading-relaxed">{member.bio}</p>
            </div>
          )}

          {/* Contact Protection Action */}
          <div className="pt-6">
            <h3 className="text-xs font-bold uppercase text-brand-primary tracking-wider mb-3">
              Direct Community Contact (Privacy Protected)
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
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-canvas-warm/50 border border-brand-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-body-muted block text-[11px]">Contact Preview (Masked):</span>
                    <span className="font-mono font-bold text-body-heading">
                      {member.phone ? maskPhone(member.phone) : "•••• •••• ••••"} • {member.email ? maskEmail(member.email) : "••••@••••.com"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReveal}
                    disabled={isRevealing}
                    className="px-5 py-2 rounded-full text-xs font-bold text-white va-btn-maroon shadow-sm self-start sm:self-auto"
                  >
                    {isRevealing ? "Verifying Access..." : "Reveal Verified Contact Info"}
                  </button>
                </div>
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