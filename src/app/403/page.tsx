import React from "react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-[70vh] bg-canvas-page flex items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border-2 border-red-200 p-8 shadow-warm">
        <div className="text-6xl mb-6">🔒</div>
        <span className="inline-block text-[10px] font-bold uppercase bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full mb-3">
          Error 403: Forbidden Access
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-brand-primary mb-2">
          Access Denied
        </h1>
        <p className="text-xs text-body-muted mb-8 leading-relaxed">
          You do not have administrative permission to view this restricted section or edit this profile card. Access is locked under strict Row Level Security (RLS) policies.
        </p>
        
        <div className="flex flex-col gap-2.5">
          <Link
            href="/dashboard"
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs rounded-full transition-colors duration-200 block shadow-md"
          >
            Go to My Dashboard
          </Link>
          
          <Link
            href="/"
            className="w-full py-2.5 bg-canvas-warm hover:bg-canvas-warm/80 text-brand-primary font-bold text-xs rounded-full border border-brand-accent/40 transition-colors duration-200 block"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
