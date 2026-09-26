'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getCareerProfileByIdAction } from "@/actions/career";
import type { CareerProfile } from "@/types/career";

export default function CareerProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectMessage, setConnectMessage] = useState("");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await getCareerProfileByIdAction(id);
        if (res.success && res.profile) {
          setProfile(res.profile);
        } else {
          setError(res.error || "Candidate profile not found.");
        }
      } catch (err) {
        setError("Failed to load candidate profile.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  const handleSendConnectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    // Simulate connection / message request dispatch
    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => {
        setShowConnectModal(false);
        setSentSuccess(false);
        setConnectMessage("");
      }, 2000);
    }, 600);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-warm/30 py-16 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-brand-accent/30 shadow-warm text-center max-w-sm w-full">
          <div className="animate-spin text-3xl mb-3">💼</div>
          <h2 className="text-sm font-bold text-brand-primary">Loading Verified Career Profile...</h2>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-canvas-warm/30 py-16 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-warm text-center max-w-md w-full">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-base font-bold text-brand-primary mb-2">Profile Unavailable</h2>
          <p className="text-xs text-body-muted mb-6">{error || "This career profile could not be loaded."}</p>
          <Link
            href="/careers"
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon min-h-[38px] inline-flex items-center"
          >
            ← Back to Talent Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-warm/20 py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/careers"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
          >
            ← Back to Talent Directory
          </Link>

          <span className="text-xs font-semibold capitalize text-body-muted bg-white px-3 py-1 rounded-full border border-brand-accent/30">
            Status: {profile.seekingStatus.replace(/_/g, " ")}
          </span>
        </div>

        {/* Profile Showcase Card */}
        <div className="bg-white rounded-3xl border border-brand-accent/30 p-6 sm:p-10 shadow-warm space-y-8">
          {/* Header Identity Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-brand-accent/20">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center text-xl shrink-0 border-2 border-brand-accent/40 shadow-xs">
                {profile.fullName?.charAt(0)?.toUpperCase() || "A"}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-brand-primary">
                    {profile.fullName || "Community Member"}
                  </h1>
                  {profile.serialNo && (
                    <span className="text-xs font-mono font-bold bg-canvas-warm px-2 py-0.5 rounded-md border border-brand-accent/30 text-brand-primary">
                      #{profile.serialNo}
                    </span>
                  )}
                  {profile.gotra && (
                    <span className="text-xs font-bold va-badge-gold px-2.5 py-0.5 rounded-full">
                      Gotra: {profile.gotra}
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-body-heading mb-2">
                  {profile.headline}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-body-muted">
                  {profile.nativePlace && (
                    <p>
                      <strong>Ancestral Native:</strong> {profile.nativePlace}
                    </p>
                  )}
                  {profile.city && (
                    <p>
                      <strong>Current Location:</strong> {profile.city}, {profile.state || profile.country || "India"}
                    </p>
                  )}
                  {profile.currentCompany && (
                    <p>
                      <strong>Current Organization:</strong> {profile.currentCompany}
                    </p>
                  )}
                  {profile.currentDesignation && (
                    <p>
                      <strong>Designation:</strong> {profile.currentDesignation}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta flex items-center justify-center gap-2 min-h-[38px]"
              >
                <span>💬</span>
                <span>Request Connection</span>
              </button>

              {profile.resumeUrl && (
                <a
                  href={profile.resumeUrl}
                  download="resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2 rounded-full text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 shadow-xs flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <span>📄</span>
                  <span>Download CV (PDF)</span>
                </a>
              )}
            </div>
          </div>

          {/* Mentorship Highlight Card */}
          {profile.isMentorAvailable && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-3">
              <span className="text-xl">🤝</span>
              <div>
                <span className="font-bold text-emerald-900 block">Available for Community Mentorship</span>
                <span className="leading-relaxed">
                  This professional is open to mentoring students and junior professionals in the Agarwal community with resume reviews, interview prep, and career strategy.
                </span>
              </div>
            </div>
          )}

          {/* Section: Professional Overview */}
          {profile.bio && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Professional Overview (परिचय)
              </h2>
              <p className="text-xs text-body-text leading-relaxed whitespace-pre-line bg-canvas-warm/20 p-4 rounded-2xl border border-brand-accent/20">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Section: Credentials & Experience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                Career Trajectory &amp; Seniority
              </h2>
              <div className="space-y-1.5 text-xs text-body-heading">
                <p><strong>Primary Domain:</strong> {profile.primaryDomain}</p>
                <p><strong>Total Experience:</strong> {profile.yearsOfExperience} Years</p>
                <p className="capitalize"><strong>Seniority Stage:</strong> {profile.careerLevel.replace(/_/g, " ")}</p>
                <p className="capitalize"><strong>Workplace Mode:</strong> {profile.workplacePreference}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                Educational Background
              </h2>
              <div className="space-y-1.5 text-xs text-body-heading">
                <p><strong>Highest Qualification:</strong> {profile.educationHighest || "Not Specified"}</p>
                <p><strong>University / College:</strong> {profile.educationInstitution || "Not Specified"}</p>
              </div>
            </div>
          </div>

          {/* Section: Skills & Tags */}
          {profile.skills && profile.skills.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Core Skills &amp; Competencies (कौशल)
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-canvas-warm/70 text-brand-primary border border-brand-accent/30 shadow-2xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section: External Links */}
          {(profile.linkedinUrl || profile.portfolioUrl) && (
            <div className="pt-4 border-t border-brand-accent/20 flex items-center gap-4 flex-wrap">
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
                >
                  <span>🔗 LinkedIn Profile</span>
                </a>
              )}
              {profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
                >
                  <span>💻 Portfolio / GitHub</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* In-Platform Connection Request Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-brand-accent/40 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-brand-primary mb-1">
              Connect with {profile.fullName || "Member"}
            </h3>
            <p className="text-xs text-body-muted mb-4 leading-relaxed">
              Your inquiry will be sent securely through the platform. Your message will be routed without exposing raw contact details.
            </p>

            {sentSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center">
                ✓ Connection request dispatched successfully!
              </div>
            ) : (
              <form onSubmit={handleSendConnectionRequest} className="space-y-4">
                <textarea
                  rows={4}
                  required
                  value={connectMessage}
                  onChange={(e) => setConnectMessage(e.target.value)}
                  placeholder="Introduce yourself, your enterprise or career opportunity, or mentorship inquiry..."
                  className="w-full p-3.5 rounded-2xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="px-4 py-2 rounded-full text-xs font-bold text-body-muted hover:bg-canvas-warm min-h-[38px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-2 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta min-h-[38px]"
                  >
                    {isSending ? "Sending..." : "Send Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
