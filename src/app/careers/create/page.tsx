'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCareerProfileAction } from "@/actions/career";
import { getCurrentHouseholdDashboard } from "@/actions/dashboard";
import type { CareerLevel, PrimaryDomain, SeekingStatus, WorkplacePreference } from "@/types/career";
import type { Member } from "@/types/household";

const DOMAIN_OPTIONS: PrimaryDomain[] = [
  "Technology & Engineering",
  "Finance & Accounting",
  "Manufacturing & Industrial",
  "Retail & FMCG",
  "Healthcare & Pharma",
  "Legal & Compliance",
  "Real Estate & Infrastructure",
  "Consulting & Strategy",
  "Marketing & Media",
  "Other",
];

const SENIORITY_OPTIONS: { value: CareerLevel; label: string }[] = [
  { value: "student_intern", label: "Student / Intern (College student seeking internship)" },
  { value: "fresher", label: "Fresher / Early Career (0 - 2 Years Experience)" },
  { value: "mid_level", label: "Mid-Level Professional (3 - 7 Years Experience)" },
  { value: "senior", label: "Senior Leader / Manager (8 - 15 Years Experience)" },
  { value: "executive", label: "Executive / C-Suite / VP / Director (15+ Years)" },
  { value: "consultant", label: "Consultant / Advisory / Freelancer" },
];

const SEEKING_STATUS_OPTIONS: { value: SeekingStatus; label: string; desc: string }[] = [
  { value: "actively_looking", label: "🟢 Actively Looking", desc: "Actively applying and available for interviews" },
  { value: "open_to_offers", label: "🟡 Open to Offers", desc: "Employed, but open to compelling leadership roles" },
  { value: "not_looking", label: "⚪ Not Looking", desc: "Content in current role; networking only" },
  { value: "mentoring_only", label: "🤝 Mentoring Only", desc: "Not seeking jobs; available to guide community youth" },
];

