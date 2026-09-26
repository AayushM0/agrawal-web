'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createJobPostingAction } from "@/actions/career";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import type { JobType, WorkplaceType } from "@/types/career";
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

export default function CreateJobPostingPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  // Household & Member Data
  const [members, setMembers] = useState<Member[]>([]);
  const [householdId, setHouseholdId] = useState("");

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
      <div className="min-h-screen bg-slate-900 py-16 px-4 flex items-center justify-center">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Verifying Credentials</h2>
          <p className="text-slate-400 text-sm">Validating approved household membership...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-900 py-16 px-4 flex items-center justify-center">
        <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-300 text-sm mb-6">{authError}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition"
            >
              Sign In
            </Link>
            <Link
              href="/careers"
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl text-sm transition"
            >
              Back to Careers Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (createdJobId) {
    return (
      <div className="min-h-screen bg-slate-900 py-16 px-4 flex items-center justify-center">
        <div className="bg-slate-800 border border-emerald-500/30 rounded-2xl p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Job Opening Published!</h2>
          <p className="text-slate-300 text-sm mb-6">
            Your career opportunity is now live in the Global Agarwal Jobs & Careers Network. Verified community members can now apply directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/careers/jobs/${createdJobId}`}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
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
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl text-sm transition"
            >
              Post Another Opening
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/careers" className="hover:text-amber-400 transition">
            Careers Network
          </Link>
          <span>/</span>
          <span className="text-white">Post Opening</span>
        </div>

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-slate-800 to-slate-800 border border-amber-500/20 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-full uppercase tracking-wider">
              Enterprise Hiring
            </span>
            <span className="text-xs text-slate-400">Pillar 4: Jobs & Careers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Post an Opening to the Community
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Connect directly with verified Agarwal talent, interns, executives, and specialists. All applicant communications route seamlessly within the platform.
          </p>
        </div>

        {submissionError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-3">
            <span>⚠️</span>
            <span>{submissionError}</span>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Poster Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Posting on Behalf of Member <span className="text-amber-400">*</span>
            </label>
            <select
              value={postedByMemberId}
              onChange={(e) => setPostedByMemberId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.relationToHead || "Member"})
                </option>
              ))}
            </select>
          </div>

          {/* Job Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Job Title <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lead Full-Stack Engineer"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Company / Enterprise Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Agrawal Logistics Pvt Ltd"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Industry & Employment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Industry Sector <span className="text-amber-400">*</span>
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Employment Type <span className="text-amber-400">*</span>
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
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
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Workplace Model <span className="text-amber-400">*</span>
              </label>
              <select
                value={workplaceType}
                onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {WORKPLACE_OPTIONS.map((wp) => (
                  <option key={wp.value} value={wp.value}>
                    {wp.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Bengaluru, Delhi NCR"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Experience & Salary Range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Min Exp (Years)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={experienceMin}
                onChange={(e) => setExperienceMin(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Max Exp (Years)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={experienceMax ?? ""}
                onChange={(e) => setExperienceMax(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="Optional"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Compensation / Range
              </label>
              <input
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="e.g. ₹18 - 25 LPA"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Skills Required */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Key Skills / Technologies
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="e.g. React, Next.js, Financial Modeling"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition"
              >
                Add
              </button>
            </div>
            {skillsRequired.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {skillsRequired.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-medium"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      className="text-amber-400 hover:text-white"
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Role Overview & Responsibilities <span className="text-amber-400">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline what the candidate will be doing, team setup, and day-to-day responsibilities..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Requirements & Qualifications
            </label>
            <textarea
              rows={3}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Minimum degree, proven track record, domain experience, leadership qualities..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
            <Link
              href="/careers"
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl text-sm transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? "Publishing Opening..." : "Publish Job Opening"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
