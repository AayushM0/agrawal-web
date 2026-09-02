import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function RoyalFooter() {
  return (
    <footer className="relative bg-gradient-to-b from-[#fffdf8] to-[#fff6e5] text-body-text overflow-hidden border-t-4 border-brand-accent shadow-sm">
      <div className="max-w-7xl mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 border-b border-brand-accent/20">
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <Image
                src="/images/logo-transparent.png"
                alt="Maharaja Agrasen Foundation Limited Singapore Logo"
                width={50}
                height={50}
                className="object-contain drop-shadow-[0_2px_8px_rgba(217,83,30,0.18)]"
              />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-brand-primary leading-tight">
                  Maharaja Agrasen Foundation Limited Singapore
                </h3>
                <p className="text-xs text-brand-gold font-semibold">One Community • One Platform • One Global Family</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-body-text/85 mb-4">
              Our vision is to build a powerful and trusted Global Digital Platform for the Agarwal Community. Registration is completely FREE OF CHARGE.
            </p>
            <p className="text-xs font-bold text-brand-primary font-devanagari">
              धर्म • सेवा • संस्कार • शिक्षा • समाज उत्थान
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-body-heading uppercase tracking-wider mb-4 border-b-2 border-brand-accent pb-1 inline-block">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-body-text/80">
              <li>
                <Link href="/" className="hover:text-brand-primary transition-colors">
                  Home (मुख्य पृष्ठ)
                </Link>
              </li>
              <li>
                <Link href="/#pillars" className="hover:text-brand-primary transition-colors">
                  7 Strategic Pillars (7 प्रमुख स्तंभ)
                </Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-brand-primary transition-colors">
                  Directory Search (निर्देशिका खोज)
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-brand-primary transition-colors">
                  Family Registration (निःशुल्क परिवार पंजीकरण)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-brand-primary transition-colors">
                  Head Dashboard (मुखिया डैशबोर्ड)
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-brand-primary transition-colors">
                  Account Settings (सेटिंग्स)
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-brand-primary transition-colors">
                  Help Center (सहायता केंद्र)
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-brand-primary transition-colors">
                  Support Desk (सहायता डेस्क)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-body-heading uppercase tracking-wider mb-4 border-b-2 border-brand-accent pb-1 inline-block">
              Secretariat & Foundation
            </h4>
            <p className="text-xs leading-relaxed text-body-text/85 mb-3">
              <strong>Sohan Lal Jindal &ldquo;Singapore Wale&rdquo;</strong><br />
              Founder & Chairman — Maharaja Agrasen Foundation Limited Singapore
            </p>
            <p className="text-xs text-body-muted">
              📧 contact@agrasenfoundation.org<br />
              🌐 www.agrasenvaishakhara.com
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-body-muted">
          <p>© 2026 Maharaja Agrasen Foundation Limited Singapore. All Rights Reserved. एक समाज • एक मंच • एक परिवार</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 font-medium justify-center sm:justify-end">
            <Link href="/privacy" className="hover:text-brand-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-brand-primary transition-colors">Terms of Service</Link>
            <Link href="/cookie-policy" className="hover:text-brand-primary transition-colors">Cookie Policy</Link>
            <Link href="/accessibility" className="hover:text-brand-primary transition-colors">Accessibility Statement</Link>
            <Link href="/acceptable-use" className="hover:text-brand-primary transition-colors">Acceptable Use</Link>
            <Link href="/security-policy" className="hover:text-brand-primary transition-colors">Security Policy</Link>
            <Link href="/responsible-disclosure" className="hover:text-brand-primary transition-colors">Responsible Disclosure</Link>
            <Link href="/community-guidelines" className="hover:text-brand-primary transition-colors">Community Guidelines</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}