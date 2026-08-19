import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function RoyalFooter() {
  return (
    <footer className="relative bg-gradient-to-b from-[#300806] to-[#1e0504] text-[#fff6e1]/90 overflow-hidden border-t-4 border-brand-accent">
      <div className="max-w-7xl mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <Image
                src="/images/logo.png"
                alt="Maharaja Agrasen Foundation Logo"
                width={50}
                height={50}
                className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              />
              <div>
                <h3 className="text-lg font-bold text-[#fff7dd]">Global Agrawal Directory</h3>
                <p className="text-xs text-[#ffe7a8]">One Community • One Platform • One Global Family</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-[#fff6e1]/80 mb-4">
              Our vision is to build a powerful and trusted Global Digital Platform for the Agrawal Community. Registration is completely FREE OF CHARGE.
            </p>
            <p className="text-xs font-semibold text-[#ffe7a8] font-devanagari">
              धर्म • सेवा • संस्कार • शिक्षा • समाज उत्थान
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#fff7dd] uppercase tracking-wider mb-4 border-b-2 border-brand-accent pb-1 inline-block">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-[#ffe7a8] transition-colors">
                  Home (मुख्य पृष्ठ)
                </Link>
              </li>
              <li>
                <Link href="/#pillars" className="hover:text-[#ffe7a8] transition-colors">
                  7 Strategic Pillars (7 प्रमुख स्तंभ)
                </Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-[#ffe7a8] transition-colors">
                  Directory Search (निर्देशिका खोज)
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#ffe7a8] transition-colors">
                  Family Registration (निःशुल्क परिवार पंजीकरण)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#ffe7a8] transition-colors">
                  Head Dashboard (मुखिया डैशबोर्ड)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#fff7dd] uppercase tracking-wider mb-4 border-b-2 border-brand-accent pb-1 inline-block">
              Secretariat & Foundation
            </h4>
            <p className="text-xs leading-relaxed text-[#fff6e1]/85 mb-3">
              <strong>Sohan Lal Jindal &ldquo;Singapore Wale&rdquo;</strong><br />
              Founder & Chairman — Maharaja Agrasen Foundation Limited<br />
              Founder & Chairman — JSM Group
            </p>
            <p className="text-xs text-[#fff6e1]/75">
              📧 contact@agrasenfoundation.org<br />
              🌐 www.agrasenvaishakhara.com
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#fff6e1]/65">
          <p>© 2026 Maharaja Agrasen Foundation Limited. All Rights Reserved. एक समाज • एक मंच • एक परिवार</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#ffe7a8] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#ffe7a8] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}