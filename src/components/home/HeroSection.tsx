import React from "react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-brand-accent/20 py-12 sm:py-16 lg:py-24 bg-[linear-gradient(180deg,rgba(255,253,248,0.92)_0%,rgba(255,246,229,0.88)_100%),url('/images/agroha-hero-bg.jpg')] bg-cover bg-center bg-no-repeat">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold va-badge-maroon mb-3 sm:mb-4">
            Connect • Support • Collaborate • Grow
          </span>
          
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-brand-primary leading-[1.2] mb-3 sm:mb-4 tracking-tight">
            Connecting Agarwals Worldwide Into One Trusted Global Family
          </h1>
          
          <p className="text-sm sm:text-base lg:text-lg font-bold text-body-heading mb-2 sm:mb-3">
            One Community • One Platform • One Global Family |{" "}
            <span className="font-devanagari font-semibold text-brand-primary">
              एक समाज • एक मंच • एक परिवार
            </span>
          </p>
          
          <p className="text-xs sm:text-sm lg:text-base text-body-text/85 leading-relaxed mb-6 sm:mb-8 max-w-2xl">
            Built on the enduring principles of Maharaja Agrasen — Dharma, Seva, Sanskaar, Education, and Community Upliftment. A secure, trusted, and verified global platform where Agarwal families connect, collaborate, and grow together. Registration is completely <strong>FREE OF CHARGE</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-3xl">
            <Link
              href="/signup"
              className="h-11 sm:h-12 px-4 rounded-full text-xs sm:text-sm font-extrabold text-white va-btn-join shadow-goldCta flex items-center justify-center gap-1.5 text-center transition-all"
            >
              <span>Register Family Free</span>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link
              href="/directory"
              className="h-11 sm:h-12 px-4 rounded-full text-xs sm:text-sm font-bold text-brand-primary bg-white border border-brand-accent/50 hover:bg-canvas-warm flex items-center justify-center gap-2 text-center shadow-xs transition-all"
            >
              <svg className="w-4 h-4 text-brand-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search Directory</span>
            </Link>
            <Link
              href="/businesses"
              className="h-11 sm:h-12 px-4 rounded-full text-xs sm:text-sm font-bold text-brand-primary bg-white border border-brand-accent/50 hover:bg-canvas-warm flex items-center justify-center gap-2 text-center shadow-xs transition-all"
            >
              <svg className="w-4 h-4 text-brand-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <span>Business Network</span>
            </Link>
            <Link
              href="/matrimony"
              className="h-11 sm:h-12 px-4 rounded-full text-xs sm:text-sm font-bold text-brand-primary bg-white border border-brand-accent/50 hover:bg-canvas-warm flex items-center justify-center gap-2 text-center shadow-xs transition-all"
            >
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span>Matrimony Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}