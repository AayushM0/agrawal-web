'use client';

import React, { useState, useEffect } from 'react';
import {
  searchMembersForAdminAction,
  adminCreateMatrimonyProfileAction,
  adminCreateCareerProfileAction,
  adminCreateBusinessProfileAction,
  AdminSearchMemberResult,
} from '@/actions/admin-profiles';
import Link from 'next/link';

const CAREER_DOMAINS = [
  "Technology & Software",
  "Finance & Banking",
  "Manufacturing & Operations",
  "Healthcare & Medicine",
  "Education & Research",
  "Legal & Compliance",
  "Sales & Marketing",
  "Human Resources",
  "Consulting & Strategy",
  "Media & Arts",
  "Real Estate & Construction",
  "Other",
];

const BUSINESS_INDUSTRIES = [
  "Technology & Software",
  "Manufacturing & Engineering",
  "Retail & FMCG",
  "Finance, CA & Wealth Management",
  "Healthcare & Pharmaceuticals",
  "Real Estate & Construction",
  "Legal & Corporate Services",
  "Textiles & Apparel",
  "Hospitality & Food",
  "Automotive & Transport",
  "Jewellery & Gems",
  "Other",
];

export default function AdminAssistedProfilesCreator() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AdminSearchMemberResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<AdminSearchMemberResult | null>(null);

  // Active profile creation tab
  const [activeProfileType, setActiveProfileType] = useState<"matrimony" | "career" | "business">("matrimony");

  // Form submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string; linkUrl?: string } | null>(null);

  // Matrimony form fields
  const [matrimonyForm, setMatrimonyForm] = useState({
    highestEducation: "B.Tech / B.E.",
    degreeName: "",
    collegeName: "",
    employmentSector: "Private Sector",
    occupationTitle: "Software Engineer",
    companyName: "",
    annualIncome: "₹15 Lakh - ₹25 Lakh",
    workCity: "",
    workCountry: "India",
    fatherName: "",
    fatherOccupation: "Business Owner",
    motherName: "Smt. Agarwal",
    motherOccupation: "Homemaker",
    familyLocation: "",
    familyValues: "Moderate",
    aboutMe: "",
    aboutFamily: "",
    diet: "Vegetarian",
    heightCm: 172,
  });

  // Career form fields
  const [careerForm, setCareerForm] = useState({
    headline: "Senior Software Engineer & Distributed Systems Specialist",
    careerLevel: "senior" as const,
    primaryDomain: "Technology & Software",
    currentCompany: "",
    currentDesignation: "",
    yearsOfExperience: 5,
    educationHighest: "B.Tech Computer Science",
    educationInstitution: "",
    skills: "React, Next.js, TypeScript, PostgreSQL, System Design",
    seekingStatus: "open_to_offers" as const,
    preferredLocations: "Bengaluru, Remote, Delhi NCR",
    workplacePreference: "flexible" as const,
    portfolioUrl: "",
    linkedinUrl: "",
    resumeUrl: "",
    bio: "",
    isMentorAvailable: true,
    isConfidentialMode: false,
  });

  // Business form fields
  const [businessForm, setBusinessForm] = useState({
    businessName: "",
    legalName: "",
    tagline: "",
    industrySector: "Technology & Software",
    businessType: "Private Limited",
    yearEstablished: 2020,
    aboutBusiness: "",
    offeringsSummary: "",
    registrationType: "GSTIN",
    registrationNumber: "",
    awardVerifiedBadge: true,
    country: "Singapore",
    state: "Central Singapore",
    city: "Singapore",
    pincode: "",
    addressLine: "",
    websiteUrl: "",
  });

  // Pre-fill fields when a member is selected
  useEffect(() => {
    if (!selectedMember) return;

    setMatrimonyForm((prev) => ({
      ...prev,
      fatherName: selectedMember.fatherName || prev.fatherName,
      familyLocation: selectedMember.currentCity || prev.familyLocation,
      workCity: selectedMember.currentCity || prev.workCity,
    }));

    setBusinessForm((prev) => ({
      ...prev,
      city: selectedMember.currentCity || prev.city,
      state: selectedMember.state || prev.state,
    }));

    setStatusMessage(null);
  }, [selectedMember]);

  // Execute member search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setStatusMessage(null);
    try {
      const res = await searchMembersForAdminAction(searchQuery);
      if (res.success) {
        setSearchResults(res.members);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Search failed." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while searching members." });
    } finally {
      setIsSearching(false);
    }
  };

  // Initial search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  // Submit Matrimony Profile
  const handleSubmitMatrimony = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await adminCreateMatrimonyProfileAction({
      memberId: selectedMember.id,
      ...matrimonyForm,
      heightCm: Number(matrimonyForm.heightCm) || 170,
    });

    setIsSubmitting(false);
    if (res.success && res.profileId) {
      setStatusMessage({
        type: "success",
        text: `Matrimony profile created and published live for ${selectedMember.fullName}!`,
        linkUrl: `/matrimony/${res.profileId}`,
      });
      // Update local card status
      setSelectedMember({ ...selectedMember, hasMatrimonyProfile: true });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to create profile." });
    }
  };

  // Submit Career Profile
  const handleSubmitCareer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    const skillsArray = careerForm.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const locationsArray = careerForm.preferredLocations.split(",").map((l) => l.trim()).filter(Boolean);

    const res = await adminCreateCareerProfileAction({
      memberId: selectedMember.id,
      headline: careerForm.headline,
      careerLevel: careerForm.careerLevel,
      primaryDomain: careerForm.primaryDomain,
      currentCompany: careerForm.currentCompany,
      currentDesignation: careerForm.currentDesignation,
      yearsOfExperience: Number(careerForm.yearsOfExperience) || 0,
      educationHighest: careerForm.educationHighest,
      educationInstitution: careerForm.educationInstitution,
      skills: skillsArray,
      seekingStatus: careerForm.seekingStatus,
      preferredLocations: locationsArray,
      workplacePreference: careerForm.workplacePreference,
      portfolioUrl: careerForm.portfolioUrl,
      linkedinUrl: careerForm.linkedinUrl,
      resumeUrl: careerForm.resumeUrl,
      bio: careerForm.bio,
      isMentorAvailable: careerForm.isMentorAvailable,
      isConfidentialMode: careerForm.isConfidentialMode,
    });

    setIsSubmitting(false);
    if (res.success && res.profile) {
      setStatusMessage({
        type: "success",
        text: `Career showcase profile created and published live for ${selectedMember.fullName}!`,
        linkUrl: `/careers/${res.profile.id}`,
      });
      // Update local card status
      setSelectedMember({ ...selectedMember, hasCareerProfile: true });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to create career profile." });
    }
  };

  // Submit Business Profile
  const handleSubmitBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await adminCreateBusinessProfileAction({
      createdByMemberId: selectedMember.id,
      ...businessForm,
      yearEstablished: Number(businessForm.yearEstablished) || 2024,
    });

    setIsSubmitting(false);
    if (res.success && res.businessId) {
      setStatusMessage({
        type: "success",
        text: `Business enterprise "${businessForm.businessName}" created and published live!`,
        linkUrl: `/businesses/${res.businessId}`,
      });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to create business enterprise." });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-amber-600 via-amber-700 to-amber-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-amber-200 text-xs font-semibold tracking-wide">
            ✨ Delegated Secretariat Administration
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Create Profiles on Behalf of Community Members
          </h2>
          <p className="text-amber-100/90 text-sm leading-relaxed">
            Coordinators and Administrators can create and link Matrimony, Business, and Career profiles for any verified community member without requiring their login, OTP, or password. Profiles are instantly published live and automatically linked to the member’s personal dashboard for future self-management.
          </p>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-4 text-sm font-semibold border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : "bg-rose-50 text-rose-900 border-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{statusMessage.type === "success" ? "✅" : "⚠️"}</span>
            <span>{statusMessage.text}</span>
          </div>
          {statusMessage.linkUrl && (
            <Link
              href={statusMessage.linkUrl}
              target="_blank"
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-emerald-800 border border-emerald-300 shadow-xs hover:bg-emerald-100 transition shrink-0"
            >
              View Profile Live ↗
            </Link>
          )}
        </div>
      )}

      {/* Step 1: Member Search & Selector */}
      <div className="bg-white rounded-3xl border border-brand-accent/20 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-accent/10">
          <div>
            <h3 className="text-lg font-bold text-brand-primary">
              Step 1: Select Community Member
            </h3>
            <p className="text-xs text-body-muted">
              Search by full name, serial number (#MEM-001), Gotra, phone, or household code.
            </p>
          </div>

          {selectedMember && (
            <button
              onClick={() => setSelectedMember(null)}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition"
            >
              🔄 Change Member
            </button>
          )}
        </div>

        {!selectedMember ? (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Type member name, serial no (e.g. MEM-001-A), Gotra, phone, or HH code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-brand-accent/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-accent"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition flex items-center gap-2"
              >
                {isSearching ? "Searching..." : "🔍 Search"}
              </button>
            </form>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {searchResults.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-body-muted">
                  {isSearching ? "Searching community directory..." : "No community members found matching query."}
                </div>
              ) : (
                searchResults.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className="p-3.5 rounded-2xl border border-brand-accent/20 hover:border-brand-primary hover:bg-amber-50/40 cursor-pointer transition flex items-start gap-3 text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center text-sm shrink-0 border border-brand-accent/30 overflow-hidden">
                      {m.photoUrl ? (
                        <img src={m.photoUrl} alt={m.fullName} className="w-full h-full object-cover" />
                      ) : (
                        m.fullName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-brand-primary truncate">{m.fullName}</span>
                        {m.serialNo && (
                          <span className="text-[10px] font-mono font-bold bg-canvas-warm px-1.5 py-0.5 rounded border border-brand-accent/30">
                            #{m.serialNo}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-body-muted flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-amber-900">{m.gotra}</span>
                        <span>•</span>
                        <span>{m.currentCity || m.state || "India"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                        {m.hasMatrimonyProfile ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            💍 Matrimony Active
                          </span>
                        ) : null}
                        {m.hasCareerProfile ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            💼 Career Active
                          </span>
                        ) : null}
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                          {m.maritalStatus || "Unspecified"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Selected Member Overview Card */
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center text-lg shrink-0 border-2 border-white shadow-xs overflow-hidden">
                {selectedMember.photoUrl ? (
                  <img src={selectedMember.photoUrl} alt={selectedMember.fullName} className="w-full h-full object-cover" />
                ) : (
                  selectedMember.fullName.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-brand-primary">{selectedMember.fullName}</h4>
                  {selectedMember.serialNo && (
                    <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-brand-accent/30 text-brand-primary">
                      #{selectedMember.serialNo}
                    </span>
                  )}
                  <span className="text-xs font-bold bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full">
                    {selectedMember.gotra}
                  </span>
                </div>

                <p className="text-xs text-body-muted mt-0.5">
                  Native: <strong>{selectedMember.nativePlace || "Agroha"}</strong> • Location:{" "}
                  <strong>{selectedMember.currentCity || selectedMember.state || "Singapore"}</strong> • Household:{" "}
                  <strong>{selectedMember.householdCode || "HH"}</strong>
                </p>

                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="text-slate-600">
                    Status: <strong className="capitalize">{selectedMember.maritalStatus || "Unmarried"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Matrimony:{" "}
                    <strong>{selectedMember.hasMatrimonyProfile ? "✅ Profile Exists" : "None"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Career:{" "}
                    <strong>{selectedMember.hasCareerProfile ? "✅ Profile Exists" : "None"}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Choose Profile Type & Form */}
      {selectedMember && (
        <div className="bg-white rounded-3xl border border-brand-accent/20 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-accent/10">
            <div>
              <h3 className="text-lg font-bold text-brand-primary">
                Step 2: Choose Profile Type to Create
              </h3>
              <p className="text-xs text-body-muted">
                Select the pillar profile you want to publish on behalf of {selectedMember.fullName}.
              </p>
            </div>

            {/* Profile Tab Buttons */}
            <div className="inline-flex p-1 rounded-2xl bg-canvas-warm border border-brand-accent/20">
              <button
                type="button"
                onClick={() => setActiveProfileType("matrimony")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeProfileType === "matrimony"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-body-muted hover:text-brand-primary"
                }`}
              >
                💍 Matrimony
              </button>
              <button
                type="button"
                onClick={() => setActiveProfileType("career")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeProfileType === "career"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-body-muted hover:text-brand-primary"
                }`}
              >
                💼 Career / Jobs
              </button>
              <button
                type="button"
                onClick={() => setActiveProfileType("business")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeProfileType === "business"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-body-muted hover:text-brand-primary"
                }`}
              >
                🏢 Business Network
              </button>
            </div>
          </div>

          {/* Form 1: Matrimony Profile */}
          {activeProfileType === "matrimony" && (
            <form onSubmit={handleSubmitMatrimony} className="space-y-6">
              {selectedMember.hasMatrimonyProfile && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Notice: A matrimonial profile is already registered for this member. Creating another will be rejected.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Highest Education *</label>
                  <input
                    type="text"
                    required
                    value={matrimonyForm.highestEducation}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, highestEducation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Degree Name</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech Computer Science / MBA"
                    value={matrimonyForm.degreeName}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, degreeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">College / University</label>
                  <input
                    type="text"
                    placeholder="e.g. IIT Delhi / NTU Singapore"
                    value={matrimonyForm.collegeName}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, collegeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Employment Sector *</label>
                  <input
                    type="text"
                    required
                    value={matrimonyForm.employmentSector}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, employmentSector: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Occupation Title *</label>
                  <input
                    type="text"
                    required
                    value={matrimonyForm.occupationTitle}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, occupationTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Company / Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. Microsoft / Family Enterprise"
                    value={matrimonyForm.companyName}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Annual Income</label>
                  <input
                    type="text"
                    value={matrimonyForm.annualIncome}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, annualIncome: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Work City</label>
                  <input
                    type="text"
                    value={matrimonyForm.workCity}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, workCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Work Country</label>
                  <input
                    type="text"
                    value={matrimonyForm.workCountry}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, workCountry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Father's Name *</label>
                  <input
                    type="text"
                    required
                    value={matrimonyForm.fatherName}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, fatherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Father's Occupation</label>
                  <input
                    type="text"
                    value={matrimonyForm.fatherOccupation}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, fatherOccupation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Mother's Name *</label>
                  <input
                    type="text"
                    required
                    value={matrimonyForm.motherName}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, motherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Mother's Occupation</label>
                  <input
                    type="text"
                    value={matrimonyForm.motherOccupation}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, motherOccupation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={matrimonyForm.heightCm}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, heightCm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Diet</label>
                  <select
                    value={matrimonyForm.diet}
                    onChange={(e) => setMatrimonyForm({ ...matrimonyForm, diet: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  >
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Pure Vegetarian (Jain)">Pure Vegetarian (Jain)</option>
                    <option value="Eggetarian">Eggetarian</option>
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-primary mb-1">About the Candidate</label>
                <textarea
                  rows={3}
                  placeholder="Summary of values, lifestyle, interests, and aspirations..."
                  value={matrimonyForm.aboutMe}
                  onChange={(e) => setMatrimonyForm({ ...matrimonyForm, aboutMe: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || selectedMember.hasMatrimonyProfile}
                  className="px-8 py-3 rounded-2xl bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary/90 transition shadow-warm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? "Creating & Publishing..." : "💍 Publish Matrimonial Profile Live"}
                </button>
              </div>
            </form>
          )}

          {/* Form 2: Career / Employment Profile */}
          {activeProfileType === "career" && (
            <form onSubmit={handleSubmitCareer} className="space-y-6">
              {selectedMember.hasCareerProfile && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Notice: A career profile is already active for this member. Creating another will be rejected.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-brand-primary mb-1">Professional Headline *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Full-Stack Architect & AI Specialist"
                    value={careerForm.headline}
                    onChange={(e) => setCareerForm({ ...careerForm, headline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Primary Domain *</label>
                  <select
                    value={careerForm.primaryDomain}
                    onChange={(e) => setCareerForm({ ...careerForm, primaryDomain: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  >
                    {CAREER_DOMAINS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Seniority Level *</label>
                  <select
                    value={careerForm.careerLevel}
                    onChange={(e) => setCareerForm({ ...careerForm, careerLevel: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  >
                    <option value="student">Student / Intern</option>
                    <option value="entry">Entry Level (0-2 Yrs)</option>
                    <option value="mid_level">Mid-Level (3-7 Yrs)</option>
                    <option value="senior">Senior (8-14 Yrs)</option>
                    <option value="leadership">Leadership / Director</option>
                    <option value="executive">Executive / C-Suite (15+ Yrs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    value={careerForm.yearsOfExperience}
                    onChange={(e) => setCareerForm({ ...careerForm, yearsOfExperience: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Seeking Status</label>
                  <select
                    value={careerForm.seekingStatus}
                    onChange={(e) => setCareerForm({ ...careerForm, seekingStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  >
                    <option value="actively_looking">Actively Looking</option>
                    <option value="open_to_offers">Open to Offers</option>
                    <option value="not_looking">Not Looking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Current Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Google / Agarwal Enterprise"
                    value={careerForm.currentCompany}
                    onChange={(e) => setCareerForm({ ...careerForm, currentCompany: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Current Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Vice President / Director"
                    value={careerForm.currentDesignation}
                    onChange={(e) => setCareerForm({ ...careerForm, currentDesignation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Workplace Preference</label>
                  <select
                    value={careerForm.workplacePreference}
                    onChange={(e) => setCareerForm({ ...careerForm, workplacePreference: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  >
                    <option value="flexible">Flexible</option>
                    <option value="remote_only">Remote Only</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="on_site">On-site</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-brand-primary mb-1">Core Skills (comma separated) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Java, Python, Financial Modeling, Auditing"
                    value={careerForm.skills}
                    onChange={(e) => setCareerForm({ ...careerForm, skills: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Preferred Locations</label>
                  <input
                    type="text"
                    placeholder="e.g. Singapore, Bengaluru, Mumbai"
                    value={careerForm.preferredLocations}
                    onChange={(e) => setCareerForm({ ...careerForm, preferredLocations: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">GitHub / Portfolio URL</label>
                  <input
                    type="text"
                    placeholder="e.g. github.com/username"
                    value={careerForm.portfolioUrl}
                    onChange={(e) => setCareerForm({ ...careerForm, portfolioUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    placeholder="e.g. linkedin.com/in/username"
                    value={careerForm.linkedinUrl}
                    onChange={(e) => setCareerForm({ ...careerForm, linkedinUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Resume / CV URL</label>
                  <input
                    type="text"
                    placeholder="e.g. drive.google.com/..."
                    value={careerForm.resumeUrl}
                    onChange={(e) => setCareerForm({ ...careerForm, resumeUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-primary mb-1">Professional Bio</label>
                <textarea
                  rows={3}
                  placeholder="Summary of professional achievements and domain expertise..."
                  value={careerForm.bio}
                  onChange={(e) => setCareerForm({ ...careerForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                />
              </div>

              <div className="flex items-center gap-6 p-4 rounded-xl bg-canvas-warm/50 border border-brand-accent/20">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-primary">
                  <input
                    type="checkbox"
                    checked={careerForm.isMentorAvailable}
                    onChange={(e) => setCareerForm({ ...careerForm, isMentorAvailable: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-primary focus:ring-brand-accent"
                  />
                  🤝 Available for Community Mentorship
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-primary">
                  <input
                    type="checkbox"
                    checked={careerForm.isConfidentialMode}
                    onChange={(e) => setCareerForm({ ...careerForm, isConfidentialMode: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-primary focus:ring-brand-accent"
                  />
                  🔒 Enable Confidential Mode
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || selectedMember.hasCareerProfile}
                  className="px-8 py-3 rounded-2xl bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary/90 transition shadow-warm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? "Creating & Publishing..." : "💼 Publish Career Profile Live"}
                </button>
              </div>
            </form>
          )}

          {/* Form 3: Business Profile */}
          {activeProfileType === "business" && (
            <form onSubmit={handleSubmitBusiness} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-brand-primary mb-1">Business / Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bansal Global Infotech Ltd"
                    value={businessForm.businessName}
                    onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Industry Sector *</label>
                  <select
                    value={businessForm.industrySector}
                    onChange={(e) => setBusinessForm({ ...businessForm, industrySector: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  >
                    {BUSINESS_INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Business Type</label>
                  <select
                    value={businessForm.businessType}
                    onChange={(e) => setBusinessForm({ ...businessForm, businessType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  >
                    <option value="Private Limited">Private Limited</option>
                    <option value="Public Limited">Public Limited</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Proprietorship">Proprietorship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Year Established</label>
                  <input
                    type="number"
                    min={1900}
                    max={2030}
                    value={businessForm.yearEstablished}
                    onChange={(e) => setBusinessForm({ ...businessForm, yearEstablished: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Official Website URL</label>
                  <input
                    type="text"
                    placeholder="e.g. mycompany.com"
                    value={businessForm.websiteUrl}
                    onChange={(e) => setBusinessForm({ ...businessForm, websiteUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={businessForm.city}
                    onChange={(e) => setBusinessForm({ ...businessForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">State / Province</label>
                  <input
                    type="text"
                    value={businessForm.state}
                    onChange={(e) => setBusinessForm({ ...businessForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-primary mb-1">Country</label>
                  <input
                    type="text"
                    value={businessForm.country}
                    onChange={(e) => setBusinessForm({ ...businessForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-primary mb-1">About the Business *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Overview of company history, vision, products, and services..."
                  value={businessForm.aboutBusiness}
                  onChange={(e) => setBusinessForm({ ...businessForm, aboutBusiness: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/30 text-xs"
                />
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-300">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={businessForm.awardVerifiedBadge}
                    onChange={(e) => setBusinessForm({ ...businessForm, awardVerifiedBadge: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  ⭐ Award Official Verified Agarwal Enterprise Badge Directly (Admin Authority)
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-2xl bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary/90 transition shadow-warm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? "Creating & Publishing..." : "🏢 Publish Business Enterprise Live"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
