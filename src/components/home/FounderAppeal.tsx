import React from "react";
import Link from "next/link";

export default function FounderAppeal() {
  return (
    <section className="py-12 sm:py-16 bg-white border-b border-brand-accent/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-[linear-gradient(135deg,#d9531e_0%,#e06d14_50%,#b8430a_100%)] text-white rounded-3xl p-6 sm:p-12 shadow-warmLg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4">
              <span className="inline-block text-[10px] sm:text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-brand-gold text-white">
                Founders Appeal • संदेश
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
                An Appeal to Every Agrawal Family
              </h2>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-2xl">
                Our vision is to document, unite, and empower every family in our global community. By registering your household today, you help build an unbreakable legacy of mutual support, cultural preservation, and youth opportunities.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/signup"
                  className="px-7 py-3 rounded-full text-xs sm:text-sm font-extrabold text-brand-heading bg-amber-300 hover:bg-amber-200 shadow-md text-center transition-all"
                >
                  Register Your Family Free →
                </Link>
                <Link
                  href="/about"
                  className="px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 text-center transition-all"
                >
                  Read About the Mission
                </Link>
              </div>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs space-y-3">
              <h3 className="text-sm font-bold text-amber-200">
                Maharaja Agrasen Foundation Limited Singapore
              </h3>
              <p className="text-white/90 leading-relaxed">
                Dedicated to the socio-economic advancement and cultural solidarity of the global Agrawal community.
              </p>
              <div className="pt-2 border-t border-white/15 text-[11px] text-white/80">
                Free Registration • No Commercial Advertisements • Data Protected
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}