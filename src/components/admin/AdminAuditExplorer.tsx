'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
  getAuditTrailLogsAction,
  getAuditTrailStatsAction,
  exportAuditTrailCsvAction,
} from "@/actions/audit";
import type {
  AuditTrailItem,
  AuditCategory,
  AuditSeverity,
  AuditTrailStats,
} from "@/types/audit";
import AuditDiffModal from "@/components/admin/AuditDiffModal";

const CATEGORIES: { label: string; value: AuditCategory | "ALL" }[] = [
  { label: "All Categories", value: "ALL" },
  { label: "Moderation", value: "MODERATION" },
  { label: "Support Sessions", value: "SUPPORT_SESSION" },
  { label: "Auth & Identity", value: "IDENTITY_ACCESS" },
  { label: "Businesses", value: "BUSINESS" },
  { label: "Careers & Jobs", value: "CAREER_JOB" },
  { label: "Matrimony", value: "MATRIMONY" },
  { label: "Communication", value: "COMMUNICATION" },
];

export default function AdminAuditExplorer({ initialCategory = "ALL" }: { initialCategory?: string }) {
  const [logs, setLogs] = useState<AuditTrailItem[]>([]);
  const [stats, setStats] = useState<AuditTrailStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Filters state
  const [category, setCategory] = useState<AuditCategory | "ALL">(
    (initialCategory as AuditCategory) || "ALL"
  );
  const [severity, setSeverity] = useState<AuditSeverity | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "7d" | "30d">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal inspection state
  const [activeLog, setActiveLog] = useState<AuditTrailItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const calculateDateBounds = useCallback(() => {
    if (dateRange === "all") return {};
    const now = new Date();
    if (dateRange === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { dateFrom: startOfDay };
    }
    if (dateRange === "7d") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { dateFrom: past };
    }
    if (dateRange === "30d") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { dateFrom: past };
    }
    return {};
  }, [dateRange]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const dateBounds = calculateDateBounds();
    const [logsRes, statsRes] = await Promise.all([
      getAuditTrailLogsAction({
        page,
        limit,
        category,
        severity,
        search: searchTerm.trim() || undefined,
        ...dateBounds,
      }),
      getAuditTrailStatsAction(),
    ]);

    if (logsRes.success) {
      setLogs(logsRes.logs);
      setTotal(logsRes.pagination.total);
      setTotalPages(logsRes.pagination.totalPages);
    } else {
      setStatusMessage(logsRes.error || "Failed to load audit logs.");
    }

    if (statsRes.success && statsRes.stats) {
      setStats(statsRes.stats);
    }
    setIsLoading(false);
  }, [page, limit, category, severity, searchTerm, calculateDateBounds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    const dateBounds = calculateDateBounds();
    const res = await exportAuditTrailCsvAction({
      category,
      severity,
      search: searchTerm.trim() || undefined,
      ...dateBounds,
    });
    setIsExporting(false);

    if (res.success && res.csv) {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", res.filename || "audit-trail.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage("Audit trail CSV export downloaded successfully.");
      setTimeout(() => setStatusMessage(""), 4000);
    } else {
      setStatusMessage(res.error || "Failed to export audit logs.");
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  const handleInspect = (log: AuditTrailItem) => {
    setActiveLog(log);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {statusMessage && (
        <div className="p-3.5 bg-brand-primary text-white text-xs font-bold rounded-2xl shadow-warm flex items-center justify-between animate-in fade-in">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage("")} className="text-white/80 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-brand-accent/30 shadow-2xs">
          <span className="text-xs font-bold text-body-muted uppercase tracking-wider block">Total Platform Logs</span>
          <span className="text-2xl font-black text-brand-primary mt-1 block">{stats?.totalLogs ?? total}</span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-brand-accent/30 shadow-2xs">
          <span className="text-xs font-bold text-body-muted uppercase tracking-wider block">Last 24 Hours</span>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">{stats?.logsToday ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-brand-accent/30 shadow-2xs">
          <span className="text-xs font-bold text-body-muted uppercase tracking-wider block">Critical Mutations</span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">{stats?.criticalEventsCount ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-brand-accent/30 shadow-2xs">
          <span className="text-xs font-bold text-body-muted uppercase tracking-wider block">Active Admin Actors</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{stats?.activeAdminsCount ?? 1}</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-5 rounded-3xl border border-brand-accent/30 shadow-xs space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setCategory(c.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                category === c.value
                  ? "bg-brand-primary text-white shadow-xs"
                  : "bg-slate-100 text-body-muted hover:bg-canvas-warm"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Inputs & Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-body-muted text-xs">
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
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by action, admin, entity name, ID, or payload details..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-body-heading placeholder:text-body-muted focus:ring-2 focus:ring-brand-primary/30 outline-hidden"
              />
            </div>

            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as any);
                setPage(1);
              }}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-hidden"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warnings</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as any);
                setPage(1);
              }}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-hidden"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              title="Export filtered records to CSV"
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-2xl text-xs font-bold text-brand-primary bg-white hover:bg-canvas-warm border border-brand-accent/30 transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="bg-white rounded-3xl border border-brand-accent/30 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-body-heading border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-brand-accent/20 text-slate-500 font-bold uppercase tracking-wider text-xs">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin Actor</th>
                <th className="py-3 px-4">Action &amp; Category</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-body-muted text-xs">
                    <span className="inline-block animate-spin mr-2">🔄</span>
                    Loading platform audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-body-muted text-xs">
                    No audit records found matching the specified filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 block">
                        {new Date(log.timestamp).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-body-muted font-mono">
                        {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </td>

                    {/* Admin Actor */}
                    <td className="py-3.5 px-4 max-w-[160px] truncate">
                      <span className="font-bold text-brand-primary block truncate" title={log.adminContact}>
                        {log.adminContact}
                      </span>
                      <span className="text-xs text-slate-400 font-mono truncate block" title={log.adminId}>
                        {log.adminId}
                      </span>
                    </td>

                    {/* Action & Category */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            log.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-800"
                              : log.severity === "WARN"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {log.category}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-800 block">
                        {log.action}
                      </span>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="font-bold text-slate-800 block truncate" title={log.targetName || log.targetId}>
                        {log.targetName || log.targetId}
                      </span>
                      <span className="text-xs text-slate-400 uppercase tracking-wider block">
                        {log.targetType}
                      </span>
                    </td>

                    {/* IP Address */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                      {log.ipAddress || "System"}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleInspect(log)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-brand-primary bg-canvas-warm hover:bg-brand-accent/20 border border-brand-accent/30 transition shadow-2xs"
                      >
                        Inspect Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-brand-accent/20 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-body-muted">
            Showing <span className="font-bold text-slate-800">{logs.length}</span> of{" "}
            <span className="font-bold text-slate-800">{total}</span> total events
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="py-1 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1 rounded-xl font-bold bg-white border border-slate-200 disabled:opacity-40 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              Previous
            </button>
            <span className="font-bold text-slate-700 px-1">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="px-3 py-1 rounded-xl font-bold bg-white border border-slate-200 disabled:opacity-40 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal Drawer */}
      <AuditDiffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        log={activeLog}
      />
    </div>
  );
}
