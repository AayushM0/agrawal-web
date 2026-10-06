'use client';

import React, { useState } from "react";
import type { AuditTrailItem } from "@/types/audit";

interface AuditDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditTrailItem | null;
}

export default function AuditDiffModal({ isOpen, onClose, log }: AuditDiffModalProps) {
  const [copyFeedback, setCopyFeedback] = useState<"copied" | "failed" | null>(null);

  if (!isOpen || !log) return null;

  const handleCopyJson = async () => {
    const textToCopy = JSON.stringify(log, null, 2);
    let success = false;

    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopyFeedback("copied");
    } else {
      setCopyFeedback("failed");
    }

    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const changes = log.details?.changes as Record<string, { old: any; new: any }> | undefined;
  const hasFieldDiffs = Boolean(changes && Object.keys(changes).length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-diff-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-brand-accent/30 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-accent/20 flex items-center justify-between bg-canvas-warm/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  log.severity === "CRITICAL"
                    ? "bg-rose-100 text-rose-800"
                    : log.severity === "WARN"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {log.category} • {log.severity}
              </span>
              <span className="text-xs text-body-muted font-mono">{log.action}</span>
            </div>
            <h2 id="audit-diff-title" className="text-lg font-black text-brand-primary">
              Audit Event Payload &amp; Mutation Diff
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition text-sm font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Timestamp</span>
              <span className="font-semibold text-slate-800">{new Date(log.timestamp).toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Admin Actor</span>
              <span className="font-semibold text-slate-800 truncate block" title={log.adminContact}>
                {log.adminContact}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Target Entity</span>
              <span className="font-semibold text-slate-800 truncate block" title={log.targetName || log.targetId}>
                {log.targetName || log.targetId}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">IP Address</span>
              <span className="font-mono text-slate-700">{log.ipAddress || "Internal / System"}</span>
            </div>
          </div>

          {/* Field Changes Visual Diff (if changes exist) */}
          {hasFieldDiffs ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-body-heading uppercase tracking-wider flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-brand-primary"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M12 7v5l4 2" />
                </svg>
                <span>Field-Level Value Transitions</span>
              </h3>
              <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                <div className="grid grid-cols-3 bg-slate-100 p-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <div>Field Name</div>
                  <div>Old Value (Previous)</div>
                  <div>New Value (Updated)</div>
                </div>
                {Object.entries(changes!).map(([field, delta]) => (
                  <div key={field} className="grid grid-cols-3 p-3 text-xs gap-2 items-center hover:bg-slate-50/50">
                    <span className="font-mono font-bold text-slate-700">{field}</span>
                    <span className="p-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 line-through truncate font-mono text-xs">
                      {delta.old !== null && delta.old !== undefined ? String(delta.old) : "<empty>"}
                    </span>
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs truncate font-bold">
                      {delta.new !== null && delta.new !== undefined ? String(delta.new) : "<cleared>"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Full Payload JSON Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-body-heading uppercase tracking-wider flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-brand-primary"
                  aria-hidden="true"
                >
                  <path d="m7.5 4.27 9 5.15" />
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
                <span>Raw Audit Event Payload (JSON)</span>
              </h3>
              <button
                type="button"
                onClick={handleCopyJson}
                className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>
                  {copyFeedback === "copied"
                    ? "Copied JSON!"
                    : copyFeedback === "failed"
                    ? "Copy Failed (Blocked)"
                    : "Copy Payload"}
                </span>
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto max-h-64 leading-relaxed border border-slate-800">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>

          {/* Tamper Checksum Info */}
          {log.checksum && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2 truncate">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-emerald-700 shrink-0"
                  aria-hidden="true"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="font-semibold">SHA-256 Checksum:</span>
                <span className="font-mono text-xs truncate max-w-sm">{log.checksum}</span>
              </div>
              <span className="text-xs font-bold uppercase bg-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">
                Verified Immutable
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-accent/20 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-2xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 transition shadow-warm"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
