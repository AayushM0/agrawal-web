import React from "react";
import Link from "next/link";
import HeroSection from "@/components/home/HeroSection";
import SevenPillarsGrid from "@/components/home/SevenPillarsGrid";
import GotraSection from "@/components/home/GotraSection";
import FounderAppeal from "@/components/home/FounderAppeal";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <SevenPillarsGrid />

      {/* Matrimonial Feature Callout Banner */}
      <section className="bg-gradient-to-r from-[#5a0016] via-[#800020] to-[#5a0016] text-white py-10 sm:py-12 px-4 border-y-2 border-brand-gold/40 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-amber-200 border border-amber-300/30 uppercase tracking-widest">
              <span>💍</span>
              <span>Now Live • वैश्विक वैवाहिक मंच</span>
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-amber-100">
              Agarwal Matrimonial Portal &amp; Candidate Profiles
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/90 max-w-2xl leading-relaxed">
              A verified, community-gated matrimonial platform for Agarwal families worldwide. Discover eligible brides and grooms filtered across all 18 Gotras with verified lineage, interactive family trees, and direct alliance communication.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/matrimony"
              className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold text-[#800020] bg-gradient-to-r from-[#fae8b2] to-[#f5d070] hover:from-[#f5d070] hover:to-[#fae8b2] transition-all shadow-goldCta flex items-center justify-center gap-2"
            >
              <span>Explore Matrimony Profiles</span>
              <span>→</span>
            </Link>
            <Link
              href="/matrimony/create"
              className="w-full sm:w-auto px-5 py-3 rounded-full text-xs font-bold text-white border border-amber-300/40 hover:bg-white/10 transition-all text-center"
            >
              + Register Candidate
            </Link>
          </div>
        </div>
      </section>

      <GotraSection />
      <FounderAppeal />
    </main>
  );
}