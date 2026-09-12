'use client';

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { searchMatrimonialProfiles } from "@/actions/matrimony";
import { gotras } from "@/data/gotras";
import type { MatrimonialProfile } from "@/types/matrimony";

const EDUCATION_OPTIONS = [
  "All",
  "Doctorate / PhD",
  "Masters / Post Graduate (MBA/M.Tech/MS/MA)",
  "Bachelors / Graduate (B.Tech/BE/BBA/B.Com)",
  "Chartered Accountant (CA/CS/CFA)",
  "Medical (MBBS/MD/MS/BDS)",
  "Legal (LLB/LLM)",
  "Civil Services (IAS/IPS/IRS)",
  "Diploma",
];

const SECTOR_OPTIONS = [
  "All",
  "Private Company / Corporate",
  "Business / Self-Employed Entrepreneur",
  "Government / Public Sector / PSU",
  "Civil Services / Administration",
  "Banking / Financial Services",
  "Medical / Healthcare Practice",
  "Education / Academia",
  "Not Working",
];

function MatrimonyContent() {
  const searchParams = useSearchParams();
  const initialGender = (searchParams.get("gender") as "all" | "male" | "female") || "all";
  const initialGotra = searchParams.get("gotra") || "All";

  // Filter States
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">(initialGender);
  const [nameQuery, setNameQuery] = useState(searchParams.get("name") || "");
  const [selectedGotra, setSelectedGotra] = useState(initialGotra);
  const [locationQuery, setLocationQuery] = useState(searchParams.get("location") || "");
  const [nativePlaceQuery, setNativePlaceQuery] = useState(searchParams.get("nativePlace") || "");
  const [highestEducation, setHighestEducation] = useState("All");
  const [employmentSector, setEmploymentSector] = useState("All");
  const [maritalStatus, setMaritalStatus] = useState("All");
  const [minAge, setMinAge] = useState(searchParams.get("minAge") || "");
  const [maxAge, setMaxAge] = useState(searchParams.get("maxAge") || "");
  const [minHeightCm, setMinHeightCm] = useState("");
  const [maxHeightCm, setMaxHeightCm] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [profiles, setProfiles] = useState<MatrimonialProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Access Gating State
  const [isGuest, setIsGuest] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await searchMatrimonialProfiles({
        gender: selectedGender,
        name: nameQuery.trim() || undefined,
        gotra: selectedGotra !== "All" ? selectedGotra : undefined,
        location: locationQuery.trim() || undefined,
        nativePlace: nativePlaceQuery.trim() || undefined,
        highestEducation: highestEducation !== "All" ? highestEducation : undefined,
        employmentSector: employmentSector !== "All" ? employmentSector : undefined,
        maritalStatus: maritalStatus !== "All" ? maritalStatus : undefined,
        minAge: minAge.trim() ? parseInt(minAge.trim(), 10) : undefined,
        maxAge: maxAge.trim() ? parseInt(maxAge.trim(), 10) : undefined,
        minHeightCm: minHeightCm.trim() ? parseInt(minHeightCm.trim(), 10) : undefined,
        maxHeightCm: maxHeightCm.trim() ? parseInt(maxHeightCm.trim(), 10) : undefined,
      });

      if (res.isGuest) {
        setIsGuest(true);
        setProfiles([]);
      } else if (res.isPendingApproval) {
        setIsPendingApproval(true);
        setProfiles([]);
      } else if (res.success) {
        setIsGuest(false);
        setIsPendingApproval(false);
        setProfiles(res.profiles || []);
        setTotalCount(res.totalCount || 0);
      }
    } catch {
      setProfiles([]);
    }
    setIsLoading(false);
  }, [
    selectedGender,
    nameQuery,
    selectedGotra,
    locationQuery,
    nativePlaceQuery,
    highestEducation,
    employmentSector,
    maritalStatus,
    minAge,
    maxAge,
    minHeightCm,
    maxHeightCm,
  ]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleResetAll = () => {
    setSelectedGender("all");
    setNameQuery("");
    setSelectedGotra("All");
    setLocationQuery("");
    setNativePlaceQuery("");
    setHighestEducation("All");
    setEmploymentSector("All");
    setMaritalStatus("All");
    setMinAge("");
    setMaxAge("");
    setMinHeightCm("");
    setMaxHeightCm("");
  };

  const totalActiveFiltersCount =
    (selectedGender !== "all" ? 1 : 0) +
    (nameQuery.trim() ? 1 : 0) +
    (selectedGotra !== "All" ? 1 : 0) +
    (locationQuery.trim() ? 1 : 0) +
    (nativePlaceQuery.trim() ? 1 : 0) +
    (highestEducation !== "All" ? 1 : 0) +
    (employmentSector !== "All" ? 1 : 0) +
    (maritalStatus !== "All" ? 1 : 0) +
    (minAge ? 1 : 0) +
    (maxAge ? 1 : 0) +
    (minHeightCm || maxHeightCm ? 1 : 0);

  // Locked Gate for Guests
  if (isGuest) {
    return (
      <main className="py-12 sm:py-16 bg-canvas-page min-h-[75vh] flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white border-2 border-brand-accent/40 rounded-3xl p-6 sm:p-10 shadow-warmLg text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-brand-gold/60 text-brand-primary flex items-center justify-center text-3xl mx-auto shadow-xs">
            💍
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-gold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Exclusive Community Service • वैवाहिक संबंध मंच
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-brand-primary mt-3">
              Agarwal Samaj Matrimonial Portal
            </h1>
            <p className="text-xs sm:text-sm text-body-muted leading-relaxed mt-2.5 max-w-md mx-auto">
              To safeguard our families&apos; privacy and maintain authentic Gotra lineage, the matrimonial portal is exclusively accessible to verified, admin-approved members of the Agarwal community.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-canvas-warm/60 border border-brand-accent/30 text-xs text-body-heading space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold">✓</span>
              <span>100% verified household lineage &amp; 18 Gotras authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold">✓</span>
              <span>Direct interactive links to verified family members&apos; directory profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold">✓</span>
              <span>Safe contact sharing with zero spam or telemarketing exposure</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login?redirect=/matrimony"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white bg-brand-primary hover:bg-brand-burgundy transition shadow-warm"
            >
              Sign In to Your Account →
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join transition shadow-goldCta"
            >
              Register Family Free (निःशुल्क पंजीकरण)
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Pending Approval State
  if (isPendingApproval) {
    return (
      <main className="py-12 sm:py-16 bg-canvas-page min-h-[75vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-10 shadow-warmLg text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 text-amber-800 flex items-center justify-center text-3xl mx-auto">
            ⏳
          </div>
          <h1 className="font-serif text-2xl font-black text-brand-primary">
            Verification Pending Review
          </h1>
          <p className="text-xs text-body-muted leading-relaxed">
            Your family registration is currently under moderation review by our community administrators. Once your household is verified and approved, you will have full access to browse and register matrimonial candidates.
          </p>
          <div className="pt-2">
            <Link
              href="/pending-approval"
              className="inline-block px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-warm"
            >
              Check Application Status →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-6 sm:py-10 bg-canvas-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-brand-accent/40 rounded-3xl p-6 sm:p-8 shadow-warm">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-brand-gold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                वैवाहिक संबंध मंच • Matrimony Hub
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Verified Members Only
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-brand-primary">
              Agarwal Samaj Matrimonial Directory
            </h1>
            <p className="text-xs sm:text-sm text-body-muted leading-relaxed">
              Discover eligible Agarwal life partners across 18 Gotras. All profiles belong to verified community households with directly verifiable family profiles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/matrimony/create"
              className="px-5 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta flex items-center gap-2 transition-transform active:scale-95"
            >
              <span className="text-base font-black">+</span>
              <span>Register Profile (बायोडाटा बनाएं)</span>
            </Link>
          </div>
        </div>

        {/* Directory-Style Filter Controls */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-5 sm:p-6 shadow-warm space-y-4">
          
          {/* Top Gender Switcher & Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Gender Toggle Tabs */}
            <div className="inline-flex rounded-2xl bg-canvas-warm/70 p-1 border border-brand-accent/30 shrink-0 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setSelectedGender("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedGender === "all"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-body-heading hover:text-brand-primary"
                }`}
              >
                All Profiles ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender("male")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedGender === "male"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-body-heading hover:text-brand-primary"
                }`}
              >
                🤵 Grooms (वर)
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender("female")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedGender === "female"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-body-heading hover:text-brand-primary"
                }`}
              >
                👰 Brides (वधू)
              </button>
            </div>

            {/* Keyword Search & Gotra Filter */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <input
                  type="text"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="Search candidate name..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <select
                  value={selectedGotra}
                  onChange={(e) => setSelectedGotra(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs font-semibold text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                >
                  <option value="All">All 18 Gotras (सभी 18 गोत्र)</option>
                  {gotras.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name} ({g.devanagari})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="City or Work Location..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Toggle Advanced Filters */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 flex items-center justify-center gap-1.5 ${
                showAdvanced || totalActiveFiltersCount > 1
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-canvas-warm/40 text-body-heading border-brand-accent/40 hover:bg-canvas-warm"
              }`}
            >
              <span>⚙️ Filters</span>
              {totalActiveFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-brand-primary text-[10px] font-black rounded-full">
                  {totalActiveFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Accordion Filters */}
          {showAdvanced && (
            <div className="pt-4 border-t border-brand-accent/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in duration-150">
              {/* Age Bounds */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1">
                  Age Range (Years)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="18"
                    max="80"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    placeholder="Min (18)"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 text-xs text-center bg-canvas-warm/30"
                  />
                  <span className="text-body-muted font-bold">to</span>
                  <input
                    type="number"
                    min="18"
                    max="80"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    placeholder="Max (60)"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 text-xs text-center bg-canvas-warm/30"
                  />
                </div>
              </div>

              {/* Height Bounds */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1">
                  Height Range (cm)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="130"
                    max="220"
                    value={minHeightCm}
                    onChange={(e) => setMinHeightCm(e.target.value)}
                    placeholder="Min (e.g. 155)"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 text-xs text-center bg-canvas-warm/30"
                  />
                  <span className="text-body-muted font-bold">to</span>
                  <input
                    type="number"
                    min="130"
                    max="220"
                    value={maxHeightCm}
                    onChange={(e) => setMaxHeightCm(e.target.value)}
                    placeholder="Max (e.g. 185)"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-brand-accent/40 text-xs text-center bg-canvas-warm/30"
                  />
                </div>
              </div>

              {/* Education */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1">
                  Highest Education
                </label>
                <select
                  value={highestEducation}
                  onChange={(e) => setHighestEducation(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-brand-accent/40 text-xs bg-canvas-warm/30 cursor-pointer"
                >
                  {EDUCATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment Sector */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1">
                  Employment Sector
                </label>
                <select
                  value={employmentSector}
                  onChange={(e) => setEmploymentSector(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-brand-accent/40 text-xs bg-canvas-warm/30 cursor-pointer"
                >
                  {SECTOR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marital Status */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1">
                  Marital Status
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-brand-accent/40 text-xs bg-canvas-warm/30 cursor-pointer"
                >
                  <option value="All">All Marital Statuses</option>
                  <option value="Never Married">Never Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Awaiting Divorce">Awaiting Divorce</option>
                </select>
              </div>

              {/* Native Place */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1">
                  Ancestral Native Place (मूल निवास)
                </label>
                <input
                  type="text"
                  value={nativePlaceQuery}
                  onChange={(e) => setNativePlaceQuery(e.target.value)}
                  placeholder="Village / Town / District..."
                  className="w-full px-3 py-1.5 rounded-xl border border-brand-accent/40 text-xs bg-canvas-warm/30"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-body-heading">
              Showing <strong>{profiles.length}</strong> {totalCount > profiles.length ? `of ${totalCount}` : ""} matrimonial candidate{profiles.length === 1 ? "" : "s"}
            </span>

            {totalActiveFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-[11px] font-bold text-brand-primary hover:underline"
              >
                Clear all filters ({totalActiveFiltersCount})
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="bg-white border border-brand-accent/30 rounded-3xl p-12 text-center shadow-warm">
              <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-bold text-body-muted">Searching verified candidate records...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-white border border-brand-accent/30 rounded-3xl p-8 sm:p-12 text-center shadow-warm space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-2xl flex items-center justify-center mx-auto text-amber-800">
                🔍
              </div>
              <div>
                <p className="text-base font-bold text-brand-primary">No matching matrimonial profiles found</p>
                <p className="text-xs text-body-muted mt-1 max-w-md mx-auto">
                  {totalActiveFiltersCount > 0
                    ? "Try adjusting your filters or expanding your search criteria to see more candidates."
                    : "No matrimonial profiles are active yet. Be the first to register an eligible family member!"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                {totalActiveFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="px-5 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent"
                  >
                    Clear All Filters
                  </button>
                )}
                <Link
                  href="/matrimony/create"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
                >
                  + Register Candidate Profile Free
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {profiles.map((p) => {
                const primaryPhoto = p.photos?.[0];
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-brand-accent/30 rounded-3xl p-4 sm:p-5 shadow-warm hover:shadow-warmLg hover:border-brand-accent transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo & Identity Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-primary font-black text-lg shrink-0 shadow-xs">
                          {primaryPhoto ? (
                            <img
                              src={primaryPhoto}
                              alt={p.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            p.fullName?.charAt(0) || "A"
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-brand-primary truncate" title={p.fullName}>
                            {p.fullName}
                          </h3>
                          <p className="text-[11px] font-bold text-amber-800 font-devanagari truncate mt-0.5">
                            गोत्र: {p.gotra}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {p.age !== undefined && (
                              <span className="text-[10px] font-bold bg-amber-100/80 text-amber-950 px-2 py-0.5 rounded-md">
                                {p.age} yrs
                              </span>
                            )}
                            {p.heightDisplay && (
                              <span className="text-[10px] font-medium bg-canvas-warm text-body-heading px-1.5 py-0.5 rounded border border-brand-accent/20">
                                {p.heightDisplay.split("(")[0].trim()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Professional & Location Snapshot */}
                      <div className="space-y-1 text-xs text-body-text mb-3">
                        <p className="font-semibold text-body-heading truncate" title={p.occupationTitle}>
                          💼 {p.occupationTitle}
                          {p.companyName ? ` • ${p.companyName}` : ""}
                        </p>
                        <p className="text-body-muted truncate" title={p.highestEducation}>
                          🎓 {p.degreeName || p.highestEducation}
                        </p>
                        <p className="text-body-muted truncate">
                          📍 {p.workCity || p.familyLocation}
                        </p>
                        {p.nativePlace && (
                          <p className="text-[11px] text-body-muted truncate">
                            <strong>मूल निवास:</strong> {p.nativePlace}
                          </p>
                        )}
                      </div>

                      {/* Family Snapshot */}
                      <div className="p-2.5 rounded-xl bg-canvas-warm/40 border border-brand-accent/20 text-[11px] text-body-muted space-y-1 mb-3">
                        <div className="truncate">
                          <strong>Father:</strong> {p.fatherName}
                          {p.fatherOccupation ? ` (${p.fatherOccupation})` : ""}
                        </div>
                        <div className="truncate">
                          <strong>Mother:</strong> {p.motherName}
                        </div>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="pt-3 border-t border-brand-accent/20 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Verified Member
                      </span>

                      {/* Explicitly navigates to Matrimony Profile, NOT directory */}
                      <Link
                        href={`/matrimony/${p.id}`}
                        className="text-xs font-bold text-brand-primary hover:text-brand-burgundy flex items-center gap-1 hover:underline shrink-0"
                      >
                        <span>View Biodata</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function MatrimonyPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs font-bold">Loading Matrimonial Directory...</div>}>
      <MatrimonyContent />
    </Suspense>
  );
}
