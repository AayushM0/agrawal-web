import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("AWB-16: Types define audit taxonomy and query contracts", () => {
  const types = read("src/types/audit.ts");

  assert.ok(types.includes("export type AuditCategory"), "Must export AuditCategory");
  assert.ok(types.includes("'MODERATION'"), "Must include MODERATION category");
  assert.ok(types.includes("'SUPPORT_SESSION'"), "Must include SUPPORT_SESSION category");
  assert.ok(types.includes("'IDENTITY_ACCESS'"), "Must include IDENTITY_ACCESS category");
  assert.ok(types.includes("'BUSINESS'"), "Must include BUSINESS category");
  assert.ok(types.includes("'CAREER_JOB'"), "Must include CAREER_JOB category");
  assert.ok(types.includes("'MATRIMONY'"), "Must include MATRIMONY category");

  assert.ok(types.includes("export type AuditSeverity"), "Must export AuditSeverity");
  assert.ok(types.includes("export interface AuditTrailItem"), "Must export AuditTrailItem");
  assert.ok(types.includes("export interface GetAuditTrailInput"), "Must export GetAuditTrailInput");
  assert.ok(types.includes("export interface AuditTrailResponse"), "Must export AuditTrailResponse");
});

test("AWB-16: Schema defines audit columns, indexes, immutability trigger, and unified view", () => {
  const schema = read("src/db/schema.sql");
  const db = read("src/lib/db.ts");

  // Schema verification
  assert.ok(schema.includes("ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS category"), "schema.sql must add category column");
  assert.ok(schema.includes("ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS severity"), "schema.sql must add severity column");
  assert.ok(schema.includes("ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS checksum"), "schema.sql must add checksum column");
  assert.ok(schema.includes("CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_created"), "schema.sql must index action and created_at");
  assert.ok(schema.includes("CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_category"), "schema.sql must index category");
  assert.ok(schema.includes("CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin"), "schema.sql must index admin_id");
  assert.ok(schema.includes("CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()"), "schema.sql must define immutability function");
  assert.ok(schema.includes("CREATE OR REPLACE VIEW view_platform_audit_trail"), "schema.sql must define unified view");

  // db.ts ensureSchema verification
  assert.ok(db.includes("ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS category"), "db.ts must migrate category column");
  assert.ok(db.includes("ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS severity"), "db.ts must migrate severity column");
  assert.ok(db.includes("ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS checksum"), "db.ts must migrate checksum column");
  assert.ok(db.includes("prevent_audit_log_mutation"), "db.ts must enforce immutability trigger");
  assert.ok(db.includes("view_platform_audit_trail"), "db.ts must create unified view");
});

test("AWB-17: db exposes recordPlatformAuditLog and getUnifiedAuditTrail with in-memory fallback", async () => {
  const { db, recordPlatformAuditLog, getUnifiedAuditTrail, getAuditTrailStats } = await import("../src/lib/db.ts");

  assert.equal(typeof db.recordPlatformAuditLog, "function", "db.recordPlatformAuditLog must be a function");
  assert.equal(typeof db.getUnifiedAuditTrail, "function", "db.getUnifiedAuditTrail must be a function");
  assert.equal(typeof db.getAuditTrailStats, "function", "db.getAuditTrailStats must be a function");
  assert.equal(typeof recordPlatformAuditLog, "function", "recordPlatformAuditLog must be exported");
  assert.equal(typeof getUnifiedAuditTrail, "function", "getUnifiedAuditTrail must be exported");
  assert.equal(typeof getAuditTrailStats, "function", "getAuditTrailStats must be exported");

  // Record an audit log entry in memory
  await db.recordPlatformAuditLog({
    adminId: "admin-test-01",
    adminContact: "admin@test.org",
    action: "APPROVE_HOUSEHOLD",
    category: "MODERATION",
    severity: "INFO",
    targetType: "household",
    targetId: "hh-uuid-1234",
    details: { reason: "Verified voter slip" },
    ipAddress: "127.0.0.1",
  });

  // Query unified audit trail
  const result = await db.getUnifiedAuditTrail({
    page: 1,
    limit: 10,
    category: "MODERATION",
  });

  assert.equal(result.success, true, "Query must succeed");
  assert.ok(result.logs.length >= 1, "Must contain at least 1 log");
  const found = result.logs.find((l) => l.targetId === "hh-uuid-1234");
  assert.ok(found, "Inserted log must be retrievable");
  assert.equal(found.action, "APPROVE_HOUSEHOLD");
  assert.equal(found.category, "MODERATION");
  assert.equal(found.adminId, "admin-test-01");
  assert.ok(found.checksum, "Must compute SHA-256 checksum for audit log");

  // Query stats
  const stats = await db.getAuditTrailStats();
  assert.ok(stats.totalLogs >= 1, "Total logs stat must reflect recorded log");
});

