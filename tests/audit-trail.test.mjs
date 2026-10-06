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

