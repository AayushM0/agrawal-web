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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGotra, setSelectedGotra] = useState(initialGotra);
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [nearMeActive, setNearMeActive] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update selectedGotra if URL param changes
  useEffect(() => {
    const urlGotra = searchParams.get("gotra");
    if (urlGotra) {
      setSelectedGotra(urlGotra);
    }
  }, [searchParams]);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await searchDirectory({
        query: searchQuery,
        gotra: selectedGotra,
        location: selectedLocation,
        nearMe: nearMeActive,
      });
      if (res.success && res.data) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedGotra, selectedLocation, nearMeActive]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchResults]);

  const activeFiltersCount = (selectedGotra !== "All" ? 1 : 0) + (selectedLocation !== "All" ? 1 : 0) + (nearMeActive ? 1 : 0);

  return (
    <main className="py-6 sm:py-10 bg-canvas-page">
      <div className="max-w-7xl mx-auto px-4">
        {/* Search Hero Banner */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-4 sm:p-8 shadow-warm mb-6 sm:mb-8">
          <div className="max-w-2xl mb-4 sm:mb-6">
            <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
              Verified Global Directory • सत्यापित निर्देशिका
            </span>
            <h1 className="text-xl sm:text-3xl font-black text-brand-primary">
              Search Agarwal Individuals & Families
            </h1>
            <p className="text-xs sm:text-sm text-body-muted mt-1">
              Search by Name, Gotra, Native Place, Profession, or City across the worldwide community.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, profession, or native place (e.g. Garg, Agroha)..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-full border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <svg className="w-4 h-4 text-brand-primary absolute left-4 top-3 sm:top-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className={`lg:hidden flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-3 rounded-full text-xs font-bold transition-all ${
                  mobileFiltersOpen || activeFiltersCount > 0
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-canvas-warm text-brand-primary border border-brand-accent/40 hover:bg-white"
                }`}
              >
                <span>🔍 Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-brand-gold text-brand-primary text-[10px] flex items-center justify-center font-extrabold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setNearMeActive(!nearMeActive)}
                className={`flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-xs font-bold transition-all ${
                  nearMeActive
                    ? "bg-brand-primary text-white shadow-md"
                    : "bg-canvas-warm text-brand-primary border border-brand-accent/40 hover:bg-white"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span className="truncate">{nearMeActive ? "Near Me: Active" : "Near Me"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Split View: Filters Sidebar + Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar (Always visible on desktop lg, collapsible on mobile) */}
          <aside className={`lg:col-span-1 ${mobileFiltersOpen ? "block" : "hidden lg:block"}`}>
            <div className="bg-white border border-brand-accent/30 rounded-2xl p-4 sm:p-5 shadow-warm sticky top-20 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-brand-accent/20">
                <h3 className="text-sm font-extrabold text-brand-primary flex items-center gap-2">
                  <span>Filter Directory</span>
                  {activeFiltersCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full va-badge-gold">
                      {activeFiltersCount} active
                    </span>
                  )}
                </h3>
                {(selectedGotra !== "All" || selectedLocation !== "All" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGotra("All");
                      setSelectedLocation("All");
                      setSearchQuery("");
                    }}
                    className="text-[11px] font-bold text-red-700 hover:underline"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Gotra Filter */}
              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Gotra (गोत्र)
                </label>
                <select
                  value={selectedGotra}
                  onChange={(e) => setSelectedGotra(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-semibold text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="All">All 18 Established Gotras</option>
                  {gotras.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name} ({g.devanagari})
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-xs font-bold text-body-heading mb-1.5">
                  Country / City
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs font-semibold text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="All">All Global Locations</option>
                  <option value="New Delhi">New Delhi, India</option>
                  <option value="Bengaluru">Bengaluru, India</option>
                  <option value="Jaipur">Jaipur, India</option>
                  <option value="Agroha">Agroha, Haryana</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Dubai">Dubai, UAE</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-canvas-warm/60 border border-brand-accent/30 text-[11px] text-body-muted leading-relaxed">
                🔒 <strong>Privacy Guard:</strong> Direct contact details are protected behind verified member access.
              </div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="lg:hidden w-full py-2.5 rounded-xl text-xs font-bold text-brand-primary bg-canvas-warm hover:bg-canvas-warm/80 transition-colors"
              >
                Apply & View Results ({members.length})
              </button>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-body-heading">
                Showing <strong>{members.length}</strong> verified community member{members.length === 1 ? "" : "s"}
              </span>
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
                  {selectedGotra !== "All" || selectedLocation !== "All" || searchQuery
                    ? "Try adjusting your search keywords or resetting your Gotra and location filters."
                    : "No verified households are registered yet. Be the first to register your family!"}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  {(selectedGotra !== "All" || selectedLocation !== "All" || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGotra("All");
                        setSelectedLocation("All");
                        setSearchQuery("");
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-canvas-warm border border-brand-accent"
                    >
                      Clear Filters
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-brand-accent/30 rounded-2xl p-4 sm:p-5 shadow-warm hover:shadow-warmLg hover:border-brand-accent transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-primary font-black text-sm shrink-0">
                            {m.fullName?.charAt(0) || "A"}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-brand-primary leading-tight truncate">
                              {m.fullName}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-brand-gold font-semibold font-devanagari">
                              <span className="truncate">Gotra: {m.gotra}</span>
                              {calculateAge(m.dob) !== null && (
                                <span className="text-[10px] font-sans font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                  {calculateAge(m.dob)} yrs
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full va-badge-gold shrink-0">
                          #{m.serialNo || m.householdCode}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-body-text mb-4">
                        <p className="flex items-center gap-1.5 text-body-heading font-medium truncate">
                          <span className="truncate">{m.professionTitle || m.profession || "Profession not listed"}</span>
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
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 truncate">
                        ✓ Verified Member
                      </span>

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