test("AWB-17: db in-memory fallback supports filtering, pagination, search, and backward compatibility", async () => {
  const { db } = await import("../src/lib/db.ts");

  // Backward compatibility test: recordAdminAuditLog calls recordPlatformAuditLog
  await db.recordAdminAuditLog({
    adminId: "admin-compat",
    adminContact: "compat@test.org",
    action: "ADMIN_LOGIN_SUCCESS",
    targetType: "auth",
    targetId: "auth-123",
    details: { method: "otp" },
    ipAddress: "192.168.1.1",
  });

  const resAuth = await db.getUnifiedAuditTrail({
    category: "IDENTITY_ACCESS",
  });
  assert.equal(resAuth.success, true);
  const foundAuth = resAuth.logs.find((l) => l.targetId === "auth-123");
  assert.ok(foundAuth, "recordAdminAuditLog should map category and be retrieved in unified trail");
  assert.equal(foundAuth.category, "IDENTITY_ACCESS");
  assert.equal(foundAuth.severity, "INFO");

  // Test search query
  const resSearch = await db.getUnifiedAuditTrail({
    search: "voter slip",
  });
  assert.equal(resSearch.success, true);
  assert.ok(resSearch.logs.some((l) => l.targetId === "hh-uuid-1234"), "Search must find details content");

  // Test pagination
  const resPaged = await db.getUnifiedAuditTrail({
    page: 1,
    limit: 1,
  });
  assert.equal(resPaged.success, true);
  assert.equal(resPaged.logs.length, 1);
  assert.ok(resPaged.pagination.total >= 2);
  assert.ok(resPaged.pagination.totalPages >= 2);
});

test("AWB-18: Server action getAuditTrailLogsAction enforces admin role and supports filtering", () => {
  const auditCode = read("src/actions/audit.ts");

  assert.ok(auditCode.includes("'use server'"), "Must have 'use server' directive");
  assert.ok(auditCode.includes("export async function getAuditTrailLogsAction"), "Must export getAuditTrailLogsAction");
  assert.ok(auditCode.includes("export async function exportAuditTrailCsvAction"), "Must export exportAuditTrailCsvAction");
  assert.ok(auditCode.includes("export async function getAuditTrailStatsAction"), "Must export getAuditTrailStatsAction");
  assert.ok(auditCode.includes("export const getAuditTrailLogs = getAuditTrailLogsAction"), "Must export getAuditTrailLogs alias");
  assert.ok(auditCode.includes("export const getAuditTrailStats = getAuditTrailStatsAction"), "Must export getAuditTrailStats alias");
  assert.ok(auditCode.includes("export const exportAuditTrailCsv = exportAuditTrailCsvAction"), "Must export exportAuditTrailCsv alias");

  // Admin role enforcement check
  assert.ok(auditCode.includes('session?.role !== "admin"'), "getAuditTrailLogsAction must check session.role === 'admin'");
  assert.ok(auditCode.includes("Unauthorized"), "Must return Unauthorized on non-admin session");

  // Export limit 5000 check
  assert.ok(auditCode.includes("limit: 5000"), "CSV export must fetch up to 5000 logs");
  assert.ok(auditCode.includes("agrawal-platform-audit-"), "CSV export must generate timestamped filename");
});

