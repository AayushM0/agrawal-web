'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getBusinessProfileById } from "@/actions/business";
import type { BusinessProfile } from "@/types/business";

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.id as string;

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isInitiatingChat, setIsInitiatingChat] = useState(false);

  useEffect(() => {
    async function load() {
      if (!businessId) return;
      setIsLoading(true);
      setErrorMsg("");

      try {
        const res = await getBusinessProfileById(businessId);
        if (res.profile) {
          setProfile(res.profile);
          setIsOwner(Boolean(res.isOwner));
        } else {
          setErrorMsg("Business enterprise profile not found or inactive.");
        }
      } catch (err: any) {
        console.error("Error loading business profile:", err);
        setErrorMsg("Failed to load business profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [businessId]);

  const handleCommercialChat = async () => {
    if (!profile) return;
    setIsInitiatingChat(true);

    try {
      // In Task 5, initiateBusinessChat will route directly to Pusher chat
      // For now, redirect to login if guest or /messages with contextual inquiry param
      router.push(`/messages?businessId=${encodeURIComponent(profile.id)}&name=${encodeURIComponent(profile.businessName)}`);
    } catch (err) {
      console.error("Chat initiation error:", err);
    } finally {
      setIsInitiatingChat(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-[70vh] bg-canvas-page py-12 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-xs sm:text-sm text-body-muted">Loading enterprise showcase...</p>
        </div>
      </main>
    );
  }

  if (errorMsg || !profile) {
    return (
      <main className="min-h-[70vh] bg-canvas-page py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-brand-accent/30 rounded-3xl p-8 text-center space-y-5 shadow-warm">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-brand-accent/40 text-brand-primary flex items-center justify-center text-3xl mx-auto">
            🏢
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold text-brand-primary">Enterprise Not Found</h2>
            <p className="text-xs sm:text-sm text-body-muted">
              {errorMsg || "This business profile may have been paused, removed, or is awaiting verification."}
            </p>
          </div>
          <Link
            href="/businesses"
            className="inline-block px-5 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
          >
            ← Back to Business Directory
          </Link>
        </div>
      </main>
    );
  }

  const photos = profile.photos && profile.photos.length > 0 ? profile.photos : [];
  const primaryDirector = profile.linkedDirectors?.find((d) => d.isPrimaryContact) || profile.linkedDirectors?.[0];

  return (
    <main className="min-h-screen bg-canvas-page py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/businesses"
            className="text-xs sm:text-sm font-semibold text-brand-primary hover:text-brand-burgundy transition flex items-center gap-1.5"
          >
            <span>←</span> Back to Business Directory
          </Link>

          {isOwner && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-brand-burgundy border border-amber-300">
                Status: {profile.status.toUpperCase()}
              </span>
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                Manage in Dashboard →
              </Link>
            </div>
          )}
        </div>

        {/* Brand Hero Banner */}
        <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 sm:p-10 shadow-warm space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              {photos.length > 0 ? (
                <img
                  src={photos[0]}
                  alt={profile.businessName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-brand-accent/40 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 border border-brand-accent/40 flex items-center justify-center text-3xl font-serif font-black text-brand-primary shadow-xs shrink-0">
                  {profile.businessName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-black text-brand-primary">
                    {profile.businessName}
                  </h1>
                  {profile.isVerifiedBadge && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Verified Enterprise
                    </span>
                  )}
                </div>

                {profile.legalName && profile.legalName !== profile.businessName && (
                  <p className="text-xs text-body-muted">Legal Entity: {profile.legalName}</p>
                )}

                {profile.tagline && (
                  <p className="text-xs sm:text-sm italic text-body-muted">
                    &ldquo;{profile.tagline}&rdquo;
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-body-muted pt-1">
                  <span>📍 {profile.city}, {profile.state}, {profile.country}</span>
                  {profile.pincode && <span>({profile.pincode})</span>}
                  {profile.yearEstablished && (
                    <span>• Established {profile.yearEstablished}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Commercial Action CTA */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <button
                onClick={handleCommercialChat}
                disabled={isInitiatingChat}
                className="w-full px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-white va-btn-join shadow-goldCta flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>{isInitiatingChat ? "Connecting..." : "Connect / Chat with Business"}</span>
              </button>

              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-5 py-2.5 rounded-full text-xs font-semibold text-center text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/30 transition flex items-center justify-center gap-1.5"
                >
                  <span>🌐</span> Visit Website
                </a>
              )}
            </div>
          </div>

          {/* Badges & Social Links */}
          <div className="pt-4 border-t border-brand-accent/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-brand-burgundy border border-amber-200">
                Industry: {profile.industrySector}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-canvas-warm text-body-heading border border-brand-accent/20">
                Type: {profile.businessType}
              </span>
              {profile.registrationType && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {profile.registrationType} Registered
                </span>
              )}
            </div>

            {/* Social Media Links */}
            {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
              <div className="flex items-center gap-3 text-xs text-body-muted">
                {profile.socialLinks.linkedin && (
                  <a
                    href={profile.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-primary transition"
                  >
                    LinkedIn ↗
                  </a>
                )}
                {profile.socialLinks.twitter && (
                  <a
                    href={profile.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-primary transition"
                  >
                    Twitter/X ↗
                  </a>
                )}
                {profile.socialLinks.facebook && (
                  <a
                    href={profile.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-primary transition"
                  >
                    Facebook ↗
                  </a>
                )}
                {profile.socialLinks.instagram && (
                  <a
                    href={profile.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-primary transition"
                  >
                    Instagram ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Media / Corporate Photo Gallery */}
        {photos.length > 0 && (
          <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-primary flex items-center gap-2">
              <span>📸</span> Corporate Gallery & Facilities ({photos.length})
            </h2>

            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black/5 aspect-video sm:aspect-[21/9] max-h-96 flex items-center justify-center border border-brand-accent/20">
                <img
                  src={photos[activePhotoIdx]}
                  alt={`${profile.businessName} photo ${activePhotoIdx + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {photos.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                        activePhotoIdx === idx
                          ? "border-brand-primary ring-2 ring-brand-primary/30"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* About & Commercial Offerings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Column: About & Narrative */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-primary flex items-center gap-2">
                <span>📖</span> About the Enterprise
              </h2>
              <div className="text-xs sm:text-sm text-body-heading leading-relaxed whitespace-pre-line space-y-2">
                {profile.aboutBusiness}
              </div>

              {profile.addressLine && (
                <div className="pt-4 border-t border-brand-accent/20 text-xs text-body-muted">
                  <span className="font-bold text-body-heading">Registered Address: </span>
                  {profile.addressLine}, {profile.city}, {profile.state} - {profile.pincode}, {profile.country}
                </div>
              )}
            </div>

            {/* Offerings & Products */}
            {profile.offeringsSummary && (
              <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 sm:p-8 shadow-xs space-y-4">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-primary flex items-center gap-2">
                  <span>📦</span> Products, Services & Key Offerings
                </h2>
                <div className="text-xs sm:text-sm text-body-heading leading-relaxed whitespace-pre-line">
                  {profile.offeringsSummary}
                </div>
              </div>
            )}

            {/* Custom Technical Specifications */}
            {profile.customFields && profile.customFields.length > 0 && (
              <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 sm:p-8 shadow-xs space-y-4">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-primary flex items-center gap-2">
                  <span>⚙️</span> Enterprise Specifications & Capabilities
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.customFields.map((field) => (
                    <div
                      key={field.id}
                      className="p-3.5 rounded-xl bg-canvas-warm/60 border border-brand-accent/20 space-y-1"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider text-body-muted">
                        {field.label}
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-body-heading">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Leadership & Community Trust */}
          <div className="space-y-6">
            {/* Leadership & Directors Card */}
            <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 shadow-xs space-y-5">
              <div className="space-y-1">
                <h3 className="font-serif text-base font-bold text-brand-primary flex items-center gap-2">
                  <span>👥</span> Leadership & Promoters
                </h3>
                <p className="text-[11px] text-body-muted">
                  Verified community directors with authenticated lineage records.
                </p>
              </div>

              {profile.linkedDirectors && profile.linkedDirectors.length > 0 ? (
                <div className="space-y-3">
                  {profile.linkedDirectors.map((director, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-canvas-warm/50 border border-brand-accent/20 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-brand-primary">
                            {director.name}
                          </p>
                          <p className="text-xs text-body-muted font-medium">
                            {director.roleTitle}
                          </p>
                        </div>
                        {director.isPrimaryContact && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-brand-burgundy border border-amber-300">
                            Primary Contact
                          </span>
                        )}
                      </div>

                      {director.serialNo && (
                        <p className="text-[11px] text-body-muted">
                          Member ID: <span className="font-mono font-semibold">{director.serialNo}</span>
                        </p>
                      )}

                      <div className="pt-2 border-t border-brand-accent/20">
                        <Link
                          href={`/directory/${director.memberId}`}
                          className="text-xs font-semibold text-brand-primary hover:text-brand-burgundy transition flex items-center gap-1"
                        >
                          View Community Profile →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-body-muted italic">No linked leadership specified.</p>
              )}

              {/* Privacy Shield Notice */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <span>🛡️</span> Zero Telemarketing Privacy
                </div>
                <p className="text-[11px] text-emerald-900 leading-normal">
                  Personal phone numbers and emails are masked. Contact is facilitated through verified in-platform chat to prevent web scraping and corporate unsolicited spam.
                </p>
              </div>
            </div>

            {/* Commercial Inquiry Fast Card */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-3xl border border-brand-accent/40 p-6 text-center space-y-4 shadow-xs">
              <h4 className="font-serif text-sm font-bold text-brand-primary">
                Interested in Trading or Partnering?
              </h4>
              <p className="text-xs text-body-muted leading-relaxed">
                Send a secure commercial inquiry directly to the authorized management of {profile.businessName}.
              </p>
              <button
                onClick={handleCommercialChat}
                disabled={isInitiatingChat}
                className="w-full py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
              >
                Start Commercial Inquiry
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
