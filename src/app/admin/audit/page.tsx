import React from "react";
import Link from "next/link";
import AdminAuditExplorer from "@/components/admin/AdminAuditExplorer";

export const metadata = {
  title: "Platform Audit Trail & Security Ledger | Admin Portal",
  description: "Centralized, immutable audit trail for administrative actions, support sessions, and platform mutations.",
};

export default function AdminAuditPage() {
  return (
    <main className="py-10 bg-canvas-page min-h-screen">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase va-badge-maroon px-3 py-1 rounded-full inline-block">
                Security &amp; Compliance • लेखापरीक्षा निशान
              </span>
              <Link
                href="/admin/moderation"
                className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
              >
                <span>←</span>
                <span>Back to Moderation Queue</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
              Unified Platform Audit Trail
            </h1>
            <p className="text-xs text-body-muted mt-1 max-w-2xl leading-relaxed">
              Tamper-evident, immutable operational log tracking all administrative decisions, support session corrections, authorization events, and profile lifecycle updates across the foundation portal.
            </p>
          </div>
        </div>

        {/* Explorer Dashboard */}
        <AdminAuditExplorer />
      </div>
    </main>
  );
}
