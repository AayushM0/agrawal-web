import React from "react";

export default function PrivacyPage() {
  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3 inline-block">
            Data Protection & Privacy Policy
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary mb-6">
            Privacy Policy
          </h1>
          <p className="text-xs text-body-muted mb-8 pb-4 border-b border-brand-accent/20">
            Effective Date: August 30, 2026 | Maharaja Agrasen Foundation Limited Singapore
          </p>

          <div className="space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                1. Scope & Commitment
              </h2>
              <p>
                Maharaja Agrasen Foundation Limited Singapore ("Foundation", "we", "us", or "our") respects your family&apos;s privacy. We are committed to protecting the personal data of the Agarwal community members who register on this platform. This Privacy Policy describes how we collect, use, store, and safeguard the personal data you provide, in accordance with applicable laws, including the Singapore Personal Data Protection Act (PDPA) and the Digital Personal Data Protection (DPDP) framework where applicable.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                2. Personal Data We Collect
              </h2>
              <p className="mb-2">
                During the 5-step registration wizard, we collect the following categories of personal data from the Head of Household and additional family members:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Identity Information:</strong> Full name, father&apos;s / husband&apos;s name, gender, marital status, and ancestral native place.</li>
                <li><strong>Lineage:</strong> Gotra (matching one of the 18 established Gotras founded by Maharaja Agrasen).</li>
                <li><strong>Contact Details:</strong> Verified mobile phone number and email address.</li>
                <li><strong>Government Identifiers (Sensitive Data):</strong> Aadhaar number and PAN number (for Indian residents) or Passport number and Tax/Government ID (for non-Indian residents). These are strictly used for verification to prevent duplicate or fraudulent community profiles.</li>
                <li><strong>Media Assets:</strong> Optional profile photograph.</li>
                <li><strong>Location & Address:</strong> Residential country, state, city, postal / PIN code, and complete address.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                3. Purpose of Processing
              </h2>
              <p className="mb-2">
                We process your personal data for the following legitimate purposes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Directory Verification:</strong> To verify community members and prevent fake entries, maintaining a trusted directory.</li>
                <li><strong>Platform Authentication:</strong> Using secure WhatsApp, SMS, or Email OTP (One-Time Passcodes) to sign you in.</li>
                <li><strong>Community Messaging:</strong> Enabling secure member-to-member conversations without revealing raw contact coordinates.</li>
                <li><strong>Audit & Moderation:</strong> Verifying documents in the admin moderation queue before profiles go live.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                4. Row Level Security & Field Visibility Controls
              </h2>
              <p>
                Your privacy is built directly into our infrastructure. Every table in our database operates under strict Row Level Security (RLS). Furthermore, we support granular field-level privacy toggles:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Hidden:</strong> The field is entirely hidden from search results and profiles.</li>
                <li><strong>Members Only:</strong> Visible only to verified, logged-in members. Unauthenticated public visitors cannot view any member profiles.</li>
                <li><strong>Masked by Default:</strong> Contact coordinates and precise dates of birth are masked inside the database queries. Under no circumstances can raw PII be exfiltrated in bulk search JSON responses.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                5. Data Retention & Deletion Rights
              </h2>
              <p>
                In compliance with international data privacy practices:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Soft Deletion:</strong> Rejected registrations are soft-deleted for dispute handling and dispute resolution.</li>
                <li><strong>Permanent Scrub:</strong> Users have the right to request permanent deletion of their family profile. Once requested and verified, the entire family household and member records are hard-deleted and permanently scrubbed from our systems.</li>
                <li><strong>Right to Export:</strong> Users can download their complete personal data as a structured JSON file via their dashboard settings page.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                6. Governing Jurisdiction & Contact Info
              </h2>
              <p>
                This Privacy Policy and our data practices are governed by the laws of the Republic of Singapore. For any questions, data deletion requests, or concerns, please contact our Data Protection Officer at:
              </p>
              <div className="mt-3 p-4 bg-canvas-warm rounded-2xl border border-brand-accent/30 font-semibold text-brand-primary">
                📧 contact@agrasenfoundation.org <br />
                🌐 www.agrasenvaishakhara.com <br />
                🏛️ Maharaja Agrasen Foundation Limited Singapore
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}