'use client';

import { approveHousehold, rejectHousehold } from "@/actions/moderate";


import React, { useState } from "react";
import Link from "next/link";
import { initialMockHouseholds } from "@/data/mockMembers";
import { Household } from "@/types/household";

export default function AdminModerationPage() {
  const [households, setHouseholds] = useState<Household[]>(initialMockHouseholds);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (id: string) => {
    const res = await approveHousehold(id);
    if (res.success) {
      setHouseholds(
        households.map((h) => (h.id === id ? { ...h, status: "live" } : h))
      );
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
    }
  };

  const pendingCount = households.filter((h) => h.status === "pending_review").length;

  return (
    <main className="py-12 bg-canvas-page">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase va-badge-maroon px-3 py-1 rounded-full mb-1 inline-block">
              Admin & Community Review • प्रशासनिक समीक्षा
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-primary">
              Household Moderation Queue
            </h1>
            <p className="text-xs text-body-muted mt-0.5">
              Review new household submissions. Approving makes the household searchable. Rejecting soft-deletes with dispute reason.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3.5 py-1.5 rounded-full va-badge-pending">
              Pending Reviews: {pendingCount}
            </span>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white border border-brand-accent/30 rounded-3xl overflow-hidden shadow-warm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas-warm/70 text-body-heading font-extrabold border-b border-brand-accent/20">
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Head of Household</th>
                  <th className="py-3.5 px-4">Gotra & Native Place</th>
                  <th className="py-3.5 px-4">Members</th>
                  <th className="py-3.5 px-4">Verified Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-accent/15">
                {households.map((h) => (
                  <tr key={h.id} className="hover:bg-canvas-warm/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-primary">
                      {h.householdCode}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-body-heading">
                      {h.headName}
                    </td>
                    <td className="py-3.5 px-4 text-body-text">
                      <span className="font-semibold text-brand-gold font-devanagari">{h.gotra}</span> • {h.nativePlace}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {h.members.length} members
                    </td>
                    <td className="py-3.5 px-4 font-mono text-body-muted">
                      {h.verifiedContact}
                    </td>
                    <td className="py-3.5 px-4">
                      {h.status === "live" && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                          LIVE
                        </span>
                      )}
                      {h.status === "pending_review" && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                          PENDING
                        </span>
                      )}
                      {h.status === "rejected" && (
                        <span className="text-[10px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-full border border-red-300">
                          REJECTED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {h.status === "pending_review" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(h.id)}
                            className="px-3 py-1 rounded-full text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(h.id)}
                            className="px-3 py-1 rounded-full text-xs font-bold text-red-700 bg-red-50 border border-red-300 hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-body-muted">
                          {h.status === "live" ? "Approved" : `Reason: ${h.rejectionReason}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejection Modal */}
        {rejectingId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border-2 border-red-300 shadow-2xl">
              <h3 className="text-base font-bold text-brand-primary mb-2">
                Reject Household Submission
              </h3>
              <p className="text-xs text-body-muted mb-4">
                Please provide a clear reason. The registration will be retained (soft-deleted) for dispute records.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Unverifiable contact number or incomplete member details..."
                rows={3}
                className="w-full p-3 rounded-xl border border-brand-accent/40 text-xs text-body-heading mb-4 focus:ring-1 focus:ring-brand-primary"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold text-body-heading bg-canvas-warm border border-brand-accent/30"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectReason.trim()}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 rounded-full text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50"
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