export default function CreateCareerProfilePage() {
  const router = useRouter();

  // Wizard Step State (1 to 4)
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);

  // Household & Member Data
  const [members, setMembers] = useState<Member[]>([]);

  // Step 1: Member & Headline
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [headline, setHeadline] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState<PrimaryDomain>("Technology & Engineering");
  const [careerLevel, setCareerLevel] = useState<CareerLevel>("mid_level");
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentDesignation, setCurrentDesignation] = useState("");
  const [isConfidentialMode, setIsConfidentialMode] = useState(false);

  // Step 2: Experience & Education
  const [yearsOfExperience, setYearsOfExperience] = useState(3);
  const [educationHighest, setEducationHighest] = useState("");
  const [educationInstitution, setEducationInstitution] = useState("");
  const [bio, setBio] = useState("");

  // Step 3: Skills & Resume
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // Step 4: Intent & Mentorship
  const [seekingStatus, setSeekingStatus] = useState<SeekingStatus>("open_to_offers");
  const [workplacePreference, setWorkplacePreference] = useState<WorkplacePreference>("flexible");
  const [locationInput, setLocationInput] = useState("");
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [isMentorAvailable, setIsMentorAvailable] = useState(false);

  // Load household members on mount
  useEffect(() => {
    async function loadHouseholdData() {
      setIsLoading(true);
      try {
        const res = await getCurrentHouseholdDashboard();
        if (!res.success || !res.household) {
          setAuthError("Please log in with an approved family registration.");
          setIsLoading(false);
          return;
        }

        if (res.household.status !== "live") {
          setAuthError("Your household registration is currently pending administrative verification.");
          setIsLoading(false);
          return;
        }

        const validMembers = res.household.members || [];
        setMembers(validMembers);
        if (validMembers.length > 0) {
          setSelectedMemberId(validMembers[0].id);
        }
      } catch (err) {
        setAuthError("Failed to verify user credentials.");
      } finally {
        setIsLoading(false);
      }
    }

    loadHouseholdData();
  }, []);

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleAddLocation = () => {
    const trimmed = locationInput.trim();
    if (trimmed && !preferredLocations.includes(trimmed)) {
      setPreferredLocations([...preferredLocations, trimmed]);
      setLocationInput("");
    }
  };

  const handleRemoveLocation = (locToRemove: string) => {
    setPreferredLocations(preferredLocations.filter((l) => l !== locToRemove));
  };

  // Mock / Base64 upload for resume PDF
  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      alert("Please upload a PDF document (.pdf only).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Resume file size must be under 5MB.");
      return;
    }

    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setResumeUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateStep = (step: number): boolean => {
    setSubmissionError("");
    if (step === 1) {
      if (!selectedMemberId) {
        setSubmissionError("Please select a member.");
        return false;
      }
      if (!headline || headline.trim().length < 5) {
        setSubmissionError("Please enter a professional headline (minimum 5 characters).");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (yearsOfExperience < 0) {
        setSubmissionError("Years of experience cannot be negative.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (skills.length === 0) {
        setSubmissionError("Please add at least 1 key skill tag.");
        return false;
      }
      return true;
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const res = await createCareerProfileAction({
        householdId: "",
        memberId: selectedMemberId,
        headline: headline.trim(),
        primaryDomain,
        careerLevel,
        currentCompany: currentCompany.trim() || undefined,
        currentDesignation: currentDesignation.trim() || undefined,
        yearsOfExperience,
        educationHighest: educationHighest.trim() || undefined,
        educationInstitution: educationInstitution.trim() || undefined,
        skills,
        seekingStatus,
        preferredLocations,
        workplacePreference,
        resumeUrl: resumeUrl || undefined,
        bio: bio.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        isMentorAvailable,
        isConfidentialMode,
      });

      if (!res.success || !res.profile) {
        setSubmissionError(res.error || "Failed to create career profile.");
        setIsSubmitting(false);
        return;
      }

      setCreatedProfileId(res.profile.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setSubmissionError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-warm/40 py-16 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-brand-accent/30 shadow-warm text-center max-w-md w-full">
          <div className="animate-spin text-3xl mb-3">💼</div>
          <h2 className="text-base font-bold text-brand-primary">Verifying Community Credentials...</h2>
          <p className="text-xs text-body-muted mt-1">Checking household status for career profile builder.</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-canvas-warm/40 py-16 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-warm text-center max-w-md w-full">
          <div className="text-3xl mb-3">🔒</div>
          <h2 className="text-base font-bold text-brand-primary">Access Restricted</h2>
          <p className="text-xs text-body-muted mt-2 mb-6">{authError}</p>
          <div className="flex flex-col gap-2">
            <Link href="/login" className="px-5 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon min-h-[38px] flex items-center justify-center">
              Login to Verified Account
            </Link>
            <Link href="/signup" className="px-5 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 min-h-[38px] flex items-center justify-center">
              Register Family Free →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (createdProfileId) {
    return (
      <div className="min-h-screen bg-canvas-warm/40 py-16 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border-2 border-emerald-300 shadow-warm text-center animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✓
          </div>
          <h1 className="text-xl font-bold text-brand-primary mb-2">Career Profile Published!</h1>
          <p className="text-xs text-body-muted leading-relaxed mb-6">
            Your verified Agarwal career profile is now live in the community talent directory. Agarwal business owners and recruiters can discover your profile with zero contact scraping.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/careers" className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon min-h-[38px] flex items-center justify-center gap-1.5 shadow-xs">
              <span>🔍</span>
              <span>Browse Talent Directory</span>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 min-h-[38px] flex items-center justify-center">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-warm/30 py-10 sm:py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header Breadcrumb & Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-body-muted mb-2">
            <Link href="/" className="hover:text-brand-primary">Home</Link>
            <span>/</span>
            <Link href="/careers" className="hover:text-brand-primary">Careers</Link>
            <span>/</span>
            <span className="text-brand-primary font-bold">Profile Builder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-primary">
            Build Individual Career Profile
          </h1>
          <p className="text-xs text-body-muted mt-1 font-devanagari">
            व्यक्तिगत करियर एवं रोजगार प्रोफाइल निर्माण • Showcase your skills and connect with Agarwal enterprises
          </p>
        </div>

        {/* 4-Step Progress Indicator */}
        <div className="bg-white p-4 rounded-2xl border border-brand-accent/30 shadow-xs mb-6">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { num: 1, label: "1. Identity", sub: "पहचान" },
              { num: 2, label: "2. Experience", sub: "अनुभव" },
              { num: 3, label: "3. Skills & CV", sub: "कौशल" },
              { num: 4, label: "4. Intent", sub: "प्राथमिकताएं" },
            ].map((s) => (
              <div
                key={s.num}
                className={`py-2 px-1 rounded-xl transition-all ${
                  currentStep === s.num
                    ? "bg-brand-primary text-white shadow-xs font-bold"
                    : currentStep > s.num
                    ? "bg-emerald-50 text-emerald-800 font-medium"
                    : "bg-canvas-warm/40 text-body-muted"
                }`}
              >
                <div className="text-xs">{s.label}</div>
                <div className="text-[10px] opacity-80 hidden sm:block">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {submissionError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-900 animate-in fade-in">
            ⚠️ {submissionError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm space-y-6">
          {/* STEP 1: IDENTITY & HEADLINE */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <h2 className="text-base font-bold text-brand-primary border-b border-brand-accent/20 pb-2">
                1. Member Selection &amp; Professional Headline (पहचान एवं पद)
              </h2>

              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Select Household Member *
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.relationToHead === "self" ? "Household Head" : m.relationToHead}) - Serial #{m.serialNo || "Pending"}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-body-muted mt-1">
                  Each family member can build their own individual verified profile.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Professional Headline *
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Full-Stack Cloud Architect at TechCorp | 8+ Yrs Distributed Systems"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                />
                <p className="text-[11px] text-body-muted mt-1">
                  A concise 1-line summary that appears in search results.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Primary Industry Domain *
                  </label>
                  <select
                    value={primaryDomain}
                    onChange={(e) => setPrimaryDomain(e.target.value as PrimaryDomain)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  >
                    {DOMAIN_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Career Seniority Stage *
                  </label>
                  <select
                    value={careerLevel}
                    onChange={(e) => setCareerLevel(e.target.value as CareerLevel)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  >
                    {SENIORITY_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Current Company / Employer
                  </label>
                  <input
                    type="text"
                    value={currentCompany}
                    onChange={(e) => setCurrentCompany(e.target.value)}
                    placeholder="e.g. Microsoft, Deloitte, Tata Steel"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Current Designation / Role
                  </label>
                  <input
                    type="text"
                    value={currentDesignation}
                    onChange={(e) => setCurrentDesignation(e.target.value)}
                    placeholder="e.g. Principal Engineer, Tax Consultant"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                </div>
              </div>

              {/* Confidential Mode Toggle */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-brand-accent/40 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confidentialMode"
                  checked={isConfidentialMode}
                  onChange={(e) => setIsConfidentialMode(e.target.checked)}
                  className="w-4 h-4 text-brand-primary rounded border-brand-accent focus:ring-brand-primary mt-0.5"
                />
                <label htmlFor="confidentialMode" className="text-xs text-body-heading cursor-pointer">
                  <span className="font-bold text-brand-primary block">🔒 Enable Confidential Mode</span>
                  <span>Mask your current employer as &quot;Confidential Enterprise&quot; in public searches so you can explore opportunities discreetly.</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: EXPERIENCE & EDUCATION */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <h2 className="text-base font-bold text-brand-primary border-b border-brand-accent/20 pb-2">
                2. Experience &amp; Educational Credentials (अनुभव एवं शिक्षा)
              </h2>

              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Total Years of Professional Experience *
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(parseInt(e.target.value, 10) || 0)}
                  className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Highest Qualification / Degree
                  </label>
                  <input
                    type="text"
                    value={educationHighest}
                    onChange={(e) => setEducationHighest(e.target.value)}
                    placeholder="e.g. B.Tech (CS), CA (Chartered Accountant), MBA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    University / College / Alma Mater
                  </label>
                  <input
                    type="text"
                    value={educationInstitution}
                    onChange={(e) => setEducationInstitution(e.target.value)}
                    placeholder="e.g. IIT Delhi, IIM Ahmedabad, ICAI"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Professional Bio / Executive Summary
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share key career highlights, areas of expertise, and major business accomplishments..."
                  className="w-full p-3.5 rounded-2xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          )}

          {/* STEP 3: SKILLS & CV */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <h2 className="text-base font-bold text-brand-primary border-b border-brand-accent/20 pb-2">
                3. Skills &amp; Resume Attachment (कौशल एवं बायोडाटा)
              </h2>

              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Key Skills &amp; Technologies *
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="e.g. React, Financial Modeling, GST Compliance"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 min-h-[38px]"
                  >
                    + Add Skill
                  </button>
                </div>

                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-canvas-warm/40 border border-brand-accent/20">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-brand-primary border border-brand-accent/40 shadow-2xs"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s)}
                          className="text-body-muted hover:text-red-600 font-bold ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Resume PDF Upload */}
              <div className="p-4 rounded-2xl bg-canvas-warm/30 border border-brand-accent/30 space-y-2">
                <label className="block text-xs font-bold text-body-heading">
                  Upload Resume / CV (PDF Only, Max 5MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeFileChange}
                  className="block w-full text-xs text-body-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-brand-accent/40 file:text-xs file:font-bold file:bg-white file:text-brand-primary hover:file:bg-amber-50 cursor-pointer"
                />
                {resumeFileName && (
                  <p className="text-xs font-bold text-emerald-800">
                    ✓ Attached: {resumeFileName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-body-heading mb-1.5">
                    Portfolio / GitHub / Personal Website
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: INTENT & MENTORSHIP */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <h2 className="text-base font-bold text-brand-primary border-b border-brand-accent/20 pb-2">
                4. Career Intent &amp; Mentorship Preferences (प्राथमिकताएं)
              </h2>

              <div>
                <label className="block text-xs font-bold text-body-heading mb-2">
                  Current Job Seeking Status *
                </label>
                <div className="space-y-2">
                  {SEEKING_STATUS_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        seekingStatus === opt.value
                          ? "bg-amber-50/80 border-brand-primary shadow-xs"
                          : "bg-canvas-warm/20 border-brand-accent/30 hover:bg-canvas-warm/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="seekingStatus"
                        value={opt.value}
                        checked={seekingStatus === opt.value}
                        onChange={() => setSeekingStatus(opt.value)}
                        className="w-4 h-4 text-brand-primary focus:ring-brand-primary mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold text-brand-primary">{opt.label}</div>
                        <div className="text-[11px] text-body-muted">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Workplace Mode Preference
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "flexible", label: "Flexible" },
                    { id: "remote", label: "Remote Only" },
                    { id: "hybrid", label: "Hybrid" },
                    { id: "onsite", label: "On-Site" },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWorkplacePreference(w.id as WorkplacePreference)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition min-h-[38px] ${
                        workplacePreference === w.id
                          ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                          : "bg-canvas-warm/40 text-body-heading border-brand-accent/30 hover:bg-white"
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Preferred Target Cities / Regions
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLocation();
                      }
                    }}
                    placeholder="e.g. New Delhi, Bengaluru, Dubai, Singapore"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 min-h-[38px]"
                  >
                    + Add City
                  </button>
                </div>
                {preferredLocations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-canvas-warm/40 border border-brand-accent/20">
                    {preferredLocations.map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-brand-primary border border-brand-accent/40 shadow-2xs"
                      >
                        📍 {l}
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(l)}
                          className="text-body-muted hover:text-red-600 font-bold ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Mentorship Bridge Toggle */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="mentorAvailable"
                  checked={isMentorAvailable}
                  onChange={(e) => setIsMentorAvailable(e.target.checked)}
                  className="w-4 h-4 text-emerald-700 rounded border-emerald-400 focus:ring-emerald-600 mt-0.5"
                />
                <label htmlFor="mentorAvailable" className="text-xs text-emerald-950 cursor-pointer">
                  <span className="font-bold text-emerald-900 block">🤝 I am open to mentoring community youth</span>
                  <span>Guide college students, review resumes, or offer industry advice to younger Agarwal professionals.</span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation & Submit Controls */}
          <div className="pt-4 border-t border-brand-accent/20 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-body-heading bg-canvas-warm hover:bg-canvas-warm/70 border border-brand-accent/40 min-h-[38px]"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon min-h-[38px] shadow-xs"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta min-h-[38px] flex items-center gap-2"
              >
                <span>{isSubmitting ? "Publishing Profile..." : "✓ Publish Career Profile"}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
