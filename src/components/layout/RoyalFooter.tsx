import React from "react";
import Link from "next/link";
import Image from "next/image";

const WHATSAPP_NUMBER = "6592774444";
const WHATSAPP_MESSAGE = `Jai Shree Agrasen Ji 🙏\nRespected Shri Sohan Lal Jindal Ji,\n\nI am reaching out from the Maharaja Agrasen Foundation Singapore portal (maharajaagrasenfoundation.com).\n\n• Name: \n• City / Country: \n• Gotra: \n• Query / Purpose: \n\nLooking forward to connecting. Thank you!`;
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

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
            <p className="text-xs text-body-muted mb-3">
              📧 contact@maharajaagrasenfoundation.com<br />
              🌐 www.maharajaagrasenfoundation.com
            </p>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-xs font-semibold text-[#075E54] hover:text-[#054d44] transition-all shadow-xs group"
              title="Chat directly with Mr. Sohan Lal Jindal on WhatsApp"
            >
              <svg
                className="w-4 h-4 fill-[#25D366] group-hover:scale-110 transition-transform shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>WhatsApp: +65 9277 4444</span>
            </a>
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