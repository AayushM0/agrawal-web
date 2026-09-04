import React from "react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-canvas-page flex items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border-2 border-brand-accent/40 p-8 shadow-warm">
        <div className="text-6xl mb-6">🛠️</div>
        <span className="inline-block text-[10px] font-bold uppercase va-badge-gold px-3 py-1 rounded-full mb-3">
          Scheduled Upkeep
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-brand-primary mb-2">
          System Under Maintenance
        </h1>
        <p className="text-xs text-body-muted mb-6 leading-relaxed">
          The Maharaja Agrasen Foundation Global Directory is undergoing scheduled maintenance or database optimization to keep our RLS policies and PII protection robust. We will be back online shortly.
        </p>
        <div className="p-3 bg-canvas-warm rounded-xl border border-brand-accent/30 font-semibold text-[11px] text-brand-primary">
          📧 Support: contact@maharajaagrasenfoundation.com
        </div>
      </div>
    </div>
  );
}
