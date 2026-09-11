'use client';

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { searchDirectory } from "@/actions/search";
import { gotras } from "@/data/gotras";
import { calculateAge } from "@/lib/privacy";

function DirectoryContent() {
  const searchParams = useSearchParams();
  const initialGotra = searchParams.get("gotra") || "All";

  // Primary Search Fields
  const [nameQuery, setNameQuery] = useState(searchParams.get("name") || "");
  const [surnameQuery, setSurnameQuery] = useState(searchParams.get("surname") || "");
  const [selectedGotra, setSelectedGotra] = useState(initialGotra);
  const [locationQuery, setLocationQuery] = useState(searchParams.get("location") || "");

  // Advanced Search Fields
  const [professionQuery, setProfessionQuery] = useState(searchParams.get("profession") || "");
  const [nativePlaceQuery, setNativePlaceQuery] = useState(searchParams.get("nativePlace") || "");
  const [minAge, setMinAge] = useState(searchParams.get("minAge") || "");
  const [maxAge, setMaxAge] = useState(searchParams.get("maxAge") || "");
  const [maritalStatus, setMaritalStatus] = useState(searchParams.get("maritalStatus") || "all");
  const [nearMeActive, setNearMeActive] = useState(false);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      searchParams.get("profession") ||
      searchParams.get("nativePlace") ||
      searchParams.get("minAge") ||
      searchParams.get("maxAge") ||
      searchParams.get("maritalStatus")
    )
  );
  const [members, setMembers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Update state if URL params change externally
  useEffect(() => {
    const urlGotra = searchParams.get("gotra");
    if (urlGotra) setSelectedGotra(urlGotra);

    const urlName = searchParams.get("name");
    if (urlName !== null && urlName !== undefined) setNameQuery(urlName);

    const urlSurname = searchParams.get("surname");
    if (urlSurname !== null && urlSurname !== undefined) setSurnameQuery(urlSurname);

    const urlLocation = searchParams.get("location");
    if (urlLocation !== null && urlLocation !== undefined) setLocationQuery(urlLocation);

    const urlProfession = searchParams.get("profession");
    if (urlProfession) {
      setProfessionQuery(urlProfession);
      setShowAdvanced(true);
    }

    const urlNative = searchParams.get("nativePlace");
    if (urlNative) {
      setNativePlaceQuery(urlNative);
      setShowAdvanced(true);
    }

    const urlMinAge = searchParams.get("minAge");
    if (urlMinAge) {
      setMinAge(urlMinAge);
      setShowAdvanced(true);
    }

    const urlMaxAge = searchParams.get("maxAge");
    if (urlMaxAge) {
      setMaxAge(urlMaxAge);
      setShowAdvanced(true);
    }

    const urlMarital = searchParams.get("maritalStatus");
    if (urlMarital) {
      setMaritalStatus(urlMarital);
      setShowAdvanced(true);
    }
  }, [searchParams]);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await searchDirectory({
        name: nameQuery.trim(),
        surname: surnameQuery.trim(),
        gotra: selectedGotra,
        location: locationQuery.trim(),
        profession: professionQuery.trim(),
        nativePlace: nativePlaceQuery.trim(),
        minAge: minAge.trim() ? parseInt(minAge.trim(), 10) : undefined,
        maxAge: maxAge.trim() ? parseInt(maxAge.trim(), 10) : undefined,
        maritalStatus: maritalStatus !== "all" ? maritalStatus : undefined,
        nearMe: nearMeActive,
      });
      if (res.success && res.data) {
        setMembers(res.data);
        setTotalCount(res.count ?? res.data.length);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    nameQuery,
    surnameQuery,
    selectedGotra,
    locationQuery,
    professionQuery,
    nativePlaceQuery,
    minAge,
    maxAge,
    maritalStatus,
    nearMeActive,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, 280);
    return () => clearTimeout(timer);
  }, [fetchResults]);

  const advancedFiltersActiveCount =
    (professionQuery.trim() ? 1 : 0) +
    (nativePlaceQuery.trim() ? 1 : 0) +
    (minAge.trim() ? 1 : 0) +
    (maxAge.trim() ? 1 : 0) +
    (maritalStatus !== "all" ? 1 : 0) +
    (nearMeActive ? 1 : 0);

  const totalActiveFiltersCount =
    (nameQuery.trim() ? 1 : 0) +
    (surnameQuery.trim() ? 1 : 0) +
    (selectedGotra !== "All" ? 1 : 0) +
    (locationQuery.trim() ? 1 : 0) +
    advancedFiltersActiveCount;

  const handleResetAll = () => {
    setNameQuery("");
    setSurnameQuery("");
    setSelectedGotra("All");
    setLocationQuery("");
    setProfessionQuery("");
    setNativePlaceQuery("");
    setMinAge("");
    setMaxAge("");
    setMaritalStatus("all");
    setNearMeActive(false);
  };

  return (
    <main className="py-6 sm:py-10 bg-canvas-page">
      <div className="max-w-7xl mx-auto px-4">
        {/* Multi-Field Search Console Card */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-5 sm:p-7 shadow-warm mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 sm:mb-6">
            <div>
              <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
                Verified Global Directory • सत्यापित निर्देशिका
              </span>
              <h1 className="text-xl sm:text-3xl font-black text-brand-primary">
                Search Agarwal Individuals & Families
              </h1>
              <p className="text-xs sm:text-sm text-body-muted mt-0.5">
                Search by name, surname, gotra, city, or expand for profession and age filters.
              </p>
            </div>

            {totalActiveFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="self-start md:self-auto text-xs font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
              >
                <span>✕</span>
                <span>Reset Filters ({totalActiveFiltersCount})</span>
              </button>
            )}
          </div>

          {/* Primary Search Row: Name, Surname, Gotra Selector, Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* First / Given Name */}
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                First / Given Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="e.g. Ramesh, Sunita"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <svg className="w-3.5 h-3.5 text-brand-primary absolute left-3 top-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>

            {/* Surname */}
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                Surname
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={surnameQuery}
                  onChange={(e) => setSurnameQuery(e.target.value)}
                  placeholder="e.g. Agarwal, Bansal, Goel"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <svg className="w-3.5 h-3.5 text-brand-primary absolute left-3 top-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
            </div>

            {/* Gotra (Selector) */}
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                Gotra (गोत्र)
              </label>
              <div className="relative">
                <select
                  value={selectedGotra}
                  onChange={(e) => setSelectedGotra(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-semibold text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                >
                  <option value="All">All 18 Canonical Gotras</option>
                  {gotras.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name} ({g.devanagari})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* City / Country */}
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                City / Country
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="e.g. Jaipur, New Delhi, Singapore"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <svg className="w-3.5 h-3.5 text-brand-primary absolute left-3 top-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
            </div>
          </div>

          {/* Action Row: More Filters Toggle, Near Me Button, Automatic Search indicator */}
          <div className="mt-4 pt-3 border-t border-brand-accent/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  showAdvanced || advancedFiltersActiveCount > 0
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-canvas-warm text-brand-primary border border-brand-accent/40 hover:bg-white"
                }`}
              >
                <span>{showAdvanced ? "▲ Less Filters" : "▼ More Filters (Profession, Age, Village...)"}</span>
                {advancedFiltersActiveCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-brand-gold text-brand-primary text-[10px] flex items-center justify-center font-extrabold">
                    {advancedFiltersActiveCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setNearMeActive(!nearMeActive)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  nearMeActive
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-canvas-warm text-brand-primary border border-brand-accent/40 hover:bg-white"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>{nearMeActive ? "Near Me: Active" : "Near Me"}</span>
              </button>
            </div>

            <div className="text-xs text-body-muted flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Searches automatically as you type</span>
            </div>
          </div>

          {/* Expandable Advanced Filters Row */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-dashed border-brand-accent/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1">
              {/* Profession */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Profession / Occupation
                </label>
                <input
                  type="text"
                  value={professionQuery}
                  onChange={(e) => setProfessionQuery(e.target.value)}
                  placeholder="e.g. Chartered Accountant, Doctor, Business"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Native Place */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Native Place (पैतृक स्थान)
                </label>
                <input
                  type="text"
                  value={nativePlaceQuery}
                  onChange={(e) => setNativePlaceQuery(e.target.value)}
                  placeholder="e.g. Agroha, Hisar, Jhunjhunu, Sikar"
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Age Range: Min & Max */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Age Range (Years)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    placeholder="Min (e.g. 21)"
                    className="w-full px-2.5 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary text-center"
                  />
                  <span className="text-body-muted text-xs font-bold">to</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    placeholder="Max (e.g. 40)"
                    className="w-full px-2.5 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary text-center"
                  />
                </div>
              </div>

              {/* Marital Status */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-body-heading mb-1.5">
                  Marital Status
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs font-semibold text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                >
                  <option value="all">All Marital Statuses</option>
                  <option value="unmarried">Unmarried / Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="divorced">Divorced</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Section (Full-Width) */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-body-heading">
              Showing <strong>{members.length}</strong> {totalCount > members.length ? `of ${totalCount}` : ""} verified community member{members.length === 1 ? "" : "s"}
            </span>

            {totalActiveFiltersCount > 0 && (
              <span className="text-[11px] text-body-muted font-medium">
                {totalActiveFiltersCount} filter{totalActiveFiltersCount === 1 ? "" : "s"} applied
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="bg-white border border-brand-accent/30 rounded-2xl p-12 text-center shadow-warm">
              <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-bold text-body-muted">Searching verified database records...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="bg-white border border-brand-accent/30 rounded-2xl p-6 sm:p-12 text-center shadow-warm">
              <p className="text-base font-bold text-brand-primary mb-1.5">No matching profiles found</p>
              <p className="text-xs text-body-muted mb-4 max-w-md mx-auto">
                {totalActiveFiltersCount > 0
                  ? "Try adjusting your search criteria or clearing some filters to expand your search."
                  : "No verified households are registered yet. Be the first to register your family!"}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                {totalActiveFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent"
                  >
                    Clear All Filters
                  </button>
                )}
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
                >
                  Register Your Family Free →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-brand-accent/30 rounded-2xl p-4 sm:p-5 shadow-warm hover:shadow-warmLg hover:border-brand-accent transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-primary font-black text-sm shrink-0">
                            {m.photoUrl ? (
                              <img
                                src={m.photoUrl}
                                alt={m.fullName || "Member"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              m.fullName?.charAt(0) || "A"
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-brand-primary leading-tight truncate">
                              {m.fullName}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-brand-gold font-semibold font-devanagari">
                              <span className="truncate">Gotra: {m.gotra}</span>
                              {m.age !== null && m.age !== undefined ? (
                                <span className="text-[10px] font-sans font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                  Age {m.age} yrs
                                </span>
                              ) : m.birthYear ? (
                                <span className="text-[10px] font-sans font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                  Born {m.birthYear}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full va-badge-gold shrink-0">
                          #{m.serialNo || m.householdCode}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-body-text mb-4">
                        <p className="flex items-center gap-1.5 text-body-heading font-medium truncate">
                          <span className="truncate">
                            {m.professionTitle || m.profession || "Profession not listed"}
                            {m.companyName ? ` • ${m.companyName}` : ""}
                          </span>
                        </p>

                        <p className="flex items-center gap-1.5 text-body-muted truncate">
                          <span className="truncate">{m.currentCity}, {m.currentCountry}</span>
                        </p>

                        <p className="text-[11px] text-body-muted truncate">
                          <strong>Native Place:</strong> {m.nativePlace}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-brand-accent/20 flex items-center justify-between gap-2">
                      {m.isGovtIdVerified ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 truncate">
                          ✓ Verified Member
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-body-muted bg-canvas-warm/50 px-2 py-0.5 rounded-full border border-brand-accent/20 truncate">
                          Community Member
                        </span>
                      )}

                      <Link
                        href={`/directory/${m.id}`}
                        className="text-xs font-bold text-brand-primary hover:text-brand-burgundy flex items-center gap-1 hover:underline shrink-0"
                      >
                        <span>View Profile</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

export default function DirectoryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs font-bold">Loading Directory...</div>}>
      <DirectoryContent />
    </Suspense>
  );
}