import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function MainHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#fffaf2]/95 backdrop-blur-md border-b border-brand-accent/25 shadow-warm transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" className="flex items-center gap-3.5 text-decoration-none group">
          <div className="relative w-14 h-14 shrink-0 transition-transform group-hover:scale-105">
            <Image
              src="/images/logo.png"
              alt="Maharaja Agrasen Foundation Logo"
              width={58}
              height={58}
              className="object-contain drop-shadow-[0_2px_8px_rgba(116,27,23,0.22)]"
              priority
            />
          </div>
          <div>
            <span className="inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full va-badge-gold mb-1">
              Global Agrawal Directory
            </span>
            <h2 className="text-lg font-extrabold text-brand-primary leading-tight tracking-tight">
              Global Agrawal Directory
            </h2>
            <p className="text-[11px] text-body-muted font-medium">
              Maharaja Agrasen Foundation Limited
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/"
            className="px-3.5 py-2 text-xs font-semibold text-body-heading hover:text-brand-primary rounded-full hover:bg-canvas-warm transition-colors"
          >
            Home
          </Link>
          <Link
            href="/directory"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-brand-primary bg-white hover:bg-canvas-warm border border-brand-accent/30 rounded-full shadow-sm hover:border-brand-accent transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>Directory Search</span>
          </Link>
          <Link
            href="/dashboard"
            className="px-3.5 py-2 text-xs font-semibold text-body-heading hover:text-brand-primary rounded-full hover:bg-canvas-warm transition-colors"
          >
            Head Dashboard
          </Link>
          <Link
            href="/admin/moderation"
            className="px-3.5 py-2 text-xs font-semibold text-body-muted hover:text-brand-primary rounded-full hover:bg-canvas-warm transition-colors"
          >
            Admin Queue
          </Link>
          <Link
            href="/login"
            className="px-3.5 py-2 text-xs font-semibold text-body-heading hover:text-brand-primary rounded-full hover:bg-canvas-warm transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-xs font-bold text-white va-btn-join rounded-full"
          >
            Register Family Free
          </Link>
        </div>
      </div>
    </header>
  );
}