import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function MainFooter() {
  return (
    <footer className="bg-gradient-to-b from-[#fffdf8] to-[#fff6e5] text-body-text pt-12 pb-8 border-t-2 border-brand-accent/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-brand-accent/20">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="Maharaja Agrasen Foundation Limited Singapore Logo"
                width={44}
                height={44}
                className="object-contain drop-shadow-[0_2px_8px_rgba(217,83,30,0.18)]"
              />
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-brand-primary leading-tight">
                  Maharaja Agrasen Foundation Limited Singapore
                </h3>
                <p className="text-[10px] text-body-muted font-medium">
                  One Community • One Platform • One Global Family
                </p>
              </div>
            </div>
            <p className="text-xs text-body-text/80 leading-relaxed">
              Connecting Agrawal families globally under one trusted, verified lineage directory. Free forever for every family.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-body-heading mb-3 border-b border-brand-accent/30 pb-1 inline-block">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-body-text/80">
              <li>
                <Link href="/" className="hover:text-brand-primary transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-brand-primary transition-colors">About & 7 Pillars</Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-brand-primary transition-colors">Directory Search (18 Gotras)</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-brand-primary transition-colors">Register Family Free</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-body-heading mb-3 border-b border-brand-accent/30 pb-1 inline-block">
              Community & Portals
            </h4>
            <ul className="space-y-2 text-xs text-body-text/80">
              <li>
                <Link href="/login" className="hover:text-brand-primary transition-colors">Head of Household Sign In</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand-primary transition-colors">Moderator Admin Portal</Link>
              </li>
              <li>
                <Link href="/claim" className="hover:text-brand-primary transition-colors">Claim Member Profile</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-body-heading mb-3 border-b border-brand-accent/30 pb-1 inline-block">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs text-body-text/80">
              <li>
                <Link href="/privacy" className="hover:text-brand-primary transition-colors">Privacy Policy (DPDP Act)</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand-primary transition-colors">Terms of Service</Link>
              </li>
              <li className="pt-2 text-[11px] text-body-muted font-medium">
                🔒 256-bit TLS Encrypted & Verified Lineage
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-body-muted">
          <p>© 2026 Maharaja Agrasen Foundation Limited Singapore. All rights reserved.</p>
          <p className="font-devanagari text-[11px] text-brand-primary font-bold">
            एक समाज • एक मंच • एक परिवार
          </p>
        </div>
      </div>
    </footer>
  );
}