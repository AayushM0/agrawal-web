'use client';

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface FounderContentProps {
  photoSrc: string;
}

interface Milestone {
  id: string;
  date: string;
  badge: string;
  title: string;
  summary: string;
  venue: string;
  signatories?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  accent: string;
}

const MILESTONES: Milestone[] = [
  {
    id: "global-icon-2026",
    date: "14 November 2026",
    badge: "🏆 National Award",
    title: "Maharaja Agrasen Global Icon Award 2026",
    summary:
      "Conferred at the Agra Alankaran Samaroh in New Delhi for exceptional dedication and transformative leadership in uniting the global Agarwal community through digital innovation.",
    venue: "Dr. Ambedkar International Centre, Janpath, New Delhi",
    signatories: "National Chairman Pradeep Mittal, Akhil Bhartiya Agrawal Sangathan",
    accent: "from-amber-500/20 to-amber-600/10 border-amber-400",
  },
  {
    id: "dubai-ministerial-2026",
    date: "1 November 2026",
    badge: "📰 Independent News",
    title: "Dainik Jagran: Dubai Ministerial Dialogue Session",
    summary:
      "Recognized in Dainik Jagran coverage as Founder & Chairman of Maharaja Agrasen Foundation Singapore during high-level community dialogues with Haryana Cabinet Minister Vipul Goel.",
    venue: "Maharaja Agrasen Jayanti Utsav, Dubai, UAE",
    sourceUrl:
      "https://www.jagran.com/haryana/panchkula-vipul-goel-attends-maharaja-agrasen-utsav-in-dubai-40423887.html",
    sourceLabel: "Read Dainik Jagran Coverage ↗",
    accent: "from-blue-500/20 to-blue-600/10 border-blue-400",
  },
  {
    id: "panchkula-jayanti-2026",
    date: "11 October 2026",
    badge: "📜 Guest of Honour",
    title: "Maharaja Agrasen Jayanti, Panchkula",
    summary:
      "Invited as Distinguished Guest of Honour for the annual community celebration organized by Agrmath Trust, engaging with regional elders and social workers.",
    venue: "Agarwal Bhawan, Sector 16, Panchkula, Haryana",
    signatories: "Suresh Garg, Rakesh Singla, and Vipin Agarwal (Agrmath Trust)",
    accent: "from-brand-primary/20 to-brand-primary/10 border-brand-primary/40",
  },
  {
    id: "singapore-incorporation-2025",
    date: "20 November 2025",
    badge: "🏛️ Institutional Foundation",
    title: "Incorporation of Maharaja Agrasen Foundation Limited",
    summary:
      "Official establishment of the Singapore non-profit Public Company Limited by Guarantee under ACRA (UEN: 202551557G) to build a verified global ecosystem for Agarwals.",
    venue: "AZ @ Paya Lebar, Singapore 409015",
    signatories: "Accounting and Corporate Regulatory Authority (ACRA), Singapore",
    accent: "from-emerald-500/20 to-emerald-600/10 border-emerald-400",
  },
];