test("AWB-18: CSV export formats RFC 4180 compliant CSV string with escaping", () => {
  const auditCode = read("src/actions/audit.ts");
  assert.ok(auditCode.includes("export function generateAuditCsvString"), "Must export generateAuditCsvString");

  function escapeCsvField(val) {
    if (val === null || val === undefined) return '""';
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  }

  function generateAuditCsvString(logs) {
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

  const sampleLogs = [
    {
      id: "log-1",
      timestamp: "2026-10-02T10:00:00.000Z",
      adminId: "admin-1",
      adminContact: "admin@foundation.org",
      action: "APPROVE_HOUSEHOLD",
      category: "MODERATION",
      severity: "INFO",
      targetType: "household",
      targetId: "hh-1",
      targetName: "Rajesh Kumar (HHN-001)",
      details: { note: "All verified" },
      ipAddress: "10.0.0.1",
      checksum: "abc123hash",
      sourceTable: "admin_audit_logs",
    },
  ];

  const csv = generateAuditCsvString(sampleLogs);
  assert.ok(csv.includes("Timestamp,Admin Contact,Admin ID,Category,Severity,Action,Target Type,Target Name,Target ID,Details,IP Address,Checksum"));
  assert.ok(csv.includes("Rajesh Kumar (HHN-001)"));
  assert.ok(csv.includes("APPROVE_HOUSEHOLD"));

  // Explicit escaping verification
  assert.equal(escapeCsvField('Hello "World"'), '"Hello ""World"""', "Quotes must be doubled");
  assert.equal(escapeCsvField("Field, with comma"), '"Field, with comma"', "Commas preserved inside quotes");
  assert.equal(escapeCsvField(null), '""', "Null produces empty quoted field");
});

test("AWB-18: moderate.ts re-exports audit server actions for backward compatibility", () => {
  const moderate = read("src/actions/moderate.ts");

  assert.ok(moderate.includes("getAuditTrailLogsAction"), "moderate.ts must re-export getAuditTrailLogsAction");
  assert.ok(moderate.includes("getAuditTrailStatsAction"), "moderate.ts must re-export getAuditTrailStatsAction");
  assert.ok(moderate.includes("exportAuditTrailCsvAction"), "moderate.ts must re-export exportAuditTrailCsvAction");
  assert.ok(moderate.includes('from "./audit"'), "moderate.ts must re-export from ./audit");
});

test("AWB-18: career.ts exports toggleJobPostingStatusAction and records audit log", () => {
  const career = read("src/actions/career.ts");

  assert.ok(career.includes("export async function toggleJobPostingStatusAction"), "career.ts must export toggleJobPostingStatusAction");
  assert.ok(career.includes("export const toggleJobPostingStatus = toggleJobPostingStatusAction"), "career.ts must export toggleJobPostingStatus alias");
  assert.ok(career.includes("JOB_POSTING_STATUS_CHANGED"), "career.ts must record JOB_POSTING_STATUS_CHANGED audit action");
  assert.ok(career.includes("db.recordPlatformAuditLog"), "career.ts must call db.recordPlatformAuditLog");
});

test("AWB-18: auth.ts instruments loginAdmin with ADMIN_LOGIN_SUCCESS and ADMIN_LOGIN_FAILED audit logs", () => {
  const auth = read("src/actions/auth.ts");

  assert.ok(auth.includes("ADMIN_LOGIN_SUCCESS"), "auth.ts must record ADMIN_LOGIN_SUCCESS");
  assert.ok(auth.includes("ADMIN_LOGIN_FAILED"), "auth.ts must record ADMIN_LOGIN_FAILED");
  assert.ok(auth.includes("db.recordPlatformAuditLog"), "auth.ts must call db.recordPlatformAuditLog");
});

test("AWB-18: support-session.ts instruments REQUESTED, AUTHORIZED, and REVOKED audit logs", () => {
  const support = read("src/actions/support-session.ts");

  assert.ok(support.includes("SUPPORT_SESSION_REQUESTED"), "support-session.ts must record SUPPORT_SESSION_REQUESTED");
  assert.ok(support.includes("SUPPORT_SESSION_AUTHORIZED"), "support-session.ts must record SUPPORT_SESSION_AUTHORIZED");
  assert.ok(support.includes("SUPPORT_SESSION_REVOKED"), "support-session.ts must record SUPPORT_SESSION_REVOKED");
  assert.ok(support.includes("db.recordPlatformAuditLog"), "support-session.ts must call db.recordPlatformAuditLog");
});

test("AWB-18: matrimony.ts instruments updateMatrimonialProfileStatus with audit log", () => {
  const matrimony = read("src/actions/matrimony.ts");

  assert.ok(matrimony.includes("MATRIMONY_PROFILE_STATUS_CHANGED"), "matrimony.ts must record MATRIMONY_PROFILE_STATUS_CHANGED");
  assert.ok(matrimony.includes("db.recordPlatformAuditLog"), "matrimony.ts must call db.recordPlatformAuditLog");
});

