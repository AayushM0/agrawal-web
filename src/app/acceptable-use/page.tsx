import React from "react";

export default function AcceptableUsePage() {
  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3 inline-block">
            Platform Conduct Code
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary mb-6">
            Acceptable Use Policy
          </h1>
          <p className="text-xs text-body-muted mb-8 pb-4 border-b border-brand-accent/20">
            Last Updated: August 30, 2026 | Maharaja Agrasen Foundation Limited Singapore
          </p>

          <div className="space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
            <p>
              This Acceptable Use Policy (AUP) outlines the rules governing the use of the Maharaja Agrasen Foundation Global Directory and messaging services. We maintain this directory exclusively to foster coordination and heritage preservation within the global Agarwal community.
            </p>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                1. System Integrity & Scraping Prohibitions
              </h2>
              <p className="mb-2">
                The global directory represents a protected compilation of verified community records. You agree not to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Deploy web scrapers, crawl agents, automated bots, spiders, or download tools to harvest contact details, photos, or Gotra statistics.</li>
                <li>Attempt to bypass API access controls or database rate limit checks (such as OTP trigger bounds or contact reveal limits).</li>
                <li>Conduct security scanning, vulnerability probing, or penetration tests without explicit coordination with our security team.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                2. Community Communication & Anti-Spam
              </h2>
              <p className="mb-2">
                Our messaging service supports verified member connections. In direct messages, you must not:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Send unsolicited commercial communications, advertisements, job recruitment pitches, or financial investment opportunities.</li>
                <li>Engage in harassment, stalking, hate speech, or sharing obscene, defaming, or culturally offensive materials.</li>
                <li>Impersonate another community member, gotra official, or Foundation moderator.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                3. Profile & Document Submission Rules
              </h2>
              <p className="mb-2">
                When registering a family or uploading identity proofs:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You must only submit authentic data. Falsifying names, ancestral cities, or Gotras is strictly prohibited.</li>
                <li>Uploaded photographs must be clear, clean, individual profile portraits and must not contain offensive, third-party, or copyrighted imagery.</li>
                <li>Submitted verification documents (Aadhaar, PAN, Passport) must be genuine and unedited.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                4. Enforcement & Reporting Abuse
              </h2>
              <p>
                Violations of this Acceptable Use Policy are taken extremely seriously. Moderators reserve the right to suspend or block households and members immediately. To report spamming, data harvesting, or abusive messaging on the platform, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-canvas-warm rounded-2xl border border-brand-accent/30 font-semibold text-brand-primary">
                📧 contact@maharajaagrasenfoundation.com <br />
                🏛️ Maharaja Agrasen Foundation Limited Singapore
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
