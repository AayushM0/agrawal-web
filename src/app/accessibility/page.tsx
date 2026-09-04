import React from "react";

export default function AccessibilityPage() {
  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3 inline-block">
            Inclusion & Usability
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary mb-6">
            Accessibility Statement
          </h1>
          <p className="text-xs text-body-muted mb-8 pb-4 border-b border-brand-accent/20">
            Last Updated: August 30, 2026 | Maharaja Agrasen Foundation Limited Singapore
          </p>

          <div className="space-y-6 text-xs sm:text-sm text-body-text leading-relaxed">
            <p>
              Maharaja Agrasen Foundation Limited Singapore is dedicated to providing a digital environment that is accessible to all individuals, including those with visual, auditory, motor, or cognitive disabilities. We continuously strive to improve the user experience and apply the relevant accessibility standards to make our global community directory as inclusive as possible.
            </p>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                1. Accessibility Standards & Targets
              </h2>
              <p>
                We aim for our website to be compliant with the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA standards. Key accessibility features implemented in our frontend design include:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Semantic Page Structure:</strong> Proper use of heading levels (<code>&lt;h1&gt;</code> through <code>&lt;h6&gt;</code>), lists, landmarks, and structural elements (<code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;footer&gt;</code>).</li>
                <li><strong>Keyboard Navigation:</strong> All interactive elements, buttons, and forms are fully focusable and operable via standard keyboard controls.</li>
                <li><strong>Contrast Ratios:</strong> Standard text colors and branding accents have been tuned to meet the minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text.</li>
                <li><strong>Screen-Reader Friendly Controls:</strong> Accessible labels and form field structures.</li>
                <li><strong>Visible Focus Outlines:</strong> Clear visual indicator outlines when keyboard-focused.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                2. Known Limitations & Ongoing Improvements
              </h2>
              <p>
                While we strive for comprehensive compatibility, some parts of our platform may have visual limitations:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>User-Generated Media:</strong> Profile photographs uploaded by community members might lack customizable alternative text descriptions.</li>
                <li><strong>Dynamic PDF Downloads:</strong> The generated family member passes (lanyards) are outputted in PDF format and might not be fully compliant with advanced screen reader tag structures. We are working on optimizing PassPDF binary rendering.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-brand-primary mb-2">
                3. Feedback & Contact Support
              </h2>
              <p>
                If you encounter any accessibility issues while navigating the directory or using the registration wizard, please let us know. We welcome your feedback and will work to address any reported barriers:
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
