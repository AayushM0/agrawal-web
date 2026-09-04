import React from "react";

export default function ResponsibleDisclosurePage() {
  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3 inline-block">
            Security Coordination
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary mb-6">
            Responsible Disclosure Policy
          </h1>
          <p className="text-xs text-body-muted mb-8 pb-4 border-b border-brand-accent/20">
            Last Updated: August 30, 2026 | Maharaja Agrasen Foundation Limited Singapore
          </p>

          <div className="space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
            <p>
              Maharaja Agrasen Foundation Limited Singapore believes in coordinating with security researchers to secure our directory platform. If you discover a security vulnerability in our codebase or infrastructure, we ask you to report it to us responsibly.
            </p>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                1. Reporting Vulnerabilities
              </h2>
              <p>
                Please email vulnerability findings to:
              </p>
              <div className="mt-2 p-4 bg-canvas-warm rounded-2xl border border-brand-accent/30 font-mono font-semibold text-brand-primary">
                security@maharajaagrasenfoundation.com
              </div>
              <p className="mt-2">
                Please include a detailed description of the issue, steps to reproduce, and any relevant screenshot or proof-of-concept script. Please do not disclose the vulnerability publicly until we have patched it.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                2. Guidelines for Researchers
              </h2>
              <p className="mb-2">
                To ensure a safe disclosure process, we ask that you adhere to the following rules:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Do not access, download, or modify data belonging to other community members.</li>
                <li>Do not execute denial of service (DoS/DDoS) attacks or run high-frequency automated vulnerability scanners that impact system performance.</li>
                <li>Do not use social engineering, phishing, or physical security attacks against our staff, moderators, or community members.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                3. Our Commitment
              </h2>
              <p>
                If you follow these guidelines, we commit to:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Acknowledging receipt of your report within 48 hours.</li>
                <li>Providing a timeline for patching the reported vulnerability.</li>
                <li>Not initiating legal action against you for research conducted in compliance with this policy.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
