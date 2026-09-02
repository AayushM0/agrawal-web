'use client';

import React, { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function HelpPage() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState("All");

  const faqs: FAQItem[] = [
    {
      category: "Registration",
      question: "How do I register my family in the Agarwal Global Directory?",
      answer: "Click 'Register Family Free' on the home page or go to /signup. Complete the 5-step registration wizard by: 1) Verifying your mobile/email via OTP; 2) Entering the Head of Household details, family Gotra, and native ancestral place; 3) Adding optional family members; 4) Uploading photo/government documents; and 5) Reviewing and submitting. Once submitted, your profile enters the moderation queue."
    },
    {
      category: "Registration",
      question: "Why is a profile photo and government ID mandatory for the Head of Household?",
      answer: "To ensure that our community directory remains 100% verified, trusted, and free from duplicate or fraudulent profiles. Government IDs (Aadhaar/PAN/Passport) are hashed securely in the database and checked by moderators. The raw ID is never displayed to other directory members."
    },
    {
      category: "Moderation",
      question: "How long does it take for my registration to go live?",
      answer: "Maharaja Agrasen Foundation volunteers review submissions in the moderation queue. Verification checks are typically resolved within 48 to 72 hours. Once approved, your household is issued an official serial number (e.g. #MAFL-2026-XXXX) and goes live in the search directory."
    },
    {
      category: "Moderation",
      question: "What happens if my registration is rejected?",
      answer: "If a submission contains invalid information, unrecognizable photographs, or incorrect IDs, a moderator will reject the entry and specify a revision reason. You will see this reason when you log in. Rejected entries are soft-deleted for dispute resolution and can be edited and resubmitted."
    },
    {
      category: "Claim Profile",
      question: "What is the 'Invite to Claim' link?",
      answer: "When a Head of Household registers additional family members, those members are initially 'Managed'. The Head can generate a single-click invite token link from the dashboard settings. When the family member opens that link and logs in using their own phone/email OTP, their profile locks (owner_locked = true) so they control their visibility and details, revoking head editing access."
    },
    {
      category: "Privacy",
      question: "Who can see my contact number and birth date?",
      answer: "Unauthenticated visitors cannot search the directory or view member profiles. Verified, logged-in members can see your information depending on the visibility settings you choose: 'Visible to Members' or 'Hidden'. Contact coordinates are masked inside the database queries to prevent bulk data exfiltration."
    },
    {
      category: "Account Settings",
      question: "How do I download my family data or delete my account?",
      answer: "Log in and navigate to the Account Settings page. There, you can click 'Export Family Record (JSON)' to download a file containing all database records for your family in compliance with DPDP. You can also request permanent deletion of your profile. For security, deletion requires verifying a one-time passcode."
    }
  ];

  const categories = ["All", "Registration", "Moderation", "Claim Profile", "Privacy", "Account Settings"];

  const filteredFaqs = filterCat === "All" ? faqs : faqs.filter(f => f.category === filterCat);

  return (
    <main className="py-12 bg-canvas-page min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-2 inline-block">
            Frequently Asked Questions • सामान्य प्रश्न
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary">
            Help Center
          </h1>
          <p className="text-xs sm:text-sm text-body-muted mt-1">
            Find answers to common questions about directory access, family verification, and profile privacy.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setFilterCat(cat);
                setActiveIdx(null);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                filterCat === cat
                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                  : "bg-white text-body-heading border-brand-accent/30 hover:bg-canvas-warm"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl p-4 sm:p-8 shadow-warm divide-y divide-brand-accent/15">
          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-body-muted italic text-center py-6">No FAQs found matching this category.</p>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = activeIdx === idx;
              return (
                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                  <button
                    onClick={() => setActiveIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-4 font-bold text-xs sm:text-sm text-brand-primary hover:text-brand-burgundy transition-colors py-1 focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <span className="text-lg font-black shrink-0 text-brand-gold">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm text-body-text leading-relaxed bg-canvas-warm/30 border border-brand-accent/10 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
