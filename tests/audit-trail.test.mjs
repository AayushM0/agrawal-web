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
