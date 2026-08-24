import React from "react";
import Link from "next/link";

export default function TopNavBar() {
  return (
    <div className="va-top-bar w-full px-4 text-xs font-medium border-b border-brand-accent/30 select-none overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-2 text-white font-semibold shrink truncate min-w-0">
          <span className="w-2 h-2 rounded-full bg-brand-accentLight shadow-[0_0_6px_#fde08b] shrink-0"></span>
          <span className="truncate">
            One Community • One Platform • One Global Family{" "}
            <em className="text-amber-100 not-italic font-normal ml-1 hidden sm:inline">
              (एक समाज • एक मंच • एक परिवार)
            </em>
          </span>
        </div>

        <nav aria-label="Top Quick Navigation" className="shrink-0 hidden md:block">
          <ul className="flex items-center gap-4 text-white/90 text-xs font-medium">
            <li>
              <Link href="/" className="hover:text-white hover:underline transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/#pillars" className="hover:text-white hover:underline transition-colors">
                7 Strategic Pillars
              </Link>
            </li>
            <li>
              <Link href="/directory" className="hover:text-white hover:underline transition-colors">
                18 Gotras Directory
              </Link>
            </li>
            <li>
              <Link href="/dashboard/messages" className="hover:text-white hover:underline transition-colors flex items-center gap-1">
                <span>💬</span>
                <span>Messages</span>
              </Link>
            </li>
            <li>
              <Link href="/#appeal" className="hover:text-white hover:underline transition-colors">
                Founder&apos;s Appeal
              </Link>
            </li>
            <span className="w-px h-3 bg-white/20"></span>
            <li>
              <a
                href="tel:+919876543210"
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>Helpline: +91 98765 43210</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}