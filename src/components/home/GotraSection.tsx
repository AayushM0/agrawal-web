import React from "react";
import Link from "next/link";
import { gotras } from "@/data/gotras";

export { gotras };

export default function GotraSection() {
  return (
    <section className="py-14 bg-canvas-page border-b border-brand-accent/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 sm:p-10 shadow-warm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-brand-accent/20">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider va-badge-gold px-2.5 py-0.5 rounded-full mb-1 inline-block">
                Lineage & Heritage
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-brand-primary">
                18 Gotras Established by Maharaja Agrasen (18 गोत्र)
              </h2>
              <p className="text-xs text-body-muted mt-1">
                Explore registered family members and connections organized across all 18 Gotras.
              </p>
            </div>
            <Link
              href="/directory"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white va-btn-maroon self-start shrink-0"
            >
              Browse Directory by Gotra →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {gotras.map((g) => (
              <Link
                key={g.id}
                href={`/directory?gotra=${encodeURIComponent(g.name)}`}
                className="flex items-center justify-between p-3 rounded-xl bg-canvas-warm/60 border border-brand-accent/30 hover:bg-white hover:border-brand-accent hover:shadow-sm transition-all text-left"
              >
                <div>
                  <span className="text-xs font-bold text-brand-primary block">{g.name}</span>
                  <span className="text-[11px] font-devanagari text-body-muted">{g.devanagari}</span>
                </div>
                <span className="text-[10px] font-mono text-brand-gold font-bold">{g.id}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}