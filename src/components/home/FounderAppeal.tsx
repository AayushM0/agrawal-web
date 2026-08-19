import React from "react";
import Image from "next/image";

export default function FounderAppeal() {
  return (
    <section id="appeal" className="py-16 bg-[#fff6e5] border-b border-brand-accent/20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white border-2 border-brand-accent rounded-3xl p-8 sm:p-12 shadow-warmLg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            <div className="relative w-28 h-28 shrink-0">
              <Image
                src="/images/logo.png"
                alt="Maharaja Agrasen Foundation Logo"
                width={112}
                height={112}
                className="object-contain drop-shadow-[0_4px_14px_rgba(116,27,23,0.25)]"
              />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <span className="inline-block text-xs font-bold uppercase tracking-wider va-badge-maroon px-3 py-1 rounded-full mb-2">
                Our Global Appeal • संस्थापक संदेश
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-brand-primary mb-3">
                &ldquo;One Community • One Platform • One Global Family&rdquo;
              </h3>
              <p className="text-xs sm:text-sm text-body-text leading-relaxed mb-4">
                &ldquo;We invite every Agrawal family across the world, alongside community organizations, entrepreneurs, professionals, and youth leaders, to become part of this historic initiative. Registration is entirely <strong>FREE OF CHARGE</strong>. This platform belongs to the community, and its strength comes from our collective participation.&rdquo;
              </p>
              <div>
                <p className="text-sm font-extrabold text-brand-primary">
                  Sohan Lal Jindal &ldquo;Singapore Wale&rdquo;
                </p>
                <p className="text-xs text-body-muted">
                  Founder & Chairman — Maharaja Agrasen Foundation Limited Singapore | Founder & Chairman — JSM Group
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}