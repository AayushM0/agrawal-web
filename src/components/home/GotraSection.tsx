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
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-xs sm:text-sm font-bold text-white va-btn-maroon self-start md:self-center shrink-0 transition-all shadow-sm"
            >
              <span>Browse Directory by Gotra</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {gotras.map((g) => (
              <Link
                key={g.id}
                href={`/directory?gotra=${encodeURIComponent(g.name)}`}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-canvas-warm/70 border border-brand-accent/30 hover:bg-white hover:border-brand-accent hover:shadow-sm transition-all min-h-[52px] group text-left"
              >
                <span className="w-6 h-6 rounded-lg bg-brand-gold/15 text-brand-primary text-xs font-bold font-mono flex items-center justify-center shrink-0 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                  {g.id}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-bold text-brand-primary block leading-tight truncate">
                    {g.name}
                  </span>
                  <span className="text-xs font-devanagari text-body-muted block">
                    {g.devanagari}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}