export default function FounderContent({ photoSrc }: FounderContentProps) {
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [copiedBio, setCopiedBio] = useState(false);
  const [brickCount, setBrickCount] = useState(1);

  // 3D Card Tilt State for Portrait
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -10; // max 10 deg tilt
    const rY = ((x - centerX) / centerX) * 10;
    setRotateX(rX);
    setRotateY(rY);
    setGlarePosition({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedBio(true);
      setTimeout(() => setCopiedBio(false), 2200);
    }
  };

  const WHATSAPP_LINK =
    "https://wa.me/6592774444?text=" +
    encodeURIComponent(
      "Jai Shree Agrasen Ji 🙏\nRespected Shri Sohan Lal Jindal Ji,\n\nI am reaching out through your official Founder & Chairman profile on maharajaagrasenfoundation.com.\n\n• Name:\n• Location:\n• Message / Purpose:\n\nThank you!"
    );

  return (
    <div className="space-y-20 py-8 sm:py-16 selection:bg-brand-accent selection:text-white">
      {/* 1. HERO POSTER: Typographic Elegance & 3D Interactive Portrait */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white via-[#fffaf0] to-[#fff3df] border border-brand-accent/30 shadow-warmLg p-6 sm:p-12 lg:p-16">
        {/* Ambient Radial Auroras */}
        <div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-amber-400/15 via-brand-primary/10 to-transparent blur-3xl pointer-events-none animate-pulse"
          style={{ animationDuration: "8s" }}
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-brand-accent/20 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Global Coordinates Micro-Badge */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-8 mb-8 border-b border-brand-accent/20 text-xs font-mono">
          <div className="flex items-center gap-2 text-brand-dark">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold">GLOBAL HEADQUARTERS: SINGAPORE</span>
            <span className="text-body-muted hidden sm:inline">(1°17′N 103°51′E)</span>
          </div>
          <div className="flex items-center gap-2 text-body-muted">
            <span>GOVT UEN:</span>
            <span className="font-bold text-brand-primary bg-amber-100 px-2 py-0.5 rounded border border-amber-300/40">
              202551557G
            </span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: 3D Interactive Portrait */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl cursor-pointer transition-transform duration-200 ease-out preserve-3d"
              style={{
                transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`,
                boxShadow: "0 25px 50px -12px rgba(217, 83, 30, 0.25), 0 0 0 1px rgba(230, 149, 0, 0.3)",
              }}
            >
              {/* Outer Heritage Gold Rim */}
              <div className="relative w-full h-full rounded-3xl p-3 bg-gradient-to-tr from-brand-primary via-amber-400 to-amber-200 overflow-hidden">
                {/* Glare effect */}
                <div
                  className="absolute inset-0 pointer-events-none z-20 rounded-3xl mix-blend-overlay opacity-60 transition-opacity"
                  style={{
                    background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
                  }}
                  aria-hidden="true"
                />

                <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-white">
                  <Image
                    src={photoSrc}
                    alt="Sohan Lal Jindal (सोहनलाल जिंदल), Founder and Chairman of Maharaja Agrasen Foundation Limited, Singapore"
                    fill
                    priority
                    sizes="(max-width: 640px) 288px, (max-width: 768px) 320px, 384px"
                    className="object-cover object-top filter contrast-[1.02] hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

              {/* Floating Foundation Seal Pill */}
              <div className="absolute -bottom-4 -right-2 sm:-bottom-5 sm:-right-4 bg-brand-heading text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-300/80 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-base">
                  ★
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-amber-300">
                    Chairman &amp; Founder
                  </div>
                  <div className="text-xs font-black tracking-tight text-white">
                    Maharaja Agrasen Foundation
                  </div>
                </div>
              </div>
            </div>

            {/* Optical Caption */}
            <p className="mt-7 text-center text-xs text-body-muted max-w-xs leading-relaxed italic">
              Sohan Lal Jindal &ldquo;Singapore Wale&rdquo;, Founder and Chairman, Maharaja Agrasen Foundation Limited, Singapore.
            </p>

            {/* Quick Social Verification Badges */}
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61591383791239"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-blue-200 text-blue-800 text-xs font-semibold shadow-xs hover:shadow-sm hover:scale-105 transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook Profile (4K)</span>
              </a>

              <a
                href="https://www.instagram.com/sohanlal_jindal_singapore_wale/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-rose-200 text-rose-800 text-xs font-semibold shadow-xs hover:shadow-sm hover:scale-105 transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Instagram Profile</span>
              </a>
            </div>
          </div>

          {/* Right Column: Poster Hierarchy & Narrative Lead */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Title Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-brand-primary text-white shadow-xs">
                Founder &amp; Chairman
              </span>
              <span className="px-3.5 py-1 rounded-full text-xs font-bold font-devanagari bg-amber-200/80 text-brand-heading border border-amber-300">
                संस्थापक एवं अध्यक्ष
              </span>
              <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white text-body-text border border-brand-accent/30 shadow-xs">
                Singapore • Indian Citizen
              </span>
            </div>

            {/* Poster Headline */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brand-heading tracking-tight leading-[1.08]">
                Sohan Lal Jindal
              </h1>
              <p className="mt-2 text-xl sm:text-2xl font-black text-brand-primary font-devanagari">
                सोहनलाल जिंदल &ldquo;Singapore Wale&rdquo;
              </p>
              <p className="text-sm sm:text-base font-semibold text-body-muted mt-1">
                Founder and Chairman, Maharaja Agrasen Foundation Limited, Singapore
              </p>
            </div>

            {/* Lead Quote Hook */}
            <div className="p-5 rounded-2xl bg-white/90 border-l-4 border-brand-accent shadow-warm">
              <p className="text-base sm:text-lg text-body-text font-medium leading-relaxed italic">
                &ldquo;Community leader and social worker serving the global Agarwal community from Singapore.&rdquo;
              </p>
            </div>

            {/* Name Variants Cloud for Search & Canonical Authority */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-body-muted">
                Official Name Variations &amp; Regional Aliases
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-lg bg-canvas-warm text-brand-dark border border-amber-200 font-medium">
                  Sohan Lal Jindal
                </span>
                <span className="px-3 py-1 rounded-lg bg-canvas-warm text-brand-dark border border-amber-200 font-medium">
                  Sohanlal Jindal
                </span>
                <span className="px-3 py-1 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/30 font-bold">
                  Sohan Lal Jindal &ldquo;Singapore Wale&rdquo;
                </span>
                <span className="px-3 py-1 rounded-lg bg-canvas-warm text-brand-dark border border-amber-200 font-medium">
                  Sohanlal Jindal &ldquo;Singapur Wale&rdquo;
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-100 text-brand-dark border border-amber-300 font-devanagari font-bold">
                  सोहनलाल जिंदल
                </span>
              </div>
            </div>

            {/* High-Impact CTA Row */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-7 rounded-full text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-md inline-flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>WhatsApp: +65 9277 4444</span>
              </a>

              <a
                href="tel:+6592774444"
                className="h-12 px-6 rounded-full text-xs sm:text-sm font-bold text-brand-dark bg-white hover:bg-canvas-warm border border-brand-accent/40 shadow-xs inline-flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 text-brand-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Dial Secretariat</span>
              </a>

              <a
                href="mailto:contact@maharajaagrasenfoundation.com"
                className="h-12 px-6 rounded-full text-xs sm:text-sm font-bold text-body-text bg-white hover:bg-canvas-warm border border-brand-accent/40 shadow-xs inline-flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 text-brand-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email Secretariat</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SIGNATURE INTERACTIVE MOMENT: The Global Bridge (Singapore ↔ India ↔ Diaspora) */}
      <section className="bg-gradient-to-b from-[#291811] via-[#3a1d13] to-[#291811] text-white rounded-[32px] p-8 sm:p-12 lg:p-14 shadow-2xl relative overflow-hidden border border-amber-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="inline-block text-xs font-mono font-bold uppercase tracking-widest text-amber-300 bg-amber-400/10 px-3.5 py-1 rounded-full border border-amber-300/30">
              The Singapore Bridge • वैश्विक संगम
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-amber-100">
              Connecting Agrasen Heritage with Global Governance
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/80 max-w-2xl mx-auto leading-relaxed">
              How Shri Sohan Lal Jindal anchors the global Agarwal diaspora through Singapore: combining centuries of community trust with world-class institutional compliance.
            </p>
          </div>

          {/* Interactive Diaspora Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* Node 1: Singapore */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative hover:border-amber-400/50 transition-all group">
              <div className="text-2xl mb-2">🇸🇬</div>
              <div className="text-xs font-mono font-bold text-amber-300 uppercase">Global Headquarters</div>
              <h3 className="text-lg font-black text-white mt-1">Singapore</h3>
              <p className="text-xs text-white/75 mt-2 leading-relaxed">
                Public Company Limited by Guarantee (UEN: 202551557G). Ensuring legal rigor, data privacy, and international nonprofit governance.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-mono text-amber-300/80">
                Lat: 1.3521° N, Lon: 103.8198° E
              </div>
            </div>

            {/* Node 2: India / Agroha */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative hover:border-amber-400/50 transition-all group">
              <div className="text-2xl mb-2">🇮🇳</div>
              <div className="text-xs font-mono font-bold text-amber-300 uppercase">Cultural Roots</div>
              <h3 className="text-lg font-black text-white mt-1">Agroha &amp; India</h3>
              <p className="text-xs text-white/75 mt-2 leading-relaxed">
                Reconnecting with all 18 Gotras, village origins, and regional Agarwal associations across New Delhi, Haryana, Rajasthan, and nationwide.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-mono text-amber-300/80">
                18 Gotras • Vedic Heritage
              </div>
            </div>

            {/* Node 3: Global Diaspora */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative hover:border-amber-400/50 transition-all group">
              <div className="text-2xl mb-2">🌐</div>
              <div className="text-xs font-mono font-bold text-amber-300 uppercase">Diaspora Reach</div>
              <h3 className="text-lg font-black text-white mt-1">Dubai, UK, US, Global</h3>
              <p className="text-xs text-white/75 mt-2 leading-relaxed">
                High-level diaspora dialogues (such as the Nov 2026 Dubai Ministerial sessions) to unite families, enterprises, and matrimonial alliances worldwide.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-mono text-amber-300/80">
                United • Borderless • Free
              </div>
            </div>
          </div>

          {/* Interactive "One Rupee, One Brick" Philosophy Simulator */}
          <div className="bg-white/10 rounded-2xl p-6 border border-amber-300/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-left">
              <div className="text-xs uppercase font-mono font-bold text-amber-300">
                Agrasen Philosophy Digitalized
              </div>
              <div className="text-base font-bold text-white">
                The &ldquo;One Rupee, One Brick&rdquo; (एक रुपया, एक ईंट) Covenant
              </div>
              <p className="text-xs text-white/80 max-w-xl leading-relaxed">
                In ancient Agroha, whenever a newcomer arrived, each citizen gifted them one coin and one brick. In the digital era, Shri Sohan Lal Jindal brings this mutual aid into a 100% free community platform with zero commercial ads.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setBrickCount((prev) => prev + 1)}
                className="px-4 py-2 rounded-lg bg-amber-400 text-brand-dark font-black text-xs hover:bg-amber-300 transition-all"
              >
                + Add A Brick
              </button>
              <div className="text-left font-mono">
                <div className="text-xs text-amber-300">Foundation Solidarity</div>
                <div className="text-sm font-bold text-white">{brickCount.toLocaleString()} Families United</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BILINGUAL EDITORIAL DOSSIER: English & Hindi Tabs */}
      <section className="bg-white rounded-[32px] border border-brand-accent/30 p-6 sm:p-12 shadow-warm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-accent/20">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Authoritative Narrative</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-brand-heading mt-1">
              Biographical Profile &amp; Mission
            </h2>
          </div>

          {/* Language Switcher Pill */}
          <div className="inline-flex p-1 bg-canvas-warm rounded-full border border-brand-accent/30 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                language === "en"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-body-muted hover:text-brand-heading"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage("hi")}
              className={`px-5 py-2 rounded-full text-xs font-bold font-devanagari transition-all ${
                language === "hi"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-body-muted hover:text-brand-heading"
              }`}
            >
              हिंदी (देवनागरी)
            </button>
          </div>
        </div>

        {/* Narrative Flow */}
        <div className="mt-8 max-w-4xl mx-auto">
          {language === "en" ? (
            <div className="space-y-6 text-base sm:text-lg text-body-text leading-relaxed font-sans">
              <p>
                <strong>Sohan Lal Jindal</strong>, known in the community as <strong>Sohan Lal Jindal &ldquo;Singapore Wale&rdquo;</strong> (सोहनलाल जिंदल), is the Founder and Chairman of <strong>Maharaja Agrasen Foundation Limited, Singapore</strong>.
              </p>
              <p>
                Based in Singapore, he leads the Foundation&apos;s work of connecting Agarwal families worldwide on one trusted platform: a global family directory, a business network, a matrimonial network, and community support initiatives, built on the principles of Maharaja Agrasen: <strong>Dharma, Seva, Sanskaar, Education, and Community Upliftment</strong>.
              </p>
              <p>
                In November 2026, Akhil Bhartiya Agrawal Sangathan honoured him with the <strong>Maharaja Agrasen Global Icon Award 2026</strong> in New Delhi for his contribution to social service. He can be contacted through the Foundation Secretariat on <strong>+65 9277 4444</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-base sm:text-lg text-body-text leading-relaxed font-devanagari">
              <p>
                <strong>सोहनलाल जिंदल</strong>, जिन्हें समाज में <strong>सोहनलाल जिंदल &apos;सिंगापुर वाले&apos;</strong> के नाम से जाना जाता है, <strong>महाराजा अग्रसेन फाउंडेशन लिमिटेड, सिंगापुर</strong> के संस्थापक एवं अध्यक्ष हैं।
              </p>
              <p>
                सिंगापुर में रहते हुए वे फाउंडेशन के माध्यम से विश्वभर के अग्रवाल परिवारों को एक विश्वसनीय मंच पर जोड़ने का कार्य कर रहे हैं, जिसमें <strong>वैश्विक परिवार निर्देशिका, व्यापार नेटवर्क, वैवाहिक नेटवर्क और समाज सेवा की पहल</strong> शामिल हैं। यह संपूर्ण मंच महाराजा अग्रसेन जी के सिद्धांतों: <strong>धर्म, सेवा, संस्कार, शिक्षा और समाज उत्थान</strong> पर आधारित है।
              </p>
              <p>
                नवंबर 2026 में अखिल भारतीय अग्रवाल संगठन ने नई दिल्ली में उन्हें समाज सेवा में उल्लेखनीय योगदान हेतु <strong>महाराजा अग्रसेन ग्लोबल आइकन अवार्ड 2026</strong> से सम्मानित किया। उनसे फाउंडेशन सचिवालय के माध्यम से <strong>+65 9277 4444</strong> पर संपर्क किया जा सकता है।
              </p>
            </div>
          )}

          {/* Quick-Citation Utility Card */}
          <div className="mt-8 p-5 rounded-2xl bg-canvas-warm/80 border border-brand-accent/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-body-text font-medium leading-relaxed">
              <strong className="text-brand-primary">Short Descriptor for Citations:</strong><br />
              &ldquo;Sohan Lal Jindal &lsquo;Singapore Wale&rsquo;, Founder and Chairman, Maharaja Agrasen Foundation Limited, Singapore. Contact: +65 9277 4444.&rdquo;
            </div>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  'Sohan Lal Jindal "Singapore Wale", Founder and Chairman, Maharaja Agrasen Foundation Limited, Singapore. Contact: +65 9277 4444.'
                )
              }
              className="shrink-0 px-4 py-2 rounded-xl bg-white border border-brand-accent/40 text-xs font-bold text-brand-dark hover:bg-canvas-page transition shadow-xs"
            >
              {copiedBio ? "✓ Copied to Clipboard" : "Copy Reference Card"}
            </button>
          </div>
        </div>
      </section>

      {/* 4. VERIFIED PUBLIC SERVICE CHRONOLOGY & INSPECTION */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Verified Milestones</span>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-heading mt-1">
              Public Service &amp; Recognition
            </h2>
            <p className="text-xs sm:text-sm text-body-muted mt-1">
              Select any milestone to inspect official venues, invitations, and independent press records.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MILESTONES.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedMilestone(m)}
              className={`cursor-pointer rounded-2xl p-6 bg-gradient-to-br ${m.accent} bg-white border-2 shadow-warm hover:shadow-warmLg transition-all hover:-translate-y-1 flex flex-col justify-between group`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-brand-primary">{m.badge}</span>
                  <span className="text-body-muted bg-white/80 px-2 py-0.5 rounded border border-brand-accent/20">
                    {m.date}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-brand-heading group-hover:text-brand-primary transition-colors">
                  {m.title}
                </h3>
                <p className="text-xs sm:text-sm text-body-text leading-relaxed">
                  {m.summary}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-brand-accent/20 flex items-center justify-between text-xs">
                <span className="text-body-muted truncate max-w-[200px]">{m.venue}</span>
                <span className="font-bold text-brand-primary group-hover:underline inline-flex items-center gap-1">
                  <span>Inspect Details</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Milestone Detail Modal */}
        {selectedMilestone && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedMilestone(null)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border-2 border-brand-accent shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-accent/20">
                <span className="text-xs font-mono font-bold text-brand-primary">
                  {selectedMilestone.badge} • {selectedMilestone.date}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMilestone(null)}
                  className="w-8 h-8 rounded-full bg-canvas-warm text-body-text font-bold hover:bg-canvas-subtle flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <h3 className="text-xl font-black text-brand-heading">
                {selectedMilestone.title}
              </h3>

              <div className="p-4 rounded-xl bg-canvas-warm/70 space-y-2 text-xs">
                <div>
                  <span className="text-body-muted font-semibold">Official Venue: </span>
                  <span className="font-bold text-brand-dark">{selectedMilestone.venue}</span>
                </div>
                {selectedMilestone.signatories && (
                  <div>
                    <span className="text-body-muted font-semibold">Authorized By: </span>
                    <span className="font-bold text-brand-dark">{selectedMilestone.signatories}</span>
                  </div>
                )}
              </div>

              <p className="text-xs sm:text-sm text-body-text leading-relaxed">
                {selectedMilestone.summary}
              </p>

              {selectedMilestone.sourceUrl && (
                <div className="pt-2">
                  <a
                    href={selectedMilestone.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-burgundy transition shadow-xs"
                  >
                    <span>{selectedMilestone.sourceLabel || "View Source Document"}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 5. 7 STRATEGIC PLATFORMS: Digital Stewardship */}
      <section className="bg-canvas-warm/60 rounded-[32px] border border-brand-accent/30 p-6 sm:p-12 shadow-sm space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Foundation Architecture</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-brand-heading mt-1">
            7 Strategic Digital Platforms
          </h2>
          <p className="text-xs sm:text-sm text-body-muted mt-1 max-w-2xl leading-relaxed">
            Architected under Shri Sohan Lal Jindal&apos;s leadership to serve every facet of community life worldwide without subscription fees or commercial banners.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Pillar 1 */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-2 flex flex-col justify-between hover:border-emerald-400 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ● Live &amp; Operational
                </span>
                <span className="text-xs font-mono font-bold text-brand-primary">01</span>
              </div>
              <h3 className="text-base font-bold text-brand-heading">Global Family Directory</h3>
              <p className="text-xs text-body-muted leading-relaxed">
                Free, verified digital household registry uniting families across all 18 Gotras with granular privacy toggles.
              </p>
            </div>
            <Link href="/directory" className="text-xs font-bold text-brand-primary hover:underline pt-2">
              Search Directory →
            </Link>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-2 flex flex-col justify-between hover:border-emerald-400 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ● Live &amp; Operational
                </span>
                <span className="text-xs font-mono font-bold text-brand-primary">02</span>
              </div>
              <h3 className="text-base font-bold text-brand-heading">Global Business Network</h3>
              <p className="text-xs text-body-muted leading-relaxed">
                Verified community enterprise portal fostering bilateral trade, partnership, and official MAFL trust certification.
              </p>
            </div>
            <Link href="/businesses" className="text-xs font-bold text-brand-primary hover:underline pt-2">
              Explore Businesses →
            </Link>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-2 flex flex-col justify-between hover:border-emerald-400 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ● Live &amp; Operational
                </span>
                <span className="text-xs font-mono font-bold text-brand-primary">03</span>
              </div>
              <h3 className="text-base font-bold text-brand-heading">Matrimonial Network</h3>
              <p className="text-xs text-body-muted leading-relaxed">
                Community-gated matrimonial matchmaking platform ensuring respectful, family-verified alliances.
              </p>
            </div>
            <Link href="/matrimony" className="text-xs font-bold text-brand-primary hover:underline pt-2">
              Candidate Profiles →
            </Link>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-2 flex flex-col justify-between hover:border-emerald-400 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ● Live &amp; Operational
                </span>
                <span className="text-xs font-mono font-bold text-brand-primary">04</span>
              </div>
              <h3 className="text-base font-bold text-brand-heading">Jobs &amp; Careers</h3>
              <p className="text-xs text-body-muted leading-relaxed">
                Dedicated hiring and talent exchange linking community employers with skilled graduates and professionals.
              </p>
            </div>
            <Link href="/careers" className="text-xs font-bold text-brand-primary hover:underline pt-2">
              Careers Portal →
            </Link>
          </div>

          {/* Pillar 5 */}
          <div className="bg-white/80 p-6 rounded-2xl border border-amber-200 shadow-xs space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  ○ In Development
                </span>
                <span className="text-xs font-mono font-bold text-body-muted">05</span>
              </div>
              <h3 className="text-base font-bold text-brand-heading">Education &amp; Mentorship</h3>
              <p className="text-xs text-body-muted leading-relaxed">
                Scholarship facilitation, university admissions guidance, and mentorship from veteran industrialists.
              </p>
            </div>
            <span className="text-[11px] font-mono text-body-muted pt-2">Phase II Roadmap</span>
          </div>

          {/* Pillar 6 */}
          <div className="bg-white/80 p-6 rounded-2xl border border-amber-200 shadow-xs space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  ○ In Development
                </span>
                <span className="text-xs font-mono font-bold text-body-muted">06</span>
              </div>
              <h3 className="text-base font-bold text-brand-heading">Community Help Desk</h3>
              <p className="text-xs text-body-muted leading-relaxed">
                Elder support, diaspora relocation navigation, and emergency mutual assistance across global chapters.
              </p>
            </div>
            <span className="text-[11px] font-mono text-body-muted pt-2">Phase II Roadmap</span>
          </div>

          {/* Pillar 7 */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white/80 p-6 rounded-2xl border border-amber-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                ○ In Development
              </span>
              <span className="text-xs font-mono font-bold text-body-muted">07</span>
            </div>
            <h3 className="text-base font-bold text-brand-heading">Social Impact &amp; Seva</h3>
            <p className="text-xs text-body-muted leading-relaxed">
              Philanthropic initiatives anchored in the Agrasen covenant to support underprivileged community families with healthcare and educational grants.
            </p>
          </div>
        </div>
      </section>

      {/* 6. GOVERNANCE & CIVIC TRANSPARENCY */}
      <section className="bg-white rounded-[32px] border border-brand-accent/30 p-6 sm:p-12 shadow-warm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Corporate Governance</span>
            <h2 className="text-2xl sm:text-3xl font-black text-brand-heading">
              Maharaja Agrasen Foundation Limited
            </h2>
            <p className="text-xs sm:text-sm text-body-text leading-relaxed">
              Incorporated under the laws of the Republic of Singapore as a <strong>Public Company Limited by Guarantee</strong>. The Foundation operates strictly as a non-profit philanthropic trust committed to community solidarity, zero commercial advertising, and uncompromising data protection.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                ✓ Non-Profit Public Guarantee
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                ✓ Free Community Registration
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                ✓ No Commercial Advertising
              </span>
            </div>
          </div>

          {/* Legal Facts Box */}
          <div className="bg-canvas-page p-6 rounded-2xl border border-brand-accent/30 space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-brand-accent/20 pb-2">
              <span className="text-body-muted">Legal Entity Name</span>
              <span className="font-bold text-brand-heading text-right">Maharaja Agrasen Foundation Limited</span>
            </div>
            <div className="flex justify-between border-b border-brand-accent/20 pb-2">
              <span className="text-body-muted">Singapore UEN</span>
              <span className="font-bold text-brand-primary">202551557G</span>
            </div>
            <div className="flex justify-between border-b border-brand-accent/20 pb-2">
              <span className="text-body-muted">Incorporation Date</span>
              <span className="font-bold text-brand-heading">20 November 2025</span>
            </div>
            <div className="flex justify-between border-b border-brand-accent/20 pb-2">
              <span className="text-body-muted">Entity Type</span>
              <span className="font-bold text-brand-heading">Public Co. Ltd by Guarantee</span>
            </div>
            <div className="flex justify-between border-b border-brand-accent/20 pb-2">
              <span className="text-body-muted">Operational Status</span>
              <span className="font-bold text-emerald-700">Live &amp; Active</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-body-muted">Registered Country</span>
              <span className="font-bold text-brand-heading">Singapore</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. DIRECT SECRETARIAT HUB */}
      <section className="bg-gradient-to-br from-white via-canvas-warm/50 to-canvas-subtle/70 rounded-[32px] border-2 border-brand-accent/40 p-6 sm:p-12 shadow-warmLg text-center space-y-8">
        <div className="max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Direct Communication Channel</span>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-heading">
            Connect with the Founder &amp; Secretariat
          </h2>
          <p className="text-xs sm:text-sm text-body-muted leading-relaxed">
            For community consultations, senior guidance, foundation representation, or institutional partnerships, reach out directly through the official Singapore Secretariat channels.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto text-left">
          {/* Channel 1: Phone / WhatsApp */}
          <div className="bg-white p-6 rounded-2xl border border-brand-accent/30 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="text-xs text-body-muted font-medium">Helpline &amp; WhatsApp</div>
              <div className="text-base font-black text-brand-heading mt-0.5">+65 9277 4444</div>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <a href="tel:+6592774444" className="text-xs font-bold text-brand-primary hover:underline">
                Call Helpline →
              </a>
              <span className="text-body-muted text-xs">•</span>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-700 hover:underline">
                WhatsApp →
              </a>
            </div>
          </div>

          {/* Channel 2: Email */}
          <div className="bg-white p-6 rounded-2xl border border-brand-accent/30 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-accent/15 text-brand-dark flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-xs text-body-muted font-medium">Verified Email</div>
              <div className="text-xs font-black text-brand-heading mt-0.5 truncate" title="contact@maharajaagrasenfoundation.com">
                contact@maharajaagrasenfoundation.com
              </div>
            </div>
            <div className="pt-2">
              <a href="mailto:contact@maharajaagrasenfoundation.com" className="text-xs font-bold text-brand-primary hover:underline">
                Email Secretariat →
              </a>
            </div>
          </div>

          {/* Channel 3: Base */}
          <div className="bg-white p-6 rounded-2xl border border-brand-accent/30 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-xs text-body-muted font-medium">Global Seat</div>
              <div className="text-base font-black text-brand-heading mt-0.5">Singapore</div>
            </div>
            <div className="pt-2 text-xs text-body-muted">
              Serving the Global Agarwal Community
            </div>
          </div>
        </div>

        {/* Global Directory Join CTA */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="h-12 px-8 rounded-full text-xs sm:text-sm font-bold text-white va-btn-join shadow-goldCta inline-flex items-center justify-center gap-2"
          >
            <span>Register Your Family Free</span>
            <span>→</span>
          </Link>
          <Link
            href="/about"
            className="h-12 px-6 rounded-full text-xs sm:text-sm font-bold text-brand-heading bg-white hover:bg-canvas-warm border border-brand-accent/40 inline-flex items-center justify-center"
          >
            About 7 Pillars
          </Link>
        </div>
      </section>
    </div>
  );
}
