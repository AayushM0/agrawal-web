'use client';

import React, { useState, useEffect } from "react";
import {
  approveHousehold,
  approveAllHouseholds,
  rejectHousehold,
  getModerationHouseholds,
  getMessageReports,
  resolveMessageReport,
  getAdminSupportInquiries,
  updateAdminInquiryStatus,
  resendHouseholdPassAction,
  getEmailQueueStatusAction,
  retryFailedEmailsAction,
  drainEmailQueueAction,
} from "@/actions/moderate";
import { getIncompleteRegistrations } from "@/actions/draft";
import { Household } from "@/types/household";

export default function ModerationQueuePage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "all" | "rejected" | "reports" | "inquiries" | "incomplete" | "queue">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [queueLogs, setQueueLogs] = useState<any[]>([]);
  const [isDraining, setIsDraining] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [downloadingHouseholdId, setDownloadingHouseholdId] = useState<string | null>(null);
  const [copiedError, setCopiedError] = useState<string | null>(null);
  const [showOnlyFailedEmails, setShowOnlyFailedEmails] = useState(false);

  const handleCopyError = (text: string) => {
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedError(text);
    setStatusMessage("Copied error details to clipboard!");
    setTimeout(() => {
      setCopiedError(null);
      setStatusMessage("");
    }, 2500);
  };

  const loadQueueStats = async () => {
    const qRes = await getEmailQueueStatusAction();
    if (qRes.success) {
      setQueueStats(qRes.stats || null);
      setQueueLogs(qRes.recentLogs || []);
    }
  };

  const loadQueue = async () => {
    setIsLoading(true);
    const [data, repRes, inqRes, draftRes, qRes] = await Promise.all([
      getModerationHouseholds(),
      getMessageReports(),
      getAdminSupportInquiries(),
      getIncompleteRegistrations(),
      getEmailQueueStatusAction(),
    ]);
    setHouseholds(data);
    if (repRes.success) {
      setReports(repRes.reports || []);
    }
    if (inqRes.success) {
      setInquiries(inqRes.inquiries || []);
    }
    if (draftRes.success) {
      setDrafts(draftRes.drafts || []);
    }
    if (qRes.success) {
      setQueueStats(qRes.stats || null);
      setQueueLogs(qRes.recentLogs || []);
    }
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

  const handleResolveReport = async (reportId: string, action: "dismiss" | "warn" | "suspend_chat") => {
    const res = await resolveMessageReport({ reportId, action });
    if (res.success) {
      setReports(reports.map((r) => (r.id === reportId ? { ...r, status: action === "dismiss" ? "dismissed" : "action_taken" } : r)));
      setStatusMessage(`Report action "${action}" applied successfully.`);
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  const handleUpdateInquiryStatus = async (ticketId: string, status: "open" | "in_progress" | "resolved") => {
    const res = await updateAdminInquiryStatus({ ticketId, status });
    if (res.success) {
      setInquiries((prev) =>
        prev.map((inq) => (inq.ticketId === ticketId ? { ...inq, status } : inq))
      );
      setStatusMessage(res.message || `Inquiry status updated to ${status}.`);
      setTimeout(() => setStatusMessage(""), 3000);
    } else {
      setStatusMessage(res.error || "Failed to update inquiry status.");
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  const handleResendPasses = async (householdId: string) => {
    setResendingId(householdId);
    const res = await resendHouseholdPassAction(householdId);
    setResendingId(null);
    if (res.success) {
      const lastError = res.errors?.length
        ? `Pass generation warning: ${res.errors.map((e) => `${e.memberName}: ${e.error}`).join("; ")}`
        : undefined;
      setHouseholds((prev) =>
        prev.map((h) => (h.id === householdId ? { ...h, lastError } : h))
      );
      setStatusMessage(res.message || "Official ID passes enqueued.");
      setTimeout(() => setStatusMessage(""), 4000);
      loadQueueStats();
    } else {
      const errMsg = res.error || "Failed to resend passes.";
      setHouseholds((prev) =>
        prev.map((h) => (h.id === householdId ? { ...h, lastError: errMsg } : h))
      );
      setStatusMessage(errMsg);
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  const handleDrainQueue = async () => {
    setIsDraining(true);
    const res = await drainEmailQueueAction(10);
    setIsDraining(false);
    if (res.success) {
      setStatusMessage(`✓ Processed ${res.processed ?? 0} emails (${res.succeeded ?? 0} sent, ${res.failed ?? 0} failed). ${res.remainingPending ?? 0} pending.`);
      setTimeout(() => setStatusMessage(""), 4000);
      loadQueueStats();
    } else {
      setStatusMessage(res.error || "Failed to process queue.");
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  const handleRetryFailedEmails = async () => {
    setIsRetrying(true);
    const res = await retryFailedEmailsAction();
    setIsRetrying(false);
    if (res.success) {
      setStatusMessage(res.message || `Reset ${res.resetCount} emails.`);
      setTimeout(() => setStatusMessage(""), 4000);
      loadQueueStats();
    } else {
      setStatusMessage(res.error || "Failed to retry emails.");
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  const pendingHouseholds = households.filter((h) => h.status === "pending_review");
  const filteredHouseholds = households.filter((h) => {
    if (filter === "pending") return h.status === "pending_review";
    if (filter === "rejected") return h.status === "rejected";
    return true;
  });

  const displayedQueueLogs = showOnlyFailedEmails
    ? queueLogs.filter((log) => log.status === "failed")
    : queueLogs;

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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {pendingHouseholds.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={isApprovingAll}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-warm transition-all flex items-center justify-center gap-1.5 min-h-[38px] shrink-0"
              >
                <span>✓</span>
                <span>{isApprovingAll ? "Approving All..." : `Approve All (${pendingHouseholds.length})`}</span>
              </button>
            )}

            <div className="w-full overflow-x-auto no-scrollbar pb-1">
              <div className="min-w-max flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-brand-accent/30">
                <button
                  onClick={() => setFilter("pending")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center ${
                    filter === "pending"
                      ? "bg-brand-primary text-white"
                      : "text-body-muted hover:text-brand-primary"
                  }`}
                >
                  Pending ({pendingHouseholds.length})
                </button>
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center ${
                    filter === "all"
                      ? "bg-brand-primary text-white"
                      : "text-body-muted hover:text-brand-primary"
                  }`}
                >
                  All ({households.length})
                </button>
                <button
                  onClick={() => setFilter("rejected")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center ${
                    filter === "rejected"
                      ? "bg-brand-primary text-white"
                      : "text-body-muted hover:text-brand-primary"
                  }`}
                >
                  Rejected ({households.filter((h) => h.status === "rejected").length})
                </button>
                <button
                  onClick={() => setFilter("reports")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center ${
                    filter === "reports"
                      ? "bg-brand-primary text-white"
                      : "text-body-muted hover:text-brand-primary"
                  }`}
                >
                  🚩 Message Reports ({reports.filter((r) => r.status === "pending").length})
                </button>
                <button
                  onClick={() => setFilter("inquiries")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center ${
                    filter === "inquiries"
                      ? "bg-brand-primary text-white"
                      : "text-body-muted hover:text-brand-primary"
                  }`}
                >
                  📩 Inquiries ({inquiries.filter((i) => i.status === "open").length})
                </button>
                <button
                  onClick={() => setFilter("incomplete")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center ${
                    filter === "incomplete"
                      ? "bg-brand-primary text-white"
                      : "text-body-muted hover:text-brand-primary"
                  }`}
                >
                  📝 Incomplete Signups ({drafts.length})
                </button>
                <button
                  onClick={() => {
                    setFilter("queue");
                    loadQueueStats();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                    filter === "queue"
                      ? "bg-brand-primary text-white"
                      : "text-body-muted hover:text-brand-primary"
                  }`}
                >
                  <span>📬 Email Queue</span>
                  {queueStats && queueStats.failed > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-bold">
                      {queueStats.failed}
                    </span>
                  )}
                  {queueStats && queueStats.pending > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 rounded-full text-[10px] font-bold">
                      {queueStats.pending}
                    </span>
                  )}
                </button>
              </div>
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
            <p className="text-xs font-bold text-body-muted">Loading live moderation queue...</p>
          </div>
        ) : filter === "incomplete" ? (
          drafts.length === 0 ? (
            <div className="text-center py-16 bg-white border border-brand-accent/30 rounded-3xl p-8 shadow-warm">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm font-bold text-brand-primary mb-1">
                No Incomplete Signups
              </p>
              <p className="text-xs text-body-muted max-w-md mx-auto">
                All candidates who started registration have completed and submitted their family profiles.
              </p>
            </div>
          ) : (
            <div className="bg-white border-2 border-brand-accent/30 rounded-3xl overflow-hidden shadow-warm">
              <div className="p-5 bg-canvas-warm/40 border-b border-brand-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black text-brand-primary">
                    Incomplete Signups & Abandoned Registrations ({drafts.length})
                  </h2>
                  <p className="text-xs text-body-muted">
                    Candidates who initiated registration on Step 1 (email & mobile) but have not yet submitted their full profile.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-canvas-warm/80 border-b border-brand-accent/30 text-body-heading font-bold">
                      <th className="py-3 px-4 min-w-[180px]">Primary Email</th>
                      <th className="py-3 px-4 min-w-[140px]">Mobile Number</th>
                      <th className="py-3 px-4 min-w-[160px]">Candidate Name</th>
                      <th className="py-3 px-4 min-w-[160px]">Dropped Off At</th>
                      <th className="py-3 px-4 min-w-[120px]">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-accent/15 text-body-text">
                    {drafts.map((d) => (
                      <tr key={d.id} className="hover:bg-amber-50/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-brand-primary">
                          {d.email}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {d.phoneDialCode ? `${d.phoneDialCode} ` : ""}{d.phone}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {d.headName || <span className="text-body-muted italic">Not provided yet</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-canvas-warm border border-brand-accent/40 text-brand-primary">
                            {d.currentStep === 2
                              ? "Step 2: Family Details"
                              : d.currentStep === 3
                              ? "Step 3: Additional Members"
                              : d.currentStep === 4
                              ? "Step 4: Consent & Review"
                              : `Step ${d.currentStep}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-body-muted text-[11px]">
                          {new Date(d.updatedAt).toLocaleString("en-SG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : filter === "reports" ? (
          reports.length === 0 ? (
            <div className="text-center py-16 bg-white border border-brand-accent/30 rounded-3xl p-8 shadow-warm">
              <div className="text-3xl mb-2">🛡️</div>
              <p className="text-sm font-bold text-brand-primary mb-1">
                Zero Active Message Reports
              </p>
              <p className="text-xs text-body-muted max-w-md mx-auto">
                When members flag suspicious payment solicitations, phishing, or abusive chats, immutable thread snapshots will appear here for administrator audit and disciplinary action.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((rep) => (
                <div key={rep.id} className="bg-white border-2 border-red-200 rounded-3xl p-6 shadow-warm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-4">
                    <div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800 uppercase tracking-wider">
                        🚩 Report: {rep.reason?.replace(/_/g, " ")}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Reported by: <b>{rep.reporterName}</b> (#{rep.reporterHousehold}) • Against: <b>{rep.reportedName}</b> (#{rep.reportedHousehold})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        rep.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-700"
                      }`}>
                        Status: {rep.status}
                      </span>
                    </div>
                  </div>

                  {rep.details && (
                    <div className="mb-4 p-3 bg-red-50/60 rounded-xl text-xs text-red-900">
                      <b>Reporter Note:</b> &quot;{rep.details}&quot;
                    </div>
                  )}

                  {rep.snapshotData && Array.isArray(rep.snapshotData) && (
                    <div className="mb-4 bg-[#FAF6F0] p-3.5 rounded-xl border border-[#E8DCC4] text-xs">
                      <p className="font-bold text-[#800020] mb-2">📜 Thread Snapshot at Report Time:</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {rep.snapshotData.map((m: any, idx: number) => (
                          <div key={idx} className="bg-white p-2 rounded border border-gray-200">
                            <span className="font-bold text-[#800020]">{m.senderName}: </span>
                            <span>{m.messageBody}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rep.status === "pending" && (
                    <div className="flex flex-wrap gap-2 justify-end pt-2">
                      <button
                        onClick={() => handleResolveReport(rep.id, "dismiss")}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                      >
                        Dismiss Report
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, "warn")}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition"
                      >
                        Issue Warning
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, "suspend_chat")}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-700 hover:bg-red-800 transition"
                      >
                        Suspend Offending Chat
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : filter === "inquiries" ? (
          inquiries.length === 0 ? (
            <div className="text-center py-16 bg-white border border-brand-accent/30 rounded-3xl p-8 shadow-warm">
              <div className="text-3xl mb-2">📩</div>
              <p className="text-sm font-bold text-brand-primary mb-1">
                Zero Inquiries Logged
              </p>
              <p className="text-xs text-body-muted max-w-md mx-auto">
                Any questions, moderation status queries, or gotra correction requests submitted through the Support Desk will appear here for Secretariat review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inq) => (
                <div
                  key={inq.id || inq.ticketId}
                  className="bg-white border-2 border-brand-accent/30 rounded-3xl p-6 shadow-warm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-accent/15 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-brand-primary font-mono bg-amber-50 border border-brand-accent/40 px-2.5 py-0.5 rounded-full">
                          #{inq.ticketId}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                          {inq.category}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            inq.status === "open"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : inq.status === "in_progress"
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          }`}
                        >
                          ● {inq.status === "open" ? "Open" : inq.status === "in_progress" ? "In Progress" : "Resolved"}
                        </span>
                      </div>
                      <p className="text-xs text-body-muted mt-1.5">
                        From: <strong className="text-body-heading">{inq.name}</strong> (
                        <a href={`mailto:${inq.email}`} className="text-brand-primary hover:underline">
                          {inq.email}
                        </a>
                        ) • {inq.createdAt ? new Date(inq.createdAt).toLocaleString("en-SG") : "Recently"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {inq.status !== "in_progress" && (
                        <button
                          onClick={() => handleUpdateInquiryStatus(inq.ticketId, "in_progress")}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {inq.status !== "resolved" && (
                        <button
                          onClick={() => handleUpdateInquiryStatus(inq.ticketId, "resolved")}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition"
                        >
                          ✓ Mark Resolved
                        </button>
                      )}
                      {inq.status === "resolved" && (
                        <button
                          onClick={() => handleUpdateInquiryStatus(inq.ticketId, "open")}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-body-muted hover:bg-canvas-warm border border-brand-accent/30 transition"
                        >
                          Reopen Ticket
                        </button>
                      )}
                      <a
                        href={`mailto:${inq.email}?subject=Re:%20Inquiry%20%23${inq.ticketId}%20-%20Maharaja%20Agrasen%20Foundation`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 transition flex items-center gap-1"
                      >
                        ✉️ Reply via Email
                      </a>
                    </div>
                  </div>

                  <div className="bg-canvas-warm/40 border border-brand-accent/20 rounded-2xl p-4 text-xs text-body-heading leading-relaxed whitespace-pre-wrap">
                    {inq.message}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filter === "queue" ? (
          <div className="space-y-6">
            {/* Queue Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white border border-brand-accent/30 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-body-muted uppercase tracking-wider block">Total Enqueued</span>
                <span className="text-2xl font-black text-brand-primary">{queueStats?.total ?? 0}</span>
              </div>
              <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Delivered (Sent)</span>
                <span className="text-2xl font-black text-emerald-700">{queueStats?.sent ?? 0}</span>
              </div>
              <div className="p-4 bg-white border border-amber-200 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Pending / Queued</span>
                <span className="text-2xl font-black text-amber-700">{(queueStats?.pending ?? 0) + (queueStats?.processing ?? 0)}</span>
              </div>
              <div className="p-4 bg-white border border-red-200 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider block">Delivery Failed</span>
                <span className="text-2xl font-black text-red-700">{queueStats?.failed ?? 0}</span>
              </div>
            </div>

            {/* Queue Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-brand-accent/30 shadow-xs">
              <div>
                <h3 className="text-sm font-black text-brand-primary">Outbound Email Engine</h3>
                <p className="text-xs text-body-muted">Paced delivery at safe rate limit over IPv4 with automatic retry on Resend rate limits.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDrainQueue}
                  disabled={isDraining}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 shadow-xs transition flex items-center gap-1.5 min-h-[38px]"
                >
                  <span>⚡</span>
                  <span>{isDraining ? "Processing..." : "Drain Pending Now"}</span>
                </button>
                {queueStats && queueStats.failed > 0 && (
                  <button
                    type="button"
                    onClick={handleRetryFailedEmails}
                    disabled={isRetrying}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 shadow-xs transition flex items-center gap-1.5 min-h-[38px]"
                  >
                    <span>🔄</span>
                    <span>{isRetrying ? "Resetting..." : `Retry Failed (${queueStats.failed})`}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowOnlyFailedEmails(!showOnlyFailedEmails)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[38px] ${
                    showOnlyFailedEmails
                      ? "bg-red-700 text-white shadow-xs"
                      : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200"
                  }`}
                  title="Toggle displaying only failed queue items"
                >
                  <span>⚠️</span>
                  <span>Failed Only ({queueStats?.failed ?? 0})</span>
                </button>
                <button
                  type="button"
                  onClick={loadQueueStats}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-body-muted hover:bg-canvas-warm border border-brand-accent/30 transition min-h-[38px] flex items-center justify-center"
                  title="Refresh Queue Logs"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Queue Logs Table */}
            <div className="bg-white border-2 border-brand-accent/30 rounded-3xl overflow-hidden shadow-warm">
              <div className="p-4 bg-canvas-warm/40 border-b border-brand-accent/20 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-primary">
                  {showOnlyFailedEmails
                    ? `Delivery Failure Diagnostics (${queueLogs.filter((l) => l.status === "failed").length})`
                    : "Recent Email Activity Logs"}
                </h3>
                {showOnlyFailedEmails && (
                  <button
                    type="button"
                    onClick={() => setShowOnlyFailedEmails(false)}
                    className="text-xs text-brand-primary font-bold hover:underline"
                  >
                    Show All Logs
                  </button>
                )}
              </div>
              {displayedQueueLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-body-muted">
                  {showOnlyFailedEmails
                    ? "No delivery failures recorded in the queue."
                    : "No email queue logs recorded yet."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-canvas-warm/80 border-b border-brand-accent/30 text-body-heading font-bold">
                        <th className="py-2.5 px-3 min-w-[160px]">Recipient</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Subject</th>
                        <th className="py-2.5 px-3 min-w-[90px]">Status</th>
                        <th className="py-2.5 px-3 min-w-[70px]">Attempts</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Resend ID</th>
                        <th className="py-2.5 px-3 min-w-[240px]">Error Diagnostics</th>
                        <th className="py-2.5 px-3 min-w-[100px]">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-accent/15 text-body-text">
                      {displayedQueueLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-amber-50/40 transition">
                          <td className="py-2.5 px-3 font-mono font-medium text-brand-primary">
                            <div>{log.recipientEmail}</div>
                            {log.recipientName && (
                              <div className="text-[10px] text-body-muted font-sans">{log.recipientName}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px] truncate" title={log.subject}>
                            {log.subject}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.status === "sent"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : log.status === "failed"
                                  ? "bg-red-100 text-red-800 border border-red-300"
                                  : log.status === "processing"
                                  ? "bg-blue-100 text-blue-800 border border-blue-300 animate-pulse"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {log.attempts || 0}
                          </td>
                          <td className="py-2.5 px-3 max-w-[140px] font-mono text-[11px] truncate">
                            {log.resendId ? (
                              <span className="text-emerald-700" title={log.resendId}>
                                {log.resendId}
                              </span>
                            ) : (
                              <span className="text-body-muted italic">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px]">
                            {log.lastError ? (
                              <div className="space-y-1.5 max-w-[280px]">
                                <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-800 font-mono text-[11px] whitespace-pre-wrap break-words leading-tight">
                                  {log.lastError}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyError(log.lastError)}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-red-700 hover:text-red-900 bg-white border border-red-200 hover:bg-red-50 shadow-2xs transition inline-flex items-center gap-1 min-h-[24px]"
                                  title="Copy Error Details"
                                >
                                  <span>📋</span>
                                  <span>{copiedError === log.lastError ? "Copied!" : "Copy Details"}</span>
                                </button>
                              </div>
                            ) : log.status === "sent" ? (
                              <span className="text-emerald-700 font-medium text-[11px]">✓ Delivered cleanly</span>
                            ) : (
                              <span className="text-body-muted italic text-[11px]">No errors reported</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-body-muted text-[10px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                        #{h.members?.find((m: any) => m.relationToHead === "self")?.serialNo || h.serialNo || h.householdCode}
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

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {h.status === "pending_review" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(h.id)}
                          className="px-4 py-2 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-all shadow-xs min-h-[38px] flex items-center justify-center gap-1"
                        >
                          ✓ Approve Family
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(h.id)}
                          className="px-4 py-2 rounded-full text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all min-h-[38px] flex items-center justify-center gap-1"
                        >
                          ✕ Reject / Flag
                        </button>
                      </>
                    )}

                    {h.status === "live" && (
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center min-h-[38px]">
                          ✓ Approved (Live)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResendPasses(h.id)}
                          disabled={resendingId === h.id}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 shadow-xs transition-all flex items-center gap-1.5 min-h-[38px]"
                        >
                          <span>✉️</span>
                          <span>{resendingId === h.id ? "Enqueuing..." : "Resend ID Passes"}</span>
                        </button>

                        {/* Task 3: Admin Pass Direct Download */}
                        {(!h.members || h.members.length <= 1) ? (
                          <a
                            href={`/api/pass/pdf?memberId=${(h.members?.find((m) => m.relationToHead === "self") || h.members?.[0])?.id || ""}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 shadow-xs transition-all flex items-center gap-1.5 min-h-[38px]"
                            title="Direct Download ID Pass PDF"
                          >
                            <span>📥</span>
                            <span>Download Pass</span>
                          </a>
                        ) : (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setDownloadingHouseholdId(downloadingHouseholdId === h.id ? null : h.id)}
                              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 shadow-xs transition-all flex items-center gap-1.5 min-h-[38px]"
                            >
                              <span>📥</span>
                              <span>Download Pass ▾</span>
                            </button>
                            {downloadingHouseholdId === h.id && (
                              <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-1 w-full sm:w-64 bg-white rounded-2xl shadow-xl border border-brand-accent/30 p-2 z-20 animate-in fade-in zoom-in-95">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-body-muted px-2.5 py-1">
                                  Select Member Pass
                                </div>
                                <div className="max-h-56 overflow-y-auto space-y-1">
                                  {h.members.map((m) => (
                                    <a
                                      key={m.id}
                                      href={`/api/pass/pdf?memberId=${m.id}`}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => setDownloadingHouseholdId(null)}
                                      className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-amber-50 text-xs text-brand-primary font-medium transition min-h-[34px]"
                                    >
                                      <span className="truncate">
                                        {m.fullName} ({m.relationToHead === "self" ? "Head" : m.relationToHead})
                                      </span>
                                      <span className="text-[10px] font-bold text-body-muted shrink-0 ml-1">📥 PDF</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {h.status === "rejected" && (
                      <span className="text-xs font-bold text-red-800 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 flex items-center min-h-[38px]">
                        ✕ Rejected (Dispute Logged)
                      </span>
                    )}
                  </div>
                </div>

                {/* Task 4: Household Dispatch Warning / Error Banner */}
                {h.lastError && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span className="text-base shrink-0">⚠️</span>
                      <div className="min-w-0">
                        <span className="font-bold text-amber-900 block">Dispatch Warning</span>
                        <span className="font-mono text-[11px] text-amber-900 break-words block mt-0.5">
                          {h.lastError}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopyError(h.lastError!)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-white hover:bg-amber-100 border border-amber-300 shadow-xs transition flex items-center gap-1 min-h-[38px]"
                        title="Copy Error Details"
                      >
                        <span>📋</span>
                        <span>{copiedError === h.lastError ? "Copied!" : "Copy Details"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResendPasses(h.id)}
                        disabled={resendingId === h.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 shadow-xs transition flex items-center gap-1 min-h-[38px]"
                      >
                        <span>🔄</span>
                        <span>{resendingId === h.id ? "Retrying..." : "Retry Dispatch"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Family Members Breakdown */}
                {h.members && h.members.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-brand-accent/20">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                      Family Members ({h.members.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {h.members.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="p-3 rounded-2xl bg-canvas-warm/30 border border-brand-accent/20 flex items-start gap-3 text-xs"
                        >
                          {m.photoUrl ? (
                            <img
                              src={m.photoUrl}
                              alt={m.fullName}
                              className="w-10 h-10 rounded-full object-cover border border-brand-accent shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0">
                              {m.fullName?.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="font-bold text-brand-primary truncate">
                                {idx + 1}. {m.fullName}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                {m.serialNo && (
                                  <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-brand-accent/30 text-brand-primary">
                                    #{m.serialNo}
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded-full border border-brand-accent/30 text-body-muted capitalize">
                                  {m.relationToHead}
                                </span>
                                <a
                                  href={`/api/pass/pdf?memberId=${m.id}`}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-brand-primary bg-amber-50 hover:bg-amber-100 border border-brand-accent/40 shadow-xs transition flex items-center gap-1 min-h-[26px]"
                                  title={`Download Pass for ${m.fullName}`}
                                >
                                  <span>📥</span>
                                  <span>Pass</span>
                                </a>
                              </div>
                            </div>
                            <p className="text-[11px] text-body-heading mt-0.5">
                              {m.maritalStatus === "Married" &&
                              (m.gender === "Female" || m.relationToHead === "spouse")
                                ? `Father/Husband: ${m.fatherName || "N/A"}`
                                : `Father: ${m.fatherName || "N/A"}`}
                              {m.dob && ` • DOB: ${String(m.dob).split("T")[0]}`}
                            </p>
                            {(m.professionTitle || m.companyName || m.profession) && (
                              <p className="text-[11px] text-body-muted truncate mt-0.5">
                                💼 {m.professionTitle || m.profession}
                                {m.companyName ? ` at ${m.companyName}` : ""}
                              </p>
                            )}
                            {m.maritalStatus === "Married" && m.anniversaryDate && (
                              <p className="text-[11px] text-brand-gold mt-0.5">
                                💍 Anniversary: {String(m.anniversaryDate).split("T")[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
            <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-brand-accent/40 animate-in fade-in zoom-in-95">
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

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold text-body-muted hover:bg-canvas-warm min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectReason.trim()}
                  className="px-5 py-2 rounded-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all min-h-[38px]"
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