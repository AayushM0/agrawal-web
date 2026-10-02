'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createJobPostingAction, getCareerProfileByMemberIdAction } from "@/actions/career";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import type { JobType, WorkplaceType, CareerProfile } from "@/types/career";
import type { Member } from "@/types/household";

const INDUSTRY_OPTIONS = [
  "Technology & Engineering",
  "Finance & Banking",
  "Manufacturing & Industrial",
  "Retail & E-Commerce",
  "Healthcare & Pharmaceuticals",
  "Real Estate & Construction",
  "Legal & Professional Services",
  "Education & EdTech",
  "Textiles & Apparel",
  "FMCG & Consumer Goods",
  "Other",
];

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "full_time", label: "Full Time (Permanent Role)" },
  { value: "internship", label: "Internship (Students / Recent Graduates)" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract / Project Based" },
  { value: "advisory", label: "Board / Strategic Advisor" },
];

const WORKPLACE_OPTIONS: { value: WorkplaceType; label: string }[] = [
  { value: "hybrid", label: "Hybrid (Flexible Onsite/Remote)" },
  { value: "on_site", label: "Onsite (Office / Factory Location)" },
  { value: "remote", label: "Remote (Work From Anywhere)" },
];

export default function CareersPostPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  // Household & Member Data
  const [members, setMembers] = useState<Member[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [careerProfilesMap, setCareerProfilesMap] = useState<Record<string, CareerProfile | null>>({});

  // Form Fields
  const [postedByMemberId, setPostedByMemberId] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("Technology & Engineering");
  const [jobType, setJobType] = useState<JobType>("full_time");
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>("hybrid");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("India");
  const [experienceMin, setExperienceMin] = useState(0);
  const [experienceMax, setExperienceMax] = useState<number | undefined>(undefined);
  const [salaryRange, setSalaryRange] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skillsRequired, setSkillsRequired] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await getCurrentHouseholdDashboard();
        if (!res.success || !res.household) {
          setAuthError("Please log in with an approved family registration to post jobs.");
          setIsLoading(false);
          return;
        }

        if (res.household.status !== "live") {
          setAuthError("Your household registration is pending administrative verification.");
          setIsLoading(false);
          return;
        }

        setHouseholdId(res.household.id);
        const memList = res.household.members || [];
        setMembers(memList);

        // Fetch career profile for all household members
        const cpMap: Record<string, CareerProfile | null> = {};
        for (const m of memList) {
          const cpRes = await getCareerProfileByMemberIdAction(m.id);
          cpMap[m.id] = cpRes.success && cpRes.profile ? cpRes.profile : null;
        }
        setCareerProfilesMap(cpMap);

        if (memList.length > 0) {
          setPostedByMemberId(memList[0].id);
        }
      } catch (err) {
        console.error("Failed to load household data:", err);
        setAuthError("Failed to verify authorization. Please refresh and try again.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const currentPosterProfile = postedByMemberId ? careerProfilesMap[postedByMemberId] : null;

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !skillsRequired.includes(clean)) {
      setSkillsRequired([...skillsRequired, clean]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsRequired(skillsRequired.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError("");

    if (!postedByMemberId) {
      setSubmissionError("Please select the poster member.");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setSubmissionError("Job title must be at least 3 characters.");
      return;
    }
    if (!companyName.trim() || companyName.trim().length < 2) {
      setSubmissionError("Company name must be at least 2 characters.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setSubmissionError("Job description must be at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createJobPostingAction({
        householdId,
        postedByMemberId,
        title: title.trim(),
        companyName: companyName.trim(),
        industry,
        jobType,
        workplaceType,
        city: city.trim() || undefined,
        country: country.trim() || "India",
        experienceMin,
        experienceMax: experienceMax || undefined,
        salaryRange: salaryRange.trim() || undefined,
        description: description.trim(),
        requirements: requirements.trim() || undefined,
        skillsRequired,
      });

      if (!res.success || !res.job) {
        setSubmissionError(res.error || "Failed to post job opening.");
        return;
      }

      setCreatedJobId(res.job.id);
    } catch (err: any) {
      console.error("Job creation error:", err);
      setSubmissionError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-warm/30 py-16 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-brand-accent/30 shadow-warm text-center max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-brand-primary mb-1">Verifying Credentials</h2>
          <p className="text-xs text-body-muted">Looking up live career profile &amp; household...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-canvas-warm/30 py-16 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-warm text-center max-w-md w-full">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-base font-bold text-brand-primary mb-2">Access Restricted</h2>
          <p className="text-xs text-body-muted mb-6">{authError}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon min-h-[38px] inline-flex items-center justify-center"
            >
              Sign In
            </Link>
            <Link
              href="/careers"
              className="px-5 py-2.5 rounded-full text-xs font-bold text-brand-primary border border-brand-accent/40 bg-white hover:bg-canvas-warm min-h-[38px] inline-flex items-center justify-center"
            >
              Back to Careers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (createdJobId) {
    return (
      <div className="min-h-screen bg-canvas-warm/30 py-16 flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-emerald-200 shadow-warm text-center max-w-lg w-full">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-extrabold text-brand-primary mb-2">Job Opening Published!</h2>
          <p className="text-xs text-body-muted mb-6 leading-relaxed">
            Your career opportunity is now live in the Global Agarwal Jobs &amp; Careers Network. Verified community members can now apply directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/careers/jobs/${createdJobId}`}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta min-h-[38px] inline-flex items-center justify-center"
            >
              View Opening →
            </Link>
            <button
              onClick={() => {
                setCreatedJobId(null);
                setTitle("");
                setDescription("");
                setRequirements("");
                setSkillsRequired([]);
              }}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-brand-primary border border-brand-accent/40 bg-white hover:bg-canvas-warm min-h-[38px]"
            >
              Post Another Opening
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-warm/20 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-body-muted">
          <div className="flex items-center gap-2">
            <Link href="/careers" className="hover:text-brand-primary font-medium transition">
              Careers Network
            </Link>
            <span>/</span>
            <span className="font-bold text-brand-primary">Post Opening</span>
          </div>
          <Link
            href="/careers"
            className="hover:underline font-semibold text-brand-primary"
          >
            ← Back to Careers
          </Link>
        </div>

        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-primary/95 text-white p-6 sm:p-8 rounded-3xl shadow-warm">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-300/30 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Enterprise Hiring
            </span>
            <span className="text-[11px] text-white/70">Pillar 4: Jobs &amp; Careers</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Post an Opening to the Community
          </h1>
          <p className="mt-1.5 text-xs text-white/80 leading-relaxed max-w-xl">
            Connect directly with verified Agarwal professionals, graduates, and executives. Applications route securely within the platform.
          </p>
        </div>

        {/* Live Career Profile Context Card */}
        {currentPosterProfile ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center text-lg shrink-0">
                {currentPosterProfile.photoUrl ? (
                  <img
                    src={currentPosterProfile.photoUrl}
                    alt={currentPosterProfile.fullName || "Candidate"}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  currentPosterProfile.fullName?.charAt(0)?.toUpperCase() || "💼"
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-emerald-900">
                    Posting with Live Career Profile: {currentPosterProfile.fullName}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md text-[10px] font-bold">
                    ✓ Live Profile
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-medium">
                  {currentPosterProfile.headline || "Verified Community Professional"}
                </p>
                <p className="text-[11px] text-emerald-700">
                  {currentPosterProfile.currentCompany ? `${currentPosterProfile.currentCompany} • ` : ""}
                  {currentPosterProfile.primaryDomain} • {currentPosterProfile.yearsOfExperience} yrs exp
                </p>
              </div>
            </div>
            <Link
              href={`/careers/${currentPosterProfile.id}`}
              className="text-xs font-bold text-emerald-900 hover:underline shrink-0 bg-white/70 px-3 py-1.5 rounded-xl border border-emerald-300"
            >
              View Profile →
            </Link>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  No Career Profile attached to this member
                </span>
                <span className="text-[11px] text-amber-800 leading-relaxed">
                  You are posting directly as an approved household representative. You can optionally build a candidate profile to increase visibility.
                </span>
              </div>
            </div>
            <Link
              href="/careers/create"
              className="text-xs font-bold text-amber-950 hover:underline shrink-0 bg-white px-3 py-1.5 rounded-xl border border-amber-300"
            >
              + Build Career Profile
            </Link>
          </div>
        )}

        {submissionError && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <span>{submissionError}</span>
          </div>
        )}

        {/* Job Posting Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-brand-accent/30 p-6 sm:p-8 space-y-6 shadow-warm">
          {/* Poster Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
              Posting on Behalf of Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={postedByMemberId}
              onChange={(e) => setPostedByMemberId(e.target.value)}
              className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            >
              {members.map((m) => {
                const hasProfile = Boolean(careerProfilesMap[m.id]);
                return (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.relationToHead || "Member"}) {hasProfile ? "✓ [Live Career Profile]" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Job Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lead Full-Stack Engineer"
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Company / Enterprise Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Agrawal Logistics Pvt Ltd"
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>
          </div>

          {/* Industry & Employment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Industry Sector <span className="text-rose-500">*</span>
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Employment Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {JOB_TYPE_OPTIONS.map((jt) => (
                  <option key={jt.value} value={jt.value}>
                    {jt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Workplace & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Workplace Model <span className="text-rose-500">*</span>
              </label>
              <select
                value={workplaceType}
                onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {WORKPLACE_OPTIONS.map((wp) => (
                  <option key={wp.value} value={wp.value}>
                    {wp.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Bengaluru"
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Experience & Salary Range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Min Exp (Years)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={experienceMin}
                onChange={(e) => setExperienceMin(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Max Exp (Years)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={experienceMax ?? ""}
                onChange={(e) => setExperienceMax(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="Optional"
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                Compensation / Range
              </label>
              <input
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="e.g. ₹18 - 25 LPA"
                className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-3 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Skills Required */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
              Key Skills / Technologies
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="e.g. React, Next.js, Financial Modeling"
                className="flex-1 bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl px-4 py-2.5 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 bg-brand-primary text-white rounded-2xl text-xs font-bold hover:bg-brand-primary/90 transition shadow-xs"
              >
                Add
              </button>
            </div>
            {skillsRequired.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {skillsRequired.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-accent/20 border border-brand-accent/40 text-brand-primary rounded-xl text-xs font-bold"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      className="text-brand-primary hover:text-rose-600 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
              Role Overview &amp; Responsibilities <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline what the candidate will be doing, team setup, and day-to-day responsibilities..."
              className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl p-4 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
              Requirements &amp; Qualifications
            </label>
            <textarea
              rows={3}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Minimum degree, domain experience, leadership qualities..."
              className="w-full bg-canvas-warm/30 border border-brand-accent/40 rounded-2xl p-4 text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-brand-accent/20 flex items-center justify-end gap-3">
            <Link
              href="/careers"
              className="px-5 py-2.5 rounded-full text-xs font-bold text-body-muted hover:bg-canvas-warm min-h-[38px] inline-flex items-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta min-h-[38px] disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing Opening...</span>
                </>
              ) : (
                <span>Publish Job Opening</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
