'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getJobPostingByIdAction, applyForJobAction } from "@/actions/career";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import type { JobPosting } from "@/types/career";
import type { Member } from "@/types/household";

export default function JobDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [job, setJob] = useState<JobPosting | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Household & Member Data for 1-Click Apply
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [coverNote, setCoverNote] = useState("");

  // Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await getJobPostingByIdAction(id);
        if (res.success && res.job) {
          setJob(res.job);
          if (res.hasApplied) setHasApplied(true);
        } else {
          setError(res.error || "Job opening not found.");
        }

        // Try loading current household members for apply modal
        const hhRes = await getCurrentHouseholdDashboard();
        if (hhRes.success && hhRes.household?.members) {
          setMembers(hhRes.household.members);
          if (hhRes.household.members.length > 0) {
            setSelectedMemberId(hhRes.household.members[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load job details:", err);
        setError("Failed to load job posting.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError("");

    if (!selectedMemberId) {
      setApplyError("Please select a household member to apply.");
      return;
    }

    setIsApplying(true);
    try {
      const res = await applyForJobAction(id, selectedMemberId, coverNote);
      if (!res.success) {
        setApplyError(res.error || "Failed to submit application.");
        return;
      }

      setApplySuccess(true);
      setHasApplied(true);
      setTimeout(() => {
        setShowApplyModal(false);
        setApplySuccess(false);
      }, 2500);
    } catch (err: any) {
      console.error("Apply error:", err);
      setApplyError(err.message || "An unexpected error occurred.");
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 py-16 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-white">Loading Opportunity...</h2>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-900 py-16 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-red-500/30 text-center max-w-md w-full">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-white mb-2">Job Opening Unavailable</h2>
          <p className="text-sm text-slate-400 mb-6">{error || "This opening could not be loaded."}</p>
          <Link
            href="/careers"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center"
          >
            ← Back to Careers Network
          </Link>
        </div>
      </div>
    );
  }

  const formatJobType = (t: string) => {
    switch (t) {
      case "full_time": return "Full Time";
      case "internship": return "Internship";
      case "part_time": return "Part Time";
      case "contract": return "Contract";
      case "advisory": return "Advisory";
      default: return t;
    }
  };

  const formatWorkplace = (w: string) => {
    switch (w) {
      case "hybrid": return "Hybrid";
      case "remote": return "Remote";
      case "on_site": return "Onsite";
      default: return w;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/careers" className="hover:text-amber-400 transition">
            Careers Network
          </Link>
          <span>/</span>
          <span className="text-white truncate">{job.title}</span>
        </div>

        {/* Hero Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-700/60">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-full">
                  {job.industry}
                </span>
                <span className="px-3 py-1 bg-slate-700 text-slate-300 text-xs font-semibold rounded-full">
                  {formatJobType(job.jobType)}
                </span>
                <span className="px-3 py-1 bg-slate-700 text-slate-300 text-xs font-semibold rounded-full">
                  📍 {formatWorkplace(job.workplaceType)}
                </span>
                {job.isVerifiedEnterprise && (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-full flex items-center gap-1">
                    ✓ Verified Enterprise
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {job.title}
              </h1>

              <div className="mt-2 flex items-center gap-3 text-slate-300 text-sm flex-wrap">
                <span className="font-semibold text-amber-400 text-base">{job.companyName}</span>
                {job.city && <span>• {job.city}, {job.country}</span>}
                {job.salaryRange && <span>• <strong className="text-emerald-400 font-semibold">{job.salaryRange}</strong></span>}
                <span>• Exp: {job.experienceMin}{job.experienceMax ? ` - ${job.experienceMax}` : "+"} Years</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:items-end gap-3 shrink-0">
              {hasApplied ? (
                <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold rounded-2xl text-sm flex items-center gap-2">
                  <span>✓</span>
                  <span>Applied</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-2xl text-sm transition shadow-lg shadow-amber-500/25 flex items-center gap-2"
                >
                  <span>Apply with Agarwal Profile</span>
                  <span>→</span>
                </button>
              )}
              <span className="text-xs text-slate-400">
                {job.applicantCount || 0} community members applied
              </span>
            </div>
          </div>

          {/* Details Section */}
          <div className="pt-6 space-y-6">
            {/* Required Skills */}
            {job.skillsRequired && job.skillsRequired.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Required Competencies & Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.skillsRequired.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Overview / Description */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Job Overview & Scope
              </h3>
              <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                {job.description}
              </p>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Prerequisites & Qualifications
                </h3>
                <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  {job.requirements}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Community Trust Notice */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4 text-xs text-slate-400">
          <span className="text-2xl">🔒</span>
          <div>
            <strong className="text-slate-200 block mb-0.5">Direct Gated Communication (ADR-0004)</strong>
            Applications are securely sent to the hiring household. Personal contact numbers and emails are never exposed publicly.
          </div>
        </div>
      </div>

      {/* 1-Click Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowApplyModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold text-white mb-1">
              Apply to {job.title}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              at <span className="text-amber-400 font-semibold">{job.companyName}</span>
            </p>

            {applySuccess ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                <div className="text-3xl mb-2">🎉</div>
                <h3 className="text-emerald-400 font-bold text-base mb-1">Application Submitted!</h3>
                <p className="text-slate-300 text-xs">
                  Your Agarwal Career Profile has been delivered to the hiring enterprise.
                </p>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                {applyError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                    {applyError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Select Applying Household Member
                  </label>
                  {members.length === 0 ? (
                    <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-400">
                      Please log in to your approved household account to apply.
                    </div>
                  ) : (
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.relationToHead || "Member"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Cover Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    placeholder="Briefly highlight why you're interested or your key relevant experience..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                  ⚡ <strong>1-Click Profile Submission:</strong> Your resume, skills, and community verification will be attached automatically.
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isApplying || members.length === 0}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition disabled:opacity-50"
                  >
                    {isApplying ? "Submitting..." : "Submit Application"}
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
