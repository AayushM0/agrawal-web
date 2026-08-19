import React from "react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-brand-accent/20 py-12 sm:py-16 lg:py-24 bg-[linear-gradient(180deg,rgba(255,253,248,0.92)_0%,rgba(255,246,229,0.88)_100%),url('/images/agroha-hero-bg.jpg')] bg-cover bg-center bg-no-repeat">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold va-badge-maroon mb-3 sm:mb-4">
            CONNECT • SUPPORT • COLLABORATE • GROW
          </span>
          
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-brand-primary leading-[1.2] mb-3 sm:mb-4 tracking-tight">
            Connecting Agrawals Worldwide Into One Trusted Global Family
          </h1>
          
          <p className="text-sm sm:text-base lg:text-lg font-bold text-body-heading mb-2 sm:mb-3">
            One Community • One Platform • One Global Family |{" "}
            <span className="font-devanagari font-semibold text-brand-primary">
              एक समाज • एक मंच • एक परिवार
            </span>
          </p>
          
          <p className="text-xs sm:text-sm lg:text-base text-body-text/85 leading-relaxed mb-6 sm:mb-8 max-w-2xl">
            Built on the enduring principles of Maharaja Agrasen — Dharma, Seva, Sanskaar, Education, and Community Upliftment. A secure, trusted, and verified global platform where Agrawal families connect, collaborate, and grow together. Registration is completely <strong>FREE OF CHARGE</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 sm:px-7 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-extrabold text-white va-btn-join shadow-goldCta text-center"
            >
              Register Your Family Free →
            </Link>
            <Link
              href="/directory"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold text-white va-btn-maroon text-center"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search Directory</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}