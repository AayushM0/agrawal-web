import React from "react";

export default function CookiePolicyPage() {
  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3 inline-block">
            Cookies & Browser Storage
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary mb-6">
            Cookie Policy
          </h1>
          <p className="text-xs text-body-muted mb-8 pb-4 border-b border-brand-accent/20">
            Last Updated: August 30, 2026 | Maharaja Agrasen Foundation Limited Singapore
          </p>

          <div className="space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
            <p>
              This Cookie Policy explains how Maharaja Agrasen Foundation Limited Singapore uses cookies and similar technologies on this website. We believe in complete transparency and maximum privacy for our community members.
            </p>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                1. What are Cookies?
              </h2>
              <p>
                Cookies are small text files stored in your browser when you visit websites. They are commonly used to keep you signed in, remember form inputs, and track analytics.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                2. No Marketing or Analytics Trackers
              </h2>
              <p>
                We **do not** use third-party marketing pixels, advertising trackers, or profiling cookies (such as Google Analytics, Facebook Pixel, or TikTok trackers). Your usage of this community directory is kept completely private and is never shared with third-party advertising companies.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                3. Essential Functional Cookies We Use
              </h2>
              <p className="mb-2">
                We only use essential functional cookies that are strictly necessary for the operation of our platform. These cookies are set automatically and cannot be opted out of, as they are crucial for securing your account session:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-body-text border-collapse border border-brand-accent/20 rounded-xl overflow-hidden mt-3">
                  <thead className="bg-canvas-warm/50 font-bold text-brand-primary border-b border-brand-accent/20 text-[11px] sm:text-xs">
                    <tr>
                      <th className="p-3 border-r border-brand-accent/20">Cookie Name</th>
                      <th className="p-3 border-r border-brand-accent/20">Purpose</th>
                      <th className="p-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-accent/10">
                    <tr>
                      <td className="p-3 font-mono border-r border-brand-accent/20">auth_session</td>
                      <td className="p-3 border-r border-brand-accent/20">Stores a cryptographically signed JWT token to keep you securely signed in to your household dashboard.</td>
                      <td className="p-3">30 Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono border-r border-brand-accent/20">otp_challenge</td>
                      <td className="p-3 border-r border-brand-accent/20">Manages the state and security check of one-time passcodes (OTP) during login or registration workflows.</td>
                      <td className="p-3">Session-based (deleted upon verification)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                4. Managing Cookies
              </h2>
              <p>
                You can block or delete cookies through your web browser settings. However, blocking essential functional cookies like `auth_session` will prevent you from signing in to the dashboard, claiming member profiles, or accessing protected directory routes.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
