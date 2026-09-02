import React from "react";

export default function TermsPage() {
  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3 inline-block">
            User Agreement & Service Terms
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary mb-6">
            Terms of Service
          </h1>
          <p className="text-xs text-body-muted mb-8 pb-4 border-b border-brand-accent/20">
            Last Updated: August 30, 2026 | Maharaja Agrasen Foundation Limited Singapore
          </p>

          <div className="space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                1. Acceptance of Terms
              </h2>
              <p>
                By registering a family household or accessing the Maharaja Agrasen Foundation Global Directory, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use the directory services or submit family profiles.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                2. Community Charter & Eligibility
              </h2>
              <p>
                This platform is dedicated to the social connection, heritage preservation, and mutual coordination of the global Agarwal community. Access is free and is restricted to households belonging to one of the 18 established Gotras founded by Maharaja Agrasen. All entries are subject to review and verification by community moderators.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                3. Registration and Account Security
              </h2>
              <p>
                You must provide accurate, complete, and current information when registering a household or claiming a member profile. Since login credentials are verify-by-OTP (WhatsApp/Email), you are responsible for maintaining the confidentiality of your mobile numbers and emails, and you agree to notify us immediately of any unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                4. Prohibited Activities
              </h2>
              <p className="mb-2">
                You agree not to use the global directory to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Engage in web scraping, data extraction, harvesting, or bulk indexing of member contact information.</li>
                <li>Send unsolicited marketing, commercial advertisements, spam, or promotional material to directory members.</li>
                <li>Submit fraudulent, deceptive, or duplicate family profiles.</li>
                <li>Transmit abusive, defamatory, threatening, or offensive messages in member-to-member chat channels.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                5. Moderation & Content Removal
              </h2>
              <p>
                The Foundation reserves the right to reject, suspend, or permanently delete household submissions that violate these terms or the community charter. Approved households can also be suspended if reports of spamming or offensive behavior are verified. Rejection reasons will be logged, and users can reach support to dispute decisions.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                6. Limitation of Liability
              </h2>
              <p>
                The directory platform is provided on an "as-is" and "as-available" basis. Maharaja Agrasen Foundation Limited Singapore does not guarantee the absolute accuracy of member-provided profiles. To the maximum extent permitted by law, the Foundation shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                7. Governing Law and Jurisdiction
              </h2>
              <p>
                These Terms of Service and any disputes arising out of or related to this directory platform shall be governed by and construed in accordance with the laws of the Republic of Singapore. Any legal action or proceeding shall be brought exclusively in the courts of Singapore.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}