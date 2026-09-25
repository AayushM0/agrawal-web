'use client';

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getLiveBusinessProfiles } from "@/actions/business";
import type { BusinessProfile } from "@/types/business";

export const SECTOR_OPTIONS = [
  "All",
  "Manufacturing & Heavy Industries",
  "Textiles, Apparel & Garments",
  "Steel, Iron & Metals",
  "Chemicals & Plastics",
  "Information Technology & Software",
  "Finance & Investment",
  "Real Estate & Construction",
  "Retail & FMCG",
  "Healthcare & Pharmaceuticals",
  "Logistics & Supply Chain",
  "Agro & Food Processing",
  "Jewellery & Precious Metals",
  "Professional & Legal Services",
  "Education & EdTech",
  "Hospitality & Events",
  "Other",
];

export const BUSINESS_TYPE_OPTIONS = [
  "All",
  "Manufacturer",
  "Wholesaler / Trader / Distributor",
  "Retailer",
  "Exporter / Importer",
  "Professional Firm / Consultancy",
  "Service Provider",
  "Other",
];

function BusinessDirectoryContent() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [selectedSector, setSelectedSector] = useState(searchParams.get("sector") || "All");
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "All");
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") || "");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") || "");
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verified") === "true");

  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getLiveBusinessProfiles({
        query: query.trim() || undefined,
        sector: selectedSector !== "All" ? selectedSector : undefined,
        businessType: selectedType !== "All" ? selectedType : undefined,
        city: cityFilter.trim() || undefined,
        state: stateFilter.trim() || undefined,
        verifiedOnly: verifiedOnly ? true : undefined,
      });

      setProfiles(res.profiles || []);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error("Error fetching business profiles:", err);
      setProfiles([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedSector, selectedType, cityFilter, stateFilter, verifiedOnly]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleResetFilters = () => {
    setQuery("");
    setSelectedSector("All");
    setSelectedType("All");
    setCityFilter("");
    setStateFilter("");
    setVerifiedOnly(false);
  };

  const activeFiltersCount =
    (query.trim() ? 1 : 0) +
    (selectedSector !== "All" ? 1 : 0) +
    (selectedType !== "All" ? 1 : 0) +
    (cityFilter.trim() ? 1 : 0) +
    (stateFilter.trim() ? 1 : 0) +
    (verifiedOnly ? 1 : 0);

  return (
    <main className="min-h-screen bg-canvas-page py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero & Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-brand-primary/5 to-amber-100/40 border border-brand-accent/30 p-6 sm:p-10 shadow-warm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-100/80 text-brand-burgundy border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                अग्रवाल व्यापार संजाल • Global Business Network
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-black text-brand-primary tracking-tight">
                Agarwal Business Directory
              </h1>
              <p className="text-sm sm:text-base text-body-muted leading-relaxed">
                Connect, trade, and collaborate with verified enterprises, manufacturers, and service leaders of the
                global Agarwal community. Anchored to authenticated household lineage with verified commercial standing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/businesses/create"
                className="px-5 py-3 rounded-full text-sm font-bold text-white va-btn-join shadow-goldCta inline-flex items-center gap-2"
              >
                <span>+ Register Your Enterprise</span>
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-3 rounded-full text-sm font-semibold text-brand-primary bg-white hover:bg-amber-50 border border-brand-accent/40 shadow-xs transition"
              >
                My Businesses →
              </Link>
            </div>
          </div>
        </div>

        {/* Search & Faceted Filter Bar */}
        <div className="bg-white rounded-2xl border border-brand-accent/30 p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company name, products, services, keywords..."
                className="w-full px-4 py-2.5 pl-10 rounded-xl border border-brand-accent/30 focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm"
              />
              <span className="absolute left-3.5 top-3 text-body-muted text-sm">🔍</span>
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-body-muted hover:text-brand-primary px-1.5 py-0.5 rounded-full"
                >
                  ✕
                </button>
              )}
            </div>

            {/* City / Location Input */}
            <div className="md:col-span-3 relative">
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="City (e.g. Mumbai, Delhi, Surat)..."
                className="w-full px-4 py-2.5 rounded-xl border border-brand-accent/30 focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm"
              />
            </div>

            {/* Business Type Selector */}
            <div className="md:col-span-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/30 focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm bg-white"
              >
                {BUSINESS_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type === "All" ? "All Business Types" : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Verified Only Toggle */}
            <div className="md:col-span-2 flex items-center justify-start md:justify-end">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  ✓ Verified Only
                </span>
              </label>
            </div>
          </div>

          {/* Sector Filter Chips */}
          <div className="pt-2 border-t border-brand-accent/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-body-muted">
                Industry Sectors:
              </span>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-brand-primary hover:underline font-semibold"
                >
                  Reset All Filters ({activeFiltersCount})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {SECTOR_OPTIONS.map((sector) => {
                const isSelected = selectedSector === sector;
                return (
                  <button
                    key={sector}
                    onClick={() => setSelectedSector(sector)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      isSelected
                        ? "bg-brand-primary text-white shadow-xs"
                        : "bg-canvas-warm/80 text-body-heading hover:bg-amber-100/60 border border-brand-accent/20"
                    }`}
                  >
                    {sector}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs sm:text-sm text-body-muted">
            Showing <span className="font-bold text-body-heading">{profiles.length}</span> of{" "}
            <span className="font-bold text-body-heading">{totalCount}</span> verified enterprises
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-brand-accent/20 p-6 shadow-xs animate-pulse space-y-4"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-xl"></div>
                <div className="h-5 bg-amber-100 rounded w-3/4"></div>
                <div className="h-3 bg-amber-50 rounded w-1/2"></div>
                <div className="h-12 bg-amber-50/50 rounded"></div>
                <div className="h-8 bg-amber-100/60 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && profiles.length === 0 && (
          <div className="bg-white rounded-3xl border border-brand-accent/30 p-12 text-center space-y-5 shadow-xs max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-brand-gold/40 text-brand-primary flex items-center justify-center text-3xl mx-auto">
              🏢
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-xl font-bold text-brand-primary">
                No Enterprises Found
              </h3>
              <p className="text-xs sm:text-sm text-body-muted max-w-md mx-auto">
                No businesses match your current filter criteria. Try adjusting your keyword search, removing sector
                restrictions, or register the first business in this category!
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/30 transition"
                >
                  Clear Filters
                </button>
              )}
              <Link
                href="/businesses/create"
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
              >
                Register Your Business Free →
              </Link>
            </div>
          </div>
        )}

        {/* Enterprise Cards Grid */}
        {!isLoading && profiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => {
              const primaryPhoto = profile.photos && profile.photos.length > 0 ? profile.photos[0] : null;
              const primaryDirector =
                profile.linkedDirectors && profile.linkedDirectors.length > 0
                  ? profile.linkedDirectors.find((d) => d.isPrimaryContact) || profile.linkedDirectors[0]
                  : null;

              return (
                <div
                  key={profile.id}
                  className="bg-white rounded-2xl border border-brand-accent/30 p-6 shadow-xs hover:shadow-warm transition flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header Row: Thumbnail / Initial + Verified Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {primaryPhoto ? (
                          <img
                            src={primaryPhoto}
                            alt={profile.businessName}
                            className="w-14 h-14 rounded-xl object-cover border border-brand-accent/30 shadow-xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 border border-brand-accent/40 flex items-center justify-center text-xl font-serif font-black text-brand-primary shadow-xs">
                            {profile.businessName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-serif text-lg font-bold text-brand-primary group-hover:text-brand-burgundy transition line-clamp-1">
                            {profile.businessName}
                          </h3>
                          <p className="text-xs text-body-muted flex items-center gap-1">
                            <span>📍</span> {profile.city}, {profile.state}
                            {profile.yearEstablished && (
                              <span className="text-body-muted/70">• Est. {profile.yearEstablished}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {profile.isVerifiedBadge && (
                        <span
                          title="Verified Agarwal Enterprise with verified credentials"
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    {/* Tagline */}
                    {profile.tagline && (
                      <p className="text-xs italic text-body-muted line-clamp-2">
                        &ldquo;{profile.tagline}&rdquo;
                      </p>
                    )}

                    {/* Sector & Type Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-brand-burgundy border border-amber-200">
                        {profile.industrySector}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-canvas-warm text-body-heading border border-brand-accent/20">
                        {profile.businessType}
                      </span>
                    </div>

                    {/* About / Offerings Snippet */}
                    <p className="text-xs text-body-muted line-clamp-3 leading-relaxed">
                      {profile.offeringsSummary || profile.aboutBusiness}
                    </p>

                    {/* Linked Leadership Preview */}
                    {primaryDirector && (
                      <div className="p-2.5 rounded-xl bg-canvas-warm/50 border border-brand-accent/20 text-xs flex items-center justify-between">
                        <span className="text-body-muted text-[11px]">Leadership:</span>
                        <span className="font-semibold text-body-heading">
                          {primaryDirector.name}{" "}
                          <span className="text-body-muted text-[10px]">({primaryDirector.roleTitle})</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: CTA */}
                  <div className="pt-4 mt-4 border-t border-brand-accent/20 flex items-center justify-between">
                    <span className="text-[11px] text-body-muted">100% In-Platform Privacy</span>
                    <Link
                      href={`/businesses/${profile.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/30 transition group-hover:bg-brand-primary group-hover:text-white"
                    >
                      View Profile →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function BusinessDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-body-muted">
          Loading Agarwal Business Network...
        </div>
      }
    >
      <BusinessDirectoryContent />
    </Suspense>
  );
}
