import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function MainFooter() {
  return (
    <footer className="bg-[#2c0e0c] text-[#f7e7ce] pt-12 pb-8 border-t-2 border-brand-gold/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={44}
                height={44}
                className="object-contain"
              />
              <div>
                <h3 className="text-sm font-bold text-brand-gold leading-tight">
                  Global Agrawal Directory
                </h3>
                <p className="text-[10px] text-white/60">
                  Maharaja Agrasen Foundation Limited
                </p>
              </div>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Connecting Agrawal families globally under one trusted, verified lineage directory. Free forever for every family.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gold mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-white/75">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">About & 7 Pillars</Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-white transition-colors">Directory Search (18 Gotras)</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">Register Family Free</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gold mb-3">
              Community & Portals
            </h4>
            <ul className="space-y-2 text-xs text-white/75">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">Head of Household Sign In</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">Moderator Admin Portal</Link>
              </li>
              <li>
                <Link href="/claim" className="hover:text-white transition-colors">Claim Member Profile</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gold mb-3">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs text-white/75">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy (DPDP Act)</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </li>
              <li className="pt-2 text-[11px] text-white/60">
                🔒 256-bit TLS Encrypted & Verified Lineage
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <p>© 2026 Maharaja Agrasen Foundation Limited. All rights reserved.</p>
          <p className="font-devanagari text-[11px] text-brand-gold">
            एक समाज • एक मंच • एक परिवार
          </p>
        </div>
      </div>
    </footer>
  );
}