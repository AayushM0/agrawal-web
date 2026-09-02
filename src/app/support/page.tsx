'use client';

import React, { useState } from "react";
import Link from "next/link";

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("Registration Moderation");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !details.trim()) {
      setErrorMessage("Please fill out all mandatory fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Simulate calling a server support endpoint or logging service
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setIsSubmitting(false);
      setIsSuccess(true);
    } catch {
      setIsSubmitting(false);
      setErrorMessage("Failed to submit support request. Please try again later.");
    }
  };

  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Secretariat Contact Column (1/3) */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-5 sm:p-6 shadow-warm">
            <h2 className="text-sm font-extrabold text-brand-primary uppercase tracking-wider mb-4 border-b-2 border-brand-accent pb-1 inline-block">
              Foundation Hotline
            </h2>
            <div className="space-y-4 text-xs">
              <p className="text-body-text">
                For urgent inquiries regarding family verification status or profile claims, please reach our Secretariat.
              </p>
              <div>
                <span className="text-[10px] text-body-muted block font-bold">Helpline (Direct Dial)</span>
                <a
                  href="tel:+919876543210"
                  className="text-sm font-extrabold text-brand-primary hover:underline flex items-center gap-1.5 mt-1"
                >
                  📞 +91 98765 43210
                </a>
              </div>
              <div>
                <span className="text-[10px] text-body-muted block font-bold">Email Communications</span>
                <a
                  href="mailto:contact@agrasenfoundation.org"
                  className="text-xs font-bold text-brand-primary hover:underline block mt-1"
                >
                  📧 contact@agrasenfoundation.org
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white border border-brand-accent/30 rounded-2xl p-5 shadow-warm text-xs text-body-muted leading-relaxed">
            📢 <strong>Moderation Queue Note:</strong> Family submissions are verified by volunteers within 48 to 72 hours. Please check your dashboard status before filing a ticket.
          </div>
        </div>

        {/* Support Request Form Column (2/3) */}
        <div className="md:col-span-2">
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-6 sm:p-8 shadow-warm">
            {isSuccess ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold mx-auto mb-4 border border-emerald-300">
                  ✓
                </div>
                <h2 className="text-lg font-black text-brand-primary mb-2">
                  Support Ticket Received!
                </h2>
                <p className="text-xs text-body-muted max-w-sm mx-auto mb-6 leading-relaxed">
                  Thank you for reaching out. A Foundation administrator has been assigned to your query. We will contact you via email at <strong>{email}</strong> within 1-2 business days.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setDetails("");
                  }}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-sm"
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
                  Support Desk • सहायता
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-brand-primary mb-2">
                  Get in Touch
                </h1>
                <p className="text-xs text-body-muted mb-6">
                  Have questions about gotras, claim invites, or verification? Send us a ticket.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1.5">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Shri Ramesh Agarwal"
                        className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-body-heading mb-1.5">
                        Your Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ramesh@example.com"
                        className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1.5">
                      Issue Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                      <option value="Registration Moderation">Family Registration / Moderation Status</option>
                      <option value="Profile Claiming">Invite &amp; Claim Profile Help</option>
                      <option value="Gotra Question">Gotra or Native Place Corrections</option>
                      <option value="Privacy Concern">Privacy, Visibility or DPDP Data Inquiry</option>
                      <option value="Technical Glitch">Website Glitches &amp; Errors</option>
                      <option value="Other Issue">Other general inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-body-heading mb-1.5">
                      Details / Message *
                    </label>
                    <textarea
                      rows={4}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Please provide details of your inquiry, including any Serial ID number or contact numbers involved..."
                      className="w-full px-3 py-2.5 rounded-xl border border-brand-accent/40 text-xs text-body-heading focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      required
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta"
                  >
                    {isSubmitting ? "Sending Request..." : "Submit Inquiry to Secretariat →"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
