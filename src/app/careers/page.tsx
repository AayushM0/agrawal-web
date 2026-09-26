'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getLiveCareerProfilesAction } from "@/actions/career";
import { gotras } from "@/data/gotras";
import type { CareerProfile, CareerLevel, PrimaryDomain } from "@/types/career";

const DOMAIN_OPTIONS: string[] = [
  "All Domains",
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

const SENIORITY_OPTIONS = [
  { value: "all", label: "All Seniority Levels" },
  { value: "student_intern", label: "Student / Intern" },
  { value: "fresher", label: "Fresher / Early Career (0-2 Yrs)" },
  { value: "mid_level", label: "Mid-Level (3-7 Yrs)" },
  { value: "senior", label: "Senior Leader (8-15 Yrs)" },
  { value: "executive", label: "Executive / C-Suite (15+ Yrs)" },
  { value: "consultant", label: "Consultant / Advisory" },
];

export default function CareerDirectoryPage() {
  const [activeTab, setActiveTab] = useState<"talent" | "jobs">("talent");
  const [profiles, setProfiles] = useState<CareerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All Domains");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedGotra, setSelectedGotra] = useState("all");
  const [isMentorOnly, setIsMentorOnly] = useState(false);

  useEffect(() => {
    async function loadTalent() {
      setIsLoading(true);
      try {
        const res = await getLiveCareerProfilesAction({
          query: searchTerm.trim() || undefined,
          primaryDomain: selectedDomain !== "All Domains" ? selectedDomain : undefined,
          careerLevel: selectedLevel !== "all" ? selectedLevel : undefined,
          gotra: selectedGotra !== "all" ? selectedGotra : undefined,
          isMentorAvailable: isMentorOnly || undefined,
        });

        if (res.success) {
          setProfiles(res.profiles);
          setTotalCount(res.total);
        }
      } catch (err) {
        console.error("Failed to load career talent:", err);
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(loadTalent, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedDomain, selectedLevel, selectedGotra, isMentorOnly]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDomain("All Domains");
    setSelectedLevel("all");
    setSelectedGotra("all");
    setIsMentorOnly(false);
  };

  return (
    <div className="min-h-screen bg-canvas-warm/20 py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Banner & Value Proposition */}
        <div className="bg-gradient-to-r from-brand-primary via-[#681121] to-brand-primary text-white rounded-3xl p-6 sm:p-10 shadow-warm mb-8 relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-amber-200 border border-amber-300/30 uppercase tracking-widest mb-3">
              <span>💼</span>
              <span>Pillar 4 • वैश्विक करियर एवं रोजगार संजाल</span>
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
              Global Agarwal Jobs &amp; Careers Network
            </h1>
            <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed mb-6 font-devanagari">
              अग्रवाल समाज के प्रतिभाशाली युवाओं, कॉर्पोरेट नेतृत्वकर्ताओं एवं व्यापारिक प्रतिष्ठानों को एक विश्वसनीय मंच पर जोड़ना। 100% सत्यापित समुदाय परिचय एवं गोपनीय करियर अवसर।
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/careers/create"
                className="px-6 py-2.5 rounded-full text-xs font-bold text-brand-primary bg-gradient-to-r from-[#fae8b2] to-[#f5d070] hover:from-[#f5d070] hover:to-[#fae8b2] transition-all shadow-goldCta flex items-center gap-1.5 min-h-[38px]"
              >
                <span>+ Build Your Career Profile</span>
              </Link>
              <Link
                href="/careers/jobs/create"
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white border border-amber-300/40 hover:bg-white/10 transition-all min-h-[38px] flex items-center"
              >
                🏢 Post Job Opening
              </Link>
            </div>
          </div>
        </div>

        {/* Directory Dual-Tab Header */}
        <div className="flex items-center gap-2 mb-6 border-b border-brand-accent/30 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("talent")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
              activeTab === "talent"
                ? "bg-brand-primary text-white shadow-xs"
                : "text-body-muted hover:text-brand-primary hover:bg-canvas-warm/50"
            }`}
          >
            <span>👨‍💼 Professionals &amp; Talent</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
              {totalCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
              activeTab === "jobs"
                ? "bg-brand-primary text-white shadow-xs"
                : "text-body-muted hover:text-brand-primary hover:bg-canvas-warm/50"
            }`}
          >
            <span>🏢 Job Openings &amp; Internships</span>
          </button>
        </div>

        {activeTab === "jobs" ? (
          <div className="bg-white rounded-3xl border border-brand-accent/30 p-8 sm:p-12 text-center shadow-warm">
            <div className="text-4xl mb-3">🏢</div>
            <h2 className="text-lg font-bold text-brand-primary mb-1">
              Verified Enterprise Job Openings
            </h2>
            <p className="text-xs text-body-muted max-w-md mx-auto mb-6 leading-relaxed">
              Explore corporate vacancies, industrial internships, and leadership roles posted directly by verified Agarwal enterprises from the Global Business Network.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/careers/jobs/create"
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon min-h-[38px] shadow-xs flex items-center"
              >
                + Post Enterprise Vacancy
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter Controls Bar */}
            <div className="bg-white p-4 rounded-3xl border border-brand-accent/30 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body-muted text-xs">🔍</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by candidate name, headline, skills, or company..."
                    className="w-full pl-9 pr-4 py-2 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-body-muted hover:text-brand-primary"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="px-3 py-2 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  >
                    {SENIORITY_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  <select
                    value={selectedGotra}
                    onChange={(e) => setSelectedGotra(e.target.value)}
                    className="px-3 py-2 bg-canvas-warm/40 border border-brand-accent/30 rounded-xl text-xs text-body-heading font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[38px]"
                  >
                    <option value="all">All 18 Gotras</option>
                    {gotras.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name} ({g.devanagari})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsMentorOnly(!isMentorOnly)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition min-h-[38px] flex items-center gap-1 ${
                      isMentorOnly
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                        : "bg-canvas-warm/40 text-emerald-900 border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <span>🤝 Mentors Only</span>
                  </button>

                  {(searchTerm || selectedDomain !== "All Domains" || selectedLevel !== "all" || selectedGotra !== "all" || isMentorOnly) && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-3 py-2 text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 rounded-xl transition min-h-[38px]"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Domain Pills Scrollable */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-0.5">
                {DOMAIN_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDomain(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      selectedDomain === d
                        ? "bg-brand-primary text-white shadow-2xs"
                        : "bg-canvas-warm/40 text-body-muted hover:bg-canvas-warm hover:text-body-heading"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Cards Grid */}
            {isLoading ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-brand-accent/30 shadow-warm">
                <div className="animate-spin text-3xl mb-2">💼</div>
                <p className="text-xs text-body-muted font-bold">Discovering Community Professionals...</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-brand-accent/30 p-8 shadow-warm">
                <p className="text-base font-bold text-brand-primary mb-1">
                  No professionals match this search
                </p>
                <p className="text-xs text-body-muted mb-4">
                  Try adjusting your domain, gotra, or seniority filters.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-5 py-2 rounded-full text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 min-h-[38px]"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-3xl border border-brand-accent/30 p-5 shadow-warm hover:shadow-warmLg transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: Avatar & Verified Badges */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0 border border-brand-accent/30 text-sm overflow-hidden">
                            {p.photoUrl ? (
                              <img
                                src={p.photoUrl}
                                alt={p.fullName || "Candidate"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              p.fullName?.charAt(0)?.toUpperCase() || "A"
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-brand-primary truncate">
                              {p.fullName || "Community Member"}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold text-body-muted">
                              {p.gotra && (
                                <span className="va-badge-gold px-1.5 py-0.5 rounded-full">
                                  {p.gotra}
                                </span>
                              )}
                              {p.serialNo && p.serialNo !== "NaN" && (typeof p.serialNo === "string" ? !p.serialNo.includes("NaN") : !isNaN(p.serialNo)) ? (
                                <span className="font-mono bg-canvas-warm px-1.5 py-0.5 rounded border border-brand-accent/30">
                                  #{p.serialNo}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {p.isMentorAvailable && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                            🤝 Mentor
                          </span>
                        )}
                      </div>

                      {/* Professional Headline */}
                      <p className="text-xs font-bold text-body-heading line-clamp-2 mb-2 leading-snug">
                        {p.headline}
                      </p>

                      {/* Current Role & Domain */}
                      <div className="space-y-1 text-[11px] text-body-muted mb-3">
                        {(p.currentDesignation || p.currentCompany) && (
                          <p className="truncate">
                            💼 {p.currentDesignation || "Role"} {p.currentCompany ? `at ${p.currentCompany}` : ""}
                          </p>
                        )}
                        <p className="truncate">
                          🏛️ {p.primaryDomain} • {p.yearsOfExperience} Yrs Exp
                        </p>
                        {p.city && (
                          <p className="truncate">
                            📍 {p.city}, {p.state || p.country || "India"}
                          </p>
                        )}
                      </div>

                      {/* Skills Tags */}
                      {p.skills && p.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {p.skills.slice(0, 4).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] font-medium bg-canvas-warm/50 text-body-heading px-2 py-0.5 rounded-lg border border-brand-accent/20"
                            >
                              {s}
                            </span>
                          ))}
                          {p.skills.length > 4 && (
                            <span className="text-[10px] font-bold text-body-muted px-1.5 py-0.5">
                              +{p.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-brand-accent/20 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold capitalize text-body-muted">
                        {p.seekingStatus.replace(/_/g, " ")}
                      </span>
                      <Link
                        href={`/careers/${p.id}`}
                        className="px-4 py-1.5 rounded-full text-xs font-bold text-white va-btn-maroon min-h-[34px] flex items-center shadow-xs"
                      >
                        View Profile →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
