import React from "react";

export default function SecurityPolicyPage() {
  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3 inline-block">
            Data Hardening & Infrastructure
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary mb-6">
            Security Policy
          </h1>
          <p className="text-xs text-body-muted mb-8 pb-4 border-b border-brand-accent/20">
            Last Updated: August 30, 2026 | Maharaja Agrasen Foundation Limited Singapore
          </p>

          <div className="space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
            <p>
              At Maharaja Agrasen Foundation Limited Singapore, security is integrated into every layer of our global community directory. We recognize the trust you place in us when providing family details and verification documents, and we implement strict technical measures to protect your personal data.
            </p>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                1. Database Isolation & Supabase RLS
              </h2>
              <p>
                Our PostgreSQL database enforces strict **Row Level Security (RLS)** policies on all tables. This means that anonymous web requests from the browser cannot query, read, or modify database tables. All standard data queries are processed exclusively through secure, server-side Next.js Server Actions connecting as a database owner.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                2. Cryptographic Secret Management
              </h2>
              <p>
                All sensitive credentials (including Supabase API credentials, database URIs, Pusher socket credentials, and authentication secrets) are stored in secure environment variables within the hosting infrastructure (Vercel Project Dashboard). The codebase contains **zero hardcoded fallback secrets**. If an environment variable is misconfigured or missing, the server actions will fail immediately rather than resorting to an insecure default.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                3. OTP Authentication & Anti-Brute-Force Guarding
              </h2>
              <p>
                We do not store passwords. Users authenticate securely via WhatsApp, SMS, or Email One-Time Passcodes (OTP). Our OTP system utilizes a rate-limiting database table (`otp_rate_limits`) that tracks requests and verification attempts per recipient and IP address. This mitigates brute-force attacks and prevents abuse.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                4. Field Masking & Reveal Audits
              </h2>
              <p>
                To prevent profile scanning, contact details and dates of birth are dynamically masked on the server. Unauthenticated users cannot view member details. In addition, reveal operations for verified members are audited and rate-limited.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                5. Secure Communications & CSP
              </h2>
              <p>
                All data transmission is encrypted via HTTPS with TLS 1.3. We implement strict HTTP response security headers in `next.config.ts`, including a detailed **Content Security Policy (CSP)** that restricts script execution, style loading, and media origins to prevent cross-site scripting (XSS) and code injection.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
