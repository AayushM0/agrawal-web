import React from "react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] bg-canvas-page flex items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border-2 border-brand-accent/30 p-8 shadow-warm">
        <div className="text-6xl mb-6">🏛️</div>
        <h1 className="text-2xl font-black text-brand-primary mb-2">
          Page Not Found
        </h1>
        <p className="text-xs text-body-muted mb-8 leading-relaxed">
          The heritage pathway you are looking for does not exist or has been relocated. Let's guide you back to the community hearth.
        </p>
        
        <div className="flex flex-col gap-2.5">
          <Link
            href="/directory"
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs rounded-full transition-colors duration-200 block shadow-md"
          >
            Search community directory
          </Link>
          
          <Link
            href="/"
            className="w-full py-2.5 bg-canvas-warm hover:bg-canvas-warm/80 text-brand-primary font-bold text-xs rounded-full border border-brand-accent/40 transition-colors duration-200 block"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
