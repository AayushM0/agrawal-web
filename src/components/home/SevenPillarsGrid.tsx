import React from "react";
import Link from "next/link";

const pillars = [
  {
    number: "1",
    title: "Family Directory",
    hindi: "वैश्विक परिवार निर्देशिका",
    status: "LIVE",
    isLive: true,
    desc: "Connecting Agarwal families across India, Singapore, UAE, USA, Canada, UK, Australia, and worldwide. Search by location, native place, Gotra, and profession.",
    actionText: "Register Family Free →",
    actionHref: "/signup",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    )
  },
  {
    number: "2",
    title: "Global Business Network",
    hindi: "वैश्विक व्यापार नेटवर्क",
    status: "LIVE",
    isLive: true,
    desc: "Connecting entrepreneurs, industrialists, traders, and investors globally. Facilitating international sourcing, referrals, and trade partnerships.",
    actionText: "Explore Business Directory →",
    actionHref: "/businesses",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    )
  },
  {
    number: "3",
    title: "Matrimonial Network",
    hindi: "वैवाहिक संबंध नेटवर्क",
    status: "LIVE",
    isLive: true,
    desc: "A dedicated and secure matrimonial portal with verified community profiles, strict privacy controls, 18 Gotras filtering, and trusted family references.",
    actionText: "Search Matrimonial Profiles →",
    actionHref: "/matrimony",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    )
  },
  {
    number: "4",
    title: "Jobs & Careers",
    hindi: "रोजगार व करियर",
    status: "LIVE",
    isLive: true,
    desc: "Connecting talented Agarwal youth with corporate internships, executive positions, mentorship, and multinational career pathways.",
    actionText: "Explore Careers & Jobs →",
    actionHref: "/careers",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
    )
  },
  {
    number: "5",
    title: "Education & Mentorship",
    hindi: "शिक्षा एवं मार्गदर्शन",
    status: "COMING SOON",
    isLive: false,
    desc: "Pairing students with seasoned corporate leaders, scholarships, startup guidance, and international university pathways.",
    actionText: "Learn More",
    actionHref: "/about",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
      </svg>
    )
  },
  {
    number: "6",
    title: "Community Help Desk",
    hindi: "हेल्प डेस्क व सहायता",
    status: "COMING SOON",
    isLive: false,
    desc: "Wherever You Go, Your Community Is With You. Relocation assistance, local chapter support, and emergency community aid.",
    actionText: "Learn More",
    actionHref: "/about",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    )
  },
  {
    number: "7",
    title: "Social Impact & Seva",
    hindi: "समाज सेवा एवं उत्थान",
    status: "COMING SOON",
    isLive: false,
    desc: "Healthcare assistance, charitable trusts, blood donation camps, and philanthropic community upliftment.",
    actionText: "Learn More",
    actionHref: "/about",
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
      </svg>
    )
  }
];

export default function SevenPillarsGrid() {
  return (
    <section id="pillars" className="py-12 sm:py-16 bg-white border-b border-brand-accent/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full va-badge-gold mb-2">
            Strategic Roadmap
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-brand-primary">
            The 7 Pillars of the Platform
          </h2>
          <p className="text-xs sm:text-sm text-body-muted mt-1">
            A staged ecosystem designed to unite, empower, and support Agarwal families globally.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {pillars.map((p) => (
            <div
              key={p.number}
              className="flex flex-col bg-[#fffdfa] border border-brand-accent/30 rounded-2xl p-5 sm:p-6 shadow-warm hover:shadow-warmLg hover:border-brand-accent transition-all relative"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#fff7dd] to-[#fae8b2] border border-brand-accent/40 flex items-center justify-center mb-3 sm:mb-4">
                {p.icon}
              </div>

              <div className="flex items-start justify-between gap-2 mb-1 min-h-[40px]">
                <h3 className="text-sm sm:text-base font-extrabold text-brand-primary leading-snug">
                  {p.number}. {p.title}
                </h3>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    p.isLive ? "va-badge-live" : "va-badge-pending"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              <p className="text-xs font-bold text-brand-gold font-devanagari mb-2.5">
                {p.hindi}
              </p>

              <p className="text-xs text-body-text/85 leading-relaxed mb-5 flex-1">
                {p.desc}
              </p>

              <Link
                href={p.actionHref}
                className={`w-full h-10 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center text-center ${
                  p.isLive
                    ? "va-btn-maroon text-white"
                    : "bg-white text-brand-primary border border-brand-primary/40 hover:bg-canvas-warm hover:border-brand-primary"
                }`}
              >
                {p.actionText}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}