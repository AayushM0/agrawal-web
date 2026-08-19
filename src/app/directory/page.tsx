'use client';

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { allMockMembers } from "@/data/mockMembers";
import { gotras } from "@/data/gotras";

export default function DirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGotra, setSelectedGotra] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [nearMeActive, setNearMeActive] = useState(false);

  // Filter logic
  const filteredMembers = useMemo(() => {
    return allMockMembers.filter((m) => {
      if (m.householdStatus !== "live") return false;

      // Gotra filter
      if (selectedGotra !== "All" && m.gotra !== selectedGotra) return false;

      // Location filter
      if (selectedLocation !== "All") {
        const fullLoc = `${m.currentCity}, ${m.currentCountry}`;
        if (!fullLoc.toLowerCase().includes(selectedLocation.toLowerCase())) return false;
      }

      // Search Query (matches name, profession, native place, city)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.fullName.toLowerCase().includes(q);
        const matchesProf = m.profession.toLowerCase().includes(q);
        const matchesNative = m.nativePlace.toLowerCase().includes(q);
        const matchesCity = m.currentCity.toLowerCase().includes(q);
        if (!matchesName && !matchesProf && !matchesNative && !matchesCity) return false;
      }

      return true;
    });
  }, [searchQuery, selectedGotra, selectedLocation]);

  return (
    <main className="py-10 bg-canvas-page">
      <div className="max-w-7xl mx-auto px-4">
        {/* Search Hero Banner */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm mb-8">
          <div className="max-w-2xl mb-6">
            <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
              Verified Global Directory • सत्यापित निर्देशिका
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
              Search Agrawal Individuals & Families
            </h1>
            <p className="text-xs sm:text-sm text-body-muted mt-1">
              Search by Name, Gotra, Native Place, Profession, or City across the worldwide community.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[280px] relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, profession, or native place (e.g. Garg, Steel, Agroha)..."
                className="w-full pl-10 pr-4 py-3 rounded-full border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <svg className="w-4 h-4 text-brand-primary absolute left-4 top-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            <button
              type="button"
              onClick={() => setNearMeActive(!nearMeActive)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold transition-all ${
                nearMeActive
                  ? "bg-brand-primary text-white shadow-md"
                  : "bg-canvas-warm text-brand-primary border border-brand-accent/40 hover:bg-white"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{nearMeActive ? "Near Me: Active (50km)" : "Near Me (Radius)"}</span>
            </button>
          </div>
        </div>

        {/* Split View: Filters Sidebar + Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white border border-brand-accent/30 rounded-2xl p-5 shadow-warm sticky top-24 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-brand-accent/20">
                <h3 className="text-sm font-extrabold text-brand-primary">Filter Directory</h3>
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
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs font-semibold text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="All">All 18 Gotras</option>
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
                  className="w-full px-3 py-2 rounded-xl border border-brand-accent/40 text-xs font-semibold text-body-heading bg-canvas-warm/30 focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="All">All Locations</option>
                  <option value="New Delhi">New Delhi, India</option>
                  <option value="Bengaluru">Bengaluru, India</option>
                  <option value="Jaipur">Jaipur, India</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Dubai">Dubai, UAE</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-canvas-warm/60 border border-brand-accent/30 text-[11px] text-body-muted leading-relaxed">
                🔒 <strong>Privacy Guard:</strong> Full phone numbers and exact birth dates are login-gated and strictly protected per member preference.
              </div>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-body-heading">
                Showing <strong>{filteredMembers.length}</strong> verified community members
              </span>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="bg-white border border-brand-accent/30 rounded-2xl p-10 text-center shadow-warm">
                <p className="text-sm font-bold text-brand-primary mb-2">No matching profiles found</p>
                <p className="text-xs text-body-muted mb-4">
                  Try adjusting your search query or reset your Gotra/Location filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGotra("All");
                    setSelectedLocation("All");
                    setSearchQuery("");
                  }}
                  className="px-5 py-2 rounded-full text-xs font-bold text-white va-btn-maroon"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-brand-accent/30 rounded-2xl p-5 shadow-warm hover:shadow-warmLg hover:border-brand-accent transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-primary font-black text-sm shrink-0">
                            {m.fullName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-brand-primary leading-tight">
                              {m.fullName}
                            </h4>
                            <span className="text-[11px] text-brand-gold font-semibold font-devanagari">
                              Gotra: {m.gotra}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full va-badge-gold shrink-0">
                          {m.householdCode}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-body-text mb-4">
                        <p className="flex items-center gap-1.5 text-body-heading font-medium">
                          <svg className="w-3.5 h-3.5 text-brand-accent-dark shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                          </svg>
                          <span className="line-clamp-1">{m.profession}</span>
                        </p>

                        <p className="flex items-center gap-1.5 text-body-muted">
                          <svg className="w-3.5 h-3.5 text-brand-accent-dark shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          <span>{m.currentCity}, {m.currentCountry}</span>
                        </p>

                        <p className="text-[11px] text-body-muted">
                          <strong>Native Place:</strong> {m.nativePlace}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-brand-accent/20 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Verified Member
                      </span>

                      <Link
                        href={`/directory/${m.id}`}
                        className="text-xs font-bold text-brand-primary hover:text-brand-burgundy flex items-center gap-1 hover:underline"
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