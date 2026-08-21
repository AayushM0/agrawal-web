import React from "react";
import Link from "next/link";
import SevenPillarsGrid from "@/components/home/SevenPillarsGrid";

export default function AboutPage() {
  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <span className="text-xs font-bold uppercase tracking-wider va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
          Strategic Roadmap
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-brand-primary mb-4">
          About Maharaja Agrasen Global Platform
        </h1>
        <p className="text-base text-body-text leading-relaxed mb-6">
          The ANTARRASHTRIYA AGARWAL SAMAJ DIRECTORY is an international community initiative commissioned by the Maharaja Agrasen Foundation Limited Singapore. Our goal is to create a trusted global ecosystem where Agrawals across all countries can connect, collaborate, and grow together.
        </p>
        
        <div className="bg-white border border-brand-accent/30 rounded-2xl p-6 shadow-warm mb-8">
          <h2 className="text-lg font-bold text-brand-primary mb-2">The Philosophy of Trust & Privacy</h2>
          <p className="text-xs sm:text-sm text-body-text leading-relaxed">
            Community trust must always come before technology. Personal information is safeguarded with granular visibility toggles, OTP verification, and strict login gating. We begin with the Family Directory, laying the trusted foundation for future business, matrimonial, career, and social initiatives.
          </p>
        </div>

        <Link href="/signup" className="inline-block px-6 py-3 rounded-full text-xs font-bold text-white va-btn-join">
          Join the Directory (Free Registration) →
        </Link>
      </div>

      <SevenPillarsGrid />
    </main>
  );
}