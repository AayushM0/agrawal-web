'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { approveHousehold, approveAllHouseholds, rejectHousehold, getModerationHouseholds } from "@/actions/moderate";
import { Household } from "@/types/household";

export default function ModerationQueuePage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [filter, setFilter] = useState<"pending" | "all" | "rejected">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const loadQueue = async () => {
    setIsLoading(true);
    const data = await getModerationHouseholds();
    setHouseholds(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleApprove = async (id: string) => {
    const res = await approveHousehold(id);
    if (res.success) {
      setHouseholds(
        households.map((h) => (h.id === id ? { ...h, status: "live" } : h))
      );
      setStatusMessage("Household approved and published to directory!");
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  const handleApproveAll = async () => {
    const pendingCount = households.filter((h) => h.status === "pending_review").length;
    if (pendingCount === 0) return;

    if (!confirm(`Are you sure you want to approve all ${pendingCount} pending household(s) at once?`)) {
      return;
    }

    setIsApprovingAll(true);
    const res = await approveAllHouseholds();
    setIsApprovingAll(false);

    if (res.success) {
      setHouseholds(
        households.map((h) => (h.status === "pending_review" ? { ...h, status: "live" } : h))
      );
      setStatusMessage(`✓ All ${res.count || pendingCount} pending households have been approved and are now LIVE in the directory!`);
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    const res = await rejectHousehold(rejectingId, rejectReason);
    if (res.success) {
      setHouseholds(
        households.map((h) =>
          h.id === rejectingId
            ? { ...h, status: "rejected", rejectionReason: rejectReason }
            : h
        )
      );
      setRejectingId(null);
      setRejectReason("");
      setStatusMessage("Household flagged and rejection reason logged.");
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  const pendingHouseholds = households.filter((h) => h.status === "pending_review");
  const filteredHouseholds = households.filter((h) => {
    if (filter === "pending") return h.status === "pending_review";
    if (filter === "rejected") return h.status === "rejected";
    return true;
  });

  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase va-badge-maroon px-3 py-1 rounded-full mb-1 inline-block">
              Moderation Portal • सत्यापन दल
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
              Community Moderation Queue
            </h1>
            <p className="text-xs text-body-muted mt-0.5">
              Review and approve incoming family registrations before they go live on the global directory.
            </p>
          </div>

          {/* Action Buttons & Filter Tabs */}
          <div className="flex items-center gap-3 flex-wrap">
            {pendingHouseholds.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={isApprovingAll}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-warm transition-all flex items-center gap-1.5"
              >
                <span>✓</span>
                <span>{isApprovingAll ? "Approving All..." : `Approve All (${pendingHouseholds.length})`}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-brand-accent/30">
              <button
                onClick={() => setFilter("pending")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === "pending"
                    ? "bg-brand-primary text-white"
                    : "text-body-muted hover:text-brand-primary"
                }`}
              >
                Pending ({pendingHouseholds.length})
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === "all"
                    ? "bg-brand-primary text-white"
                    : "text-body-muted hover:text-brand-primary"
                }`}
              >
                All ({households.length})
              </button>
              <button
                onClick={() => setFilter("rejected")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === "rejected"
                    ? "bg-brand-primary text-white"
                    : "text-body-muted hover:text-brand-primary"
                }`}
              >
                Rejected ({households.filter((h) => h.status === "rejected").length})
              </button>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 animate-in fade-in">
            {statusMessage}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 bg-white border border-brand-accent/30 rounded-3xl p-8 shadow-warm">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-bold text-body-muted">Loading live moderation queue from Supabase...</p>
          </div>
        ) : filteredHouseholds.length === 0 ? (
          <div className="text-center py-16 bg-white border border-brand-accent/30 rounded-3xl p-8 shadow-warm">
            <p className="text-sm font-bold text-brand-primary mb-1">
              No households match this filter
            </p>
            <p className="text-xs text-body-muted">
              All registrations are currently up-to-date and reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHouseholds.map((h) => (
              <div
                key={h.id}
                className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 shadow-warm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-accent/20">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h2 className="text-base font-bold text-brand-primary">
                        {h.headName}
                      </h2>
                      <span className="text-xs font-bold va-badge-gold px-2.5 py-0.5 rounded-full">
                        Gotra: {h.gotra}
                      </span>
                      <span className="text-xs font-mono font-bold text-brand-primary bg-canvas-warm px-2.5 py-0.5 rounded-full border border-brand-accent/40">
                        #{h.serialNo || h.householdCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-body-text mt-2">
                      <p>
                        <strong>Ancestral Native:</strong> {h.nativePlace}
                      </p>
                      <p>
                        <strong>Verified Contact:</strong> {h.verifiedContact}
                      </p>
                      <p className="sm:col-span-2">
                        <strong>Residential Address:</strong> {h.fullAddress || "N/A"}, {h.city || ""}, {h.state || ""} ({h.country || "India"}) - {h.postalCode || ""}
                      </p>
                      <p className="sm:col-span-2 text-brand-primary font-mono text-[11px] font-bold">
                        {h.aadhaarNumber ? `Aadhaar: ${h.aadhaarNumber} • PAN: ${h.panNumber || "N/A"}` : `Passport: ${h.passportNumber || "N/A"} • Govt ID: ${h.govtIdNumber || "N/A"}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {h.status === "pending_review" && (
                      <>
                        <button
                          onClick={() => handleApprove(h.id)}
                          className="px-4 py-2 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
                        >
                          ✓ Approve Family
                        </button>
                        <button
                          onClick={() => setRejectingId(h.id)}
                          className="px-4 py-2 rounded-full text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all"
                        >
                          ✕ Reject / Flag
                        </button>
                      </>
                    )}

                    {h.status === "live" && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        ✓ Approved (Live)
                      </span>
                    )}

                    {h.status === "rejected" && (
                      <span className="text-xs font-bold text-red-800 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                        ✕ Rejected (Dispute Logged)
                      </span>
                    )}
                  </div>
                </div>

                {h.status === "rejected" && h.rejectionReason && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 text-xs text-red-700">
                    <strong>Logged Reason:</strong> {h.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {rejectingId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-brand-accent/40 animate-in fade-in zoom-in-95">
              <h3 className="text-lg font-bold text-brand-primary mb-2">
                Reject / Flag Household Registration
              </h3>
              <p className="text-xs text-body-muted mb-4">
                Please provide a mandatory reason. This explanation will be logged and sent to the household head.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Mobile number could not be verified; invalid ancestral village listed."
                rows={4}
                className="w-full p-3 rounded-2xl border border-brand-accent/40 text-xs text-body-heading bg-canvas-warm/30 focus:outline-none focus:ring-2 focus:ring-brand-primary mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold text-body-muted hover:bg-canvas-warm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectReason.trim()}
                  className="px-5 py-2 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}