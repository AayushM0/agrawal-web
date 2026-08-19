import React from "react";

export default function PrivacyPage() {
  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-black text-brand-primary mb-6">Privacy Policy</h1>
        <div className="bg-white border border-brand-accent/30 rounded-2xl p-8 shadow-warm space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
          <p>
            <strong>1. Scope & Commitment:</strong> We respect your family&apos;s privacy. Registration is completely free and all personal data is protected under strict access controls.
          </p>
          <p>
            <strong>2. Field-Level Visibility:</strong> You have full control over what other verified members see. Contact numbers, exact dates of birth, and photos can each be toggled between <em>Members Only</em> and <em>Hidden</em>.
          </p>
          <p>
            <strong>3. Login-Gated Protection:</strong> Unauthenticated public visitors cannot search or view member profiles. Contact info is never displayed in bulk search results.
          </p>
          <p>
            <strong>4. Data Retention:</strong> Registrations are verified by community moderators before going live. Rejected registrations are soft-deleted for dispute handling.
          </p>
        </div>
      </div>
    </main>
  );
}