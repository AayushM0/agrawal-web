'use server';

import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import type {
  GetAuditTrailInput,
  AuditTrailResponse,
  AuditTrailStats,
  AuditTrailItem,
} from "@/types/audit";

export async function getAuditTrailLogsAction(
  params: GetAuditTrailInput = {}
): Promise<AuditTrailResponse> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return {
      success: false,
      logs: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
      error: "Unauthorized: Administrator privileges are required to inspect the platform audit trail.",
    };
  }

  try {
    return await db.getUnifiedAuditTrail(params);
  } catch (err: any) {
    console.error("[ACTION ERROR] getAuditTrailLogsAction:", err);
    return {
      success: false,
      logs: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
      error: err?.message || "Failed to load audit logs.",
    };
  }
}

export async function getAuditTrailStatsAction(): Promise<{
  success: boolean;
  stats?: AuditTrailStats;
  error?: string;
}> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }

  try {
    const stats = await db.getAuditTrailStats();
    return { success: true, stats };
  } catch (err: any) {
    console.error("[ACTION ERROR] getAuditTrailStatsAction:", err);
    return { success: false, error: err?.message || "Failed to load audit statistics." };
  }
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

// export function generateAuditCsvString
export async function generateAuditCsvString(logs: AuditTrailItem[]): Promise<string> {
  const headers = [
    "Timestamp",
    "Admin Contact",
    "Admin ID",
    "Category",
    "Severity",
    "Action",
    "Target Type",
    "Target Name",
    "Target ID",
    "Details",
    "IP Address",
    "Checksum",
  ];

  const rows = logs.map((log) => [
    escapeCsvField(log.timestamp),
    escapeCsvField(log.adminContact),
    escapeCsvField(log.adminId),
    escapeCsvField(log.category),
    escapeCsvField(log.severity),
    escapeCsvField(log.action),
    escapeCsvField(log.targetType),
    escapeCsvField(log.targetName || log.targetId),
    escapeCsvField(log.targetId),
    escapeCsvField(log.details),
    escapeCsvField(log.ipAddress || ""),
    escapeCsvField(log.checksum || ""),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

export async function exportAuditTrailCsvAction(
  params: Omit<GetAuditTrailInput, "page" | "limit"> = {}
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }

  try {
    // Export up to 5,000 logs matching the criteria
    const result = await db.getUnifiedAuditTrail({ ...params, page: 1, limit: 5000 });
    if (!result.success) {
      return { success: false, error: result.error || "Failed to fetch logs for export." };
    }

    const csv = await generateAuditCsvString(result.logs);
    const dateStamp = new Date().toISOString().split("T")[0];
    const filename = `agrawal-platform-audit-${dateStamp}.csv`;

    return { success: true, csv, filename };
  } catch (err: any) {
    console.error("[ACTION ERROR] exportAuditTrailCsvAction:", err);
    return { success: false, error: err?.message || "Failed to export audit logs." };
  }
}

// Ergonomic aliases
export const getAuditTrailLogs = getAuditTrailLogsAction;
export const getAuditTrailStats = getAuditTrailStatsAction;
export const exportAuditTrailCsv = exportAuditTrailCsvAction;
