import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function FounderAppeal() {
  return (
    <section className="py-12 sm:py-16 bg-white border-b border-brand-accent/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-[linear-gradient(135deg,#d9531e_0%,#e06d14_50%,#b8430a_100%)] text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-warmLg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 8 columns: Message & CTAs */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-brand-gold text-white">
                  Founder&apos;s Appeal • संस्थापक संदेश
                </span>
                <span className="text-xs text-amber-200 font-medium">
                  Maharaja Agrasen Foundation Limited Singapore
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
                An Appeal to Every Agarwal Family Worldwide
              </h2>

              <blockquote className="text-sm sm:text-base text-amber-100 font-medium italic border-l-3 border-amber-300 pl-4 py-1 leading-relaxed">
                &ldquo;Our vision is to document, unite, and empower every family in our global community. By registering your household today, you help build an unbreakable legacy of mutual support, cultural preservation, and youth opportunities.&rdquo;
              </blockquote>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/signup"
                  className="h-11 sm:h-12 px-7 rounded-full text-xs sm:text-sm font-extrabold text-brand-heading bg-amber-300 hover:bg-amber-200 shadow-md flex items-center justify-center text-center transition-all"
                >
                  Register Your Family Free →
                </Link>
                <Link
                  href="/sohan-lal-jindal"
                  className="h-11 sm:h-12 px-6 rounded-full text-xs sm:text-sm font-bold text-white bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center text-center transition-all"
                >
                  Founder&apos;s Profile &amp; Vision →
                </Link>
                <Link
                  href="/about"
                  className="h-11 sm:h-12 px-5 rounded-full text-xs sm:text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 flex items-center justify-center text-center transition-all"
                >
                  About 7 Pillars
                </Link>
              </div>
            </div>

            {/* Right 4 columns: Founder Card with Photo */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="w-full bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-5 text-center flex flex-col items-center shadow-lg">
                <Link href="/sohan-lal-jindal" className="group block relative">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-3 border-amber-300 shadow-md transition-transform group-hover:scale-105 mx-auto">
                    <Image
                      src="/images/sohan-lal-jindal-singapore.jpg"
                      alt="Sohan Lal Jindal (सोहनलाल जिंदल), Founder and Chairman, Maharaja Agrasen Foundation Limited, Singapore"
                      fill
                      sizes="128px"
                      className="object-cover object-top"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white shadow-xs" title="Official Verified Founder" />
                </Link>

                <h3 className="mt-3 text-base font-black text-white leading-tight">
                  <Link href="/sohan-lal-jindal" className="hover:text-amber-200 transition-colors">
                    Sohan Lal Jindal
                  </Link>
                </h3>
                <p className="text-xs text-amber-200 font-devanagari font-semibold mt-0.5">
                  सोहनलाल जिंदल &ldquo;Singapore Wale&rdquo;
                </p>
                <p className="text-[11px] text-white/80 font-medium mt-1">
                  Founder &amp; Chairman
                </p>
                <p className="text-[10px] text-white/70 font-mono">
                  Singapore UEN: 202551557G
                </p>

                <div className="mt-4 pt-3 border-t border-white/15 w-full flex items-center justify-center gap-2">
                  <Link
                    href="/sohan-lal-jindal"
                    className="text-xs font-bold text-amber-300 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    View Official Profile &amp; Bio →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
