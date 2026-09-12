'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getMatrimonialProfileDetail,
  updateMatrimonialProfileStatus,
  deleteMatrimonialProfile,
} from "@/actions/matrimony";
import type { MatrimonialProfile } from "@/types/matrimony";

export default function MatrimonyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;

  const [profile, setProfile] = useState<MatrimonialProfile | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      if (!profileId) return;
      setIsLoading(true);
      const res = await getMatrimonialProfileDetail(profileId);
      if (res.isGuest) {
        router.push(`/login?redirect=/matrimony/${profileId}`);
        return;
      }
      if (res.isPendingApproval) {
        router.push("/pending-approval");
        return;
      }
      if (res.success && res.profile) {
        setProfile(res.profile);
        setCanManage(Boolean(res.canManage));
      } else {
        setErrorMsg(res.error || "Profile not found.");
      }
      setIsLoading(false);
    }
    load();
  }, [profileId, router]);

  const handleToggleStatus = async () => {
    if (!profile) return;
    const nextStatus = profile.status === "active" ? "paused" : "active";
    setIsUpdatingStatus(true);
    const res = await updateMatrimonialProfileStatus(profile.id, nextStatus);
    setIsUpdatingStatus(false);
    if (res.success) {
      setProfile({ ...profile, status: nextStatus });
    } else {
      alert(res.error || "Failed to update profile visibility.");
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the matrimonial profile of ${profile.fullName}? This cannot be undone.`
    );
    if (!confirmed) return;

    const res = await deleteMatrimonialProfile(profile.id);
    if (res.success) {
      alert("Matrimonial profile has been deleted.");
      router.push("/matrimony");
    } else {
      alert(res.error || "Failed to delete profile.");
    }
  };

  if (isLoading) {
    return (
      <main className="py-16 bg-canvas-page min-h-[65vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-body-muted">Loading verified matrimonial biodata...</p>
        </div>
      </main>
    );
  }

  if (errorMsg || !profile) {
    return (
      <main className="py-16 bg-canvas-page min-h-[65vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-brand-accent/40 rounded-3xl p-8 text-center shadow-warm space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-700 text-xl flex items-center justify-center mx-auto">
            ✕
          </div>
          <h1 className="font-serif text-xl font-bold text-brand-primary">Profile Unavailable</h1>
          <p className="text-xs text-body-muted">{errorMsg || "This matrimonial profile does not exist or has been paused."}</p>
          <Link
            href="/matrimony"
            className="inline-block px-5 py-2 rounded-full text-xs font-bold text-white va-btn-join"
          >
            Back to Matrimonial Directory
          </Link>
        </div>
      </main>
    );
  }

  const photos = profile.photos && profile.photos.length > 0 ? profile.photos : [];
  const currentPhoto = photos[activePhotoIdx] || photos[0];

  return (
    <main className="py-8 sm:py-12 bg-canvas-page min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Top Breadcrumb & Management Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Link
            href="/matrimony"
            className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Back to All Candidates</span>
          </Link>

          {/* Candidate / Head Self-Governance Controls */}
          {canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  profile.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                ● Status: {profile.status === "active" ? "Live / Visible" : "Paused / Hidden"}
              </span>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isUpdatingStatus}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent hover:bg-canvas-warm/80 transition"
              >
                {profile.status === "active" ? "Pause Profile (Hide)" : "Resume Profile (Go Live)"}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Digital Matrimonial Profile Card */}
        <div className="bg-white border-2 border-brand-accent/40 rounded-3xl overflow-hidden shadow-warmLg">
          
          {/* Traditional Auspicious Header Banner */}
          <div className="bg-[#800020] text-white py-4 px-6 text-center border-b-2 border-brand-accent/50 relative overflow-hidden">
            <div className="flex items-center justify-center gap-4 text-xs sm:text-sm font-bold text-amber-200 font-serif tracking-wider">
              <span>॥ ॐ श्री गणेशाय नमः ॥</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">॥ श्री महाराजा अग्रसेन जी महाराज की जय ॥</span>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            
            {/* Header: Photo Gallery & Primary Info */}
            <div className="flex flex-col md:flex-row items-start gap-6 sm:gap-8 border-b border-brand-accent/20 pb-8">
              
              {/* Photo Gallery (2-3 Photos) */}
              <div className="w-full md:w-72 shrink-0 space-y-3">
                <div className="aspect-3/4 rounded-3xl overflow-hidden bg-brand-accent/15 border-2 border-brand-accent/40 shadow-warm">
                  {currentPhoto ? (
                    <img
                      src={currentPhoto}
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-primary font-black text-4xl">
                      {profile.fullName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {photos.length > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    {photos.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePhotoIdx(idx)}
                        className={`w-14 h-18 rounded-xl overflow-hidden border-2 transition-all ${
                          activePhotoIdx === idx
                            ? "border-brand-primary ring-2 ring-brand-primary/30"
                            : "border-brand-accent/30 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={p} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Core Candidate Header Snapshot */}
              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-brand-gold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      {profile.gender === "male" ? "🤵 वर (Groom)" : "👰 वधू (Bride)"}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ✓ Verified Member
                    </span>
                    <span className="text-xs font-bold text-body-muted">
                      Managed by {profile.createdFor}
                    </span>
                  </div>

                  <h1 className="font-serif text-2xl sm:text-3xl font-black text-brand-primary">
                    {profile.fullName}
                  </h1>

                  <p className="text-sm font-bold text-amber-900 font-devanagari mt-1">
                    गोत्र: {profile.gotra} • मूल निवास: {profile.nativePlace || "Rajasthan/Haryana"}
                  </p>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-canvas-warm/40 border border-brand-accent/20">
                    <span className="text-body-muted block text-[11px]">Age &amp; Birth</span>
                    <strong className="text-brand-primary text-sm">
                      {profile.age !== undefined ? `${profile.age} yrs` : "N/A"}
                    </strong>
                    <span className="block text-[10px] text-body-muted mt-0.5">{profile.dob}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-canvas-warm/40 border border-brand-accent/20">
                    <span className="text-body-muted block text-[11px]">Height &amp; Build</span>
                    <strong className="text-brand-primary text-sm">
                      {profile.heightDisplay || (profile.heightCm ? `${profile.heightCm} cm` : "N/A")}
                    </strong>
                    <span className="block text-[10px] text-body-muted mt-0.5">
                      {profile.weightBuild || "Average"} • {profile.complexion || "Fair"}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-canvas-warm/40 border border-brand-accent/20">
                    <span className="text-body-muted block text-[11px]">Marital Status</span>
                    <strong className="text-brand-primary text-sm">{profile.maritalStatus}</strong>
                    <span className="block text-[10px] text-body-muted mt-0.5">{profile.diet}</span>
                  </div>
                </div>

                {/* Bio */}
                {profile.aboutMe && (
                  <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/30 text-xs text-body-heading leading-relaxed">
                    <strong className="block text-brand-primary mb-1 text-[11px] uppercase tracking-wider">
                      About Candidate (व्यक्तिगत परिचय):
                    </strong>
                    <p>{profile.aboutMe}</p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION: EDUCATION & CAREER */}
            <div className="space-y-3">
              <h2 className="font-serif text-lg font-bold text-brand-primary flex items-center gap-2 border-b border-brand-accent/20 pb-2">
                <span>🎓</span>
                <span>Education &amp; Professional Career (शिक्षा एवं व्यवसाय)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20">
                  <span className="text-body-muted block text-[11px] uppercase font-bold">Highest Qualification</span>
                  <strong className="text-brand-primary text-sm block mt-1">{profile.highestEducation}</strong>
                  {profile.degreeName && <p className="text-body-heading mt-0.5">{profile.degreeName}</p>}
                  {profile.collegeName && <p className="text-body-muted text-[11px] mt-0.5">{profile.collegeName}</p>}
                </div>

                <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20">
                  <span className="text-body-muted block text-[11px] uppercase font-bold">Profession &amp; Sector</span>
                  <strong className="text-brand-primary text-sm block mt-1">{profile.occupationTitle}</strong>
                  {profile.companyName && <p className="text-body-heading mt-0.5">{profile.companyName}</p>}
                  <p className="text-body-muted text-[11px] mt-0.5">{profile.employmentSector}</p>
                </div>

                <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20">
                  <span className="text-body-muted block text-[11px] uppercase font-bold">Work Location &amp; Income</span>
                  <strong className="text-brand-primary text-sm block mt-1">
                    {profile.workCity ? `${profile.workCity}, ${profile.workCountry}` : profile.workCountry}
                  </strong>
                  {profile.annualIncome && (
                    <p className="text-body-heading font-semibold mt-0.5">💰 {profile.annualIncome}</p>
                  )}
                  <p className="text-body-muted text-[11px] mt-0.5">Willing to relocate: {profile.willingToRelocate}</p>
                </div>
              </div>
            </div>

            {/* SECTION: FAMILY BACKGROUND & INTERACTIVE LINKING */}
            <div className="space-y-3">
              <div className="border-b border-brand-accent/20 pb-2">
                <h2 className="font-serif text-lg font-bold text-brand-primary flex items-center gap-2">
                  <span>🏛️</span>
                  <span>Family Background &amp; Verified Lineage (पारिवारिक विवरण)</span>
                </h2>
                <p className="text-[11px] text-body-muted">
                  Click on linked family members to inspect their verified community directory profile.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* Father Card with Interactive Directory Link */}
                <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 space-y-1.5">
                  <span className="text-body-muted block text-[11px] uppercase font-bold">Father&apos;s Details</span>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <strong className="text-brand-primary text-sm">{profile.fatherName}</strong>
                    {profile.fatherMemberId && (
                      <Link
                        href={`/directory/${profile.fatherMemberId}`}
                        className="text-[11px] font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition"
                      >
                        <span>View Member Profile</span>
                        <span>↗</span>
                      </Link>
                    )}
                  </div>
                  {profile.fatherOccupation && (
                    <p className="text-body-heading">Occupation: {profile.fatherOccupation}</p>
                  )}
                </div>

                {/* Mother Card with Interactive Directory Link */}
                <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 space-y-1.5">
                  <span className="text-body-muted block text-[11px] uppercase font-bold">Mother&apos;s Details</span>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <strong className="text-brand-primary text-sm">{profile.motherName}</strong>
                    {profile.motherMemberId && (
                      <Link
                        href={`/directory/${profile.motherMemberId}`}
                        className="text-[11px] font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition"
                      >
                        <span>View Member Profile</span>
                        <span>↗</span>
                      </Link>
                    )}
                  </div>
                  {profile.motherOccupation && (
                    <p className="text-body-heading">Occupation: {profile.motherOccupation}</p>
                  )}
                </div>

                {/* Siblings */}
                {profile.linkedSiblings && profile.linkedSiblings.length > 0 && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 space-y-2">
                    <span className="text-body-muted block text-[11px] uppercase font-bold">Siblings (भाई-बहन)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {profile.linkedSiblings.map((sib, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-white border border-brand-accent/30 flex items-center justify-between gap-2"
                        >
                          <div>
                            <strong className="text-brand-primary">{sib.name}</strong>
                            <span className="text-[11px] text-body-muted ml-1.5">
                              ({sib.relation} • {sib.maritalStatus})
                            </span>
                          </div>
                          {sib.memberId && (
                            <Link
                              href={`/directory/${sib.memberId}`}
                              className="text-[10px] font-bold text-brand-primary hover:underline shrink-0"
                            >
                              Directory ↗
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Family Roots */}
                <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 space-y-1">
                  <span className="text-body-muted block text-[11px] uppercase font-bold">Ancestral Roots</span>
                  <p className="text-body-heading">
                    <strong>Native Place (मूल निवास):</strong> {profile.nativePlace}
                  </p>
                  <p className="text-body-muted">Current Location: {profile.familyLocation}</p>
                </div>

                {/* Family Values */}
                <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 space-y-1">
                  <span className="text-body-muted block text-[11px] uppercase font-bold">Family Type &amp; Values</span>
                  <p className="text-body-heading">
                    {profile.familyType} Family • {profile.familyValues} Values
                  </p>
                  <p className="text-body-muted">Standing: {profile.familyFinancialStatus}</p>
                </div>
              </div>
            </div>

            {/* SECTION: DYNAMIC CUSTOM FIELDS (IF ANY) */}
            {profile.customFields && profile.customFields.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-brand-primary flex items-center gap-2 border-b border-brand-accent/20 pb-2">
                  <span>✨</span>
                  <span>Special Details &amp; Assets (अतिरिक्त विशेष विवरण)</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {profile.customFields.map((f) => (
                    <div key={f.id} className="p-4 rounded-2xl bg-amber-50/60 border border-brand-accent/30 space-y-1">
                      <span className="text-brand-primary block text-[11px] uppercase font-extrabold tracking-wider">
                        {f.label}
                      </span>
                      <p className="text-body-heading font-medium">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION: PARTNER EXPECTATIONS */}
            {profile.partnerPreferences && (
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-brand-primary flex items-center gap-2 border-b border-brand-accent/20 pb-2">
                  <span>🤝</span>
                  <span>Partner Expectations (जीवनसाथी की अपेक्षाएं)</span>
                </h2>

                <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 text-xs space-y-2">
                  <div className="flex flex-wrap gap-4 text-body-heading">
                    {profile.partnerPreferences.minAge && profile.partnerPreferences.maxAge && (
                      <div>
                        <strong>Age Preference:</strong> {profile.partnerPreferences.minAge} to{" "}
                        {profile.partnerPreferences.maxAge} years
                      </div>
                    )}
                    {profile.partnerPreferences.minHeightCm && profile.partnerPreferences.maxHeightCm && (
                      <div>
                        <strong>Height Preference:</strong> {profile.partnerPreferences.minHeightCm} to{" "}
                        {profile.partnerPreferences.maxHeightCm} cm
                      </div>
                    )}
                  </div>
                  {profile.partnerPreferences.notes && (
                    <p className="text-body-muted pt-1">
                      <strong>Notes:</strong> {profile.partnerPreferences.notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* SECTION: FAMILY CONTACT CARD */}
            <div className="p-6 rounded-3xl bg-amber-50 border-2 border-brand-gold/60 text-xs text-body-heading space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                    Verified Family Contact
                  </span>
                  <h3 className="font-serif text-lg font-bold text-brand-primary mt-1">
                    Contact Family for Alliance (रिश्ते हेतु संपर्क)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${profile.contactPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Jai Shree Agrasen Ji 🙏\nI am contacting regarding ${profile.fullName}'s matrimonial profile on Maharaja Agrasen Foundation.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>💬</span>
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-brand-accent/20">
                <div>
                  <span className="text-[11px] text-body-muted block">Contact Person</span>
                  <strong className="text-brand-primary">{profile.contactPerson}</strong>
                  <span className="block text-[11px] text-body-muted">({profile.contactRelation})</span>
                </div>

                <div>
                  <span className="text-[11px] text-body-muted block">Phone Number</span>
                  <strong className="text-brand-primary font-mono">{profile.contactPhone}</strong>
                  {profile.secondaryPhone && (
                    <span className="block text-[11px] text-body-muted font-mono">{profile.secondaryPhone}</span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-body-muted block">Email / Address</span>
                  <strong className="text-brand-primary truncate block">{profile.contactEmail || "On Request"}</strong>
                  <span className="block text-[11px] text-body-muted truncate">
                    {profile.residentialAddress || profile.familyLocation}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
