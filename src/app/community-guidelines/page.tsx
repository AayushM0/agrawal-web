import React from "react";

export default function CommunityGuidelinesPage() {
  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3 inline-block">
            Member Etiquette Charter
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary mb-6">
            Community Guidelines
          </h1>
          <p className="text-xs text-body-muted mb-8 pb-4 border-b border-brand-accent/20">
            Last Updated: August 30, 2026 | Maharaja Agrasen Foundation Limited Singapore
          </p>

          <div className="space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
            <p>
              Welcome to the Maharaja Agrasen Foundation Global Community. This platform was created to unite, coordinate, and strengthen the global Agarwal family. To ensure a safe, respectful, and productive experience, all members are required to follow these Community Guidelines.
            </p>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                1. Accuracy of Profiles & Lineage
              </h2>
              <p>
                To maintain a trusted directory, all submissions must represent real individuals. Households must provide correct names, Gotras, and ancestral native places. Falsifying records or creating fake entries undermines the community platform and will lead to profile suspension and registration removal.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                2. Respectful Communication
              </h2>
              <p>
                Our directory features direct member-to-member messaging to facilitate social connection and community support. When using messaging:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Always treat other members with politeness, dignity, and respect.</li>
                <li>Harassment, stalking, abusive language, discrimination, and hate speech are strictly prohibited.</li>
                <li>Report inappropriate messages to moderators immediately using the report button in the chat interface.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                3. Privacy & Trust
              </h2>
              <p>
                The contact information shared in the directory is meant for community coordination. You must respect other members' privacy. Do not share contact details, profiles, or conversation screenshots outside the platform without explicit consent.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                4. Zero Spam & Commercial Pitching
              </h2>
              <p>
                This directory is not a public commercial catalog or leads database. You are strictly forbidden from contacting other members to sell products, pitch business ideas, recruit for unauthorized operations, or send bulk promotional broadcasts. Doing so will result in an immediate block and account deletion.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
