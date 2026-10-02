import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Issue 052: Database schema defines admin_support_sessions, admin_support_audit_logs, and RLS", () => {
  const schema = read("src/db/schema.sql");
  const db = read("src/lib/db.ts");

  // Schema table definitions
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS admin_support_sessions"), "schema.sql must define admin_support_sessions");
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS admin_support_audit_logs"), "schema.sql must define admin_support_audit_logs");

  // Columns for admin_support_sessions
  assert.ok(schema.includes("otp_hash TEXT NOT NULL"), "admin_support_sessions must have otp_hash");
  assert.ok(schema.includes("otp_expires_at TIMESTAMPTZ NOT NULL"), "admin_support_sessions must have otp_expires_at");
  assert.ok(schema.includes("otp_attempts INT DEFAULT 0"), "admin_support_sessions must have otp_attempts");
  assert.ok(schema.includes("status VARCHAR(32) NOT NULL DEFAULT 'pending'"), "admin_support_sessions must have status default pending");
  assert.ok(schema.includes("authorized_at TIMESTAMPTZ"), "admin_support_sessions must have authorized_at");
  assert.ok(schema.includes("expires_at TIMESTAMPTZ"), "admin_support_sessions must have expires_at");
  assert.ok(schema.includes("reason TEXT NOT NULL"), "admin_support_sessions must have reason");

  // Foreign keys and cascade rules
  assert.ok(schema.includes("REFERENCES households(id) ON DELETE CASCADE"), "admin_support_sessions must reference households ON DELETE CASCADE");
  assert.ok(schema.includes("REFERENCES members(id) ON DELETE CASCADE"), "admin_support_sessions must reference members ON DELETE CASCADE");
  assert.ok(schema.includes("REFERENCES admin_support_sessions(id) ON DELETE CASCADE"), "admin_support_audit_logs must reference admin_support_sessions ON DELETE CASCADE");

  // Columns for admin_support_audit_logs
  assert.ok(schema.includes("changes JSONB NOT NULL"), "admin_support_audit_logs must have changes JSONB NOT NULL");

  // Indexes
  assert.ok(schema.includes("CREATE INDEX IF NOT EXISTS idx_admin_support_sessions_lookup ON admin_support_sessions(household_id, status, expires_at);"), "lookup index must be defined");
  assert.ok(schema.includes("CREATE INDEX IF NOT EXISTS idx_admin_support_audit_logs_session ON admin_support_audit_logs(session_id);"), "audit log index must be defined");

  // RLS hardening
  assert.ok(schema.includes("ALTER TABLE admin_support_sessions ENABLE ROW LEVEL SECURITY;"), "schema.sql must enable RLS on admin_support_sessions");
  assert.ok(schema.includes("ALTER TABLE admin_support_audit_logs ENABLE ROW LEVEL SECURITY;"), "schema.sql must enable RLS on admin_support_audit_logs");
  assert.ok(db.includes("ALTER TABLE admin_support_sessions ENABLE ROW LEVEL SECURITY;"), "db.ts ensureSchema must enable RLS on admin_support_sessions");
  assert.ok(db.includes("ALTER TABLE admin_support_audit_logs ENABLE ROW LEVEL SECURITY;"), "db.ts ensureSchema must enable RLS on admin_support_audit_logs");
});

test("Issue 052: TypeScript interfaces exported in support-session.ts", () => {
  const types = read("src/types/support-session.ts");

  assert.ok(types.includes("export type SupportSessionStatus"), "Must export SupportSessionStatus");
  assert.ok(types.includes("export interface AdminSupportSession"), "Must export AdminSupportSession");
  assert.ok(types.includes("export interface AdminSupportAuditLog"), "Must export AdminSupportAuditLog");
  assert.ok(types.includes("export interface CreateSupportSessionInput"), "Must export CreateSupportSessionInput");
  assert.ok(types.includes("export interface UpdateSupportSessionInput"), "Must export UpdateSupportSessionInput");
  assert.ok(types.includes("export interface RecordSupportAuditLogInput"), "Must export RecordSupportAuditLogInput");
});

test("Issue 052: Database helper methods implemented in db.ts with idempotent ensureSchema and dual fallback", () => {
  const db = read("src/lib/db.ts");

  // Required methods on db object
  assert.ok(db.includes("async createSupportSession("), "db.ts must implement createSupportSession");
  assert.ok(db.includes("async getSupportSessionById("), "db.ts must implement getSupportSessionById");
  assert.ok(db.includes("async getActiveSupportSession("), "db.ts must implement getActiveSupportSession");
  assert.ok(db.includes("async updateSupportSessionStatus("), "db.ts must implement updateSupportSessionStatus");
  assert.ok(db.includes("async recordSupportAuditLog("), "db.ts must implement recordSupportAuditLog");
  assert.ok(db.includes("async getSupportAuditLogsBySession("), "db.ts must implement getSupportAuditLogsBySession");

  // In-memory dual fallback structures
  assert.ok(db.includes("__memorySupportSessions"), "db.ts must provide in-memory store for support sessions");
  assert.ok(db.includes("__memorySupportAuditLogs"), "db.ts must provide in-memory store for support audit logs");

  // SQL query constructs
  assert.ok(db.includes("INSERT INTO admin_support_sessions"), "db.ts must insert into admin_support_sessions");
  assert.ok(db.includes("INSERT INTO admin_support_audit_logs"), "db.ts must insert into admin_support_audit_logs");
  assert.ok(db.includes("UPDATE admin_support_sessions"), "db.ts must update admin_support_sessions");
  assert.ok(db.includes("SELECT * FROM admin_support_sessions"), "db.ts must select from admin_support_sessions");
  assert.ok(db.includes("SELECT * FROM admin_support_audit_logs"), "db.ts must select from admin_support_audit_logs");

  // Mapper functions
  assert.ok(db.includes("function mapSupportSessionRow"), "db.ts must include mapSupportSessionRow");
  assert.ok(db.includes("function mapSupportAuditLogRow"), "db.ts must include mapSupportAuditLogRow");

  // Named exports for convenient consumption
  assert.ok(db.includes("export const createSupportSession = db.createSupportSession;"), "db.ts must export createSupportSession");
  assert.ok(db.includes("export const getActiveSupportSession = db.getActiveSupportSession;"), "db.ts must export getActiveSupportSession");
  assert.ok(db.includes("export const updateSupportSessionStatus = db.updateSupportSessionStatus;"), "db.ts must export updateSupportSessionStatus");
  assert.ok(db.includes("export const recordSupportAuditLog = db.recordSupportAuditLog;"), "db.ts must export recordSupportAuditLog");
  assert.ok(db.includes("export const getSupportAuditLogsBySession = db.getSupportAuditLogsBySession;"), "db.ts must export getSupportAuditLogsBySession");
});

test("Issue 052: Server Actions and authorization engine implemented in support-session.ts", () => {
  const actionsCode = read("src/actions/support-session.ts");

  // Server action directive
  assert.ok(actionsCode.includes("'use server'"), "Must have 'use server' directive");

  // Exported actions
  assert.ok(actionsCode.includes("export async function requestAdminSupportSession"), "Must export requestAdminSupportSession");
  assert.ok(actionsCode.includes("export async function verifyAdminSupportSession"), "Must export verifyAdminSupportSession");
  assert.ok(actionsCode.includes("export async function getActiveSupportSessionAction"), "Must export getActiveSupportSessionAction");
  assert.ok(actionsCode.includes("export async function adminCorrectMemberDetailsAction"), "Must export adminCorrectMemberDetailsAction");
  assert.ok(actionsCode.includes("export async function revokeAdminSupportSessionAction"), "Must export revokeAdminSupportSessionAction");
  assert.ok(actionsCode.includes("export async function getSupportAuditLogsAction"), "Must export getSupportAuditLogsAction");

  // Aliases for developer convenience
  assert.ok(actionsCode.includes("export const getActiveSupportSession = getActiveSupportSessionAction"), "Must export getActiveSupportSession alias");
  assert.ok(actionsCode.includes("export const adminCorrectMemberDetails = adminCorrectMemberDetailsAction"), "Must export adminCorrectMemberDetails alias");
  assert.ok(actionsCode.includes("export const revokeAdminSupportSession = revokeAdminSupportSessionAction"), "Must export revokeAdminSupportSession alias");
  assert.ok(actionsCode.includes("export const getSupportAuditLogs = getSupportAuditLogsAction"), "Must export getSupportAuditLogs alias");

  // Security & cryptographic guards
  assert.ok(actionsCode.includes("AUTH_SECRET"), "Must use AUTH_SECRET for HMAC-SHA256 OTP hashing");
  assert.ok(actionsCode.includes("crypto.timingSafeEqual"), "Must use timingSafeEqual for OTP verification");
  assert.ok(actionsCode.includes("session.role !== \"admin\""), "Must enforce admin role authorization");
  assert.ok(actionsCode.includes("15 * 60 * 1000"), "Must set 15 minute OTP expiration");
  assert.ok(actionsCode.includes("24 * 60 * 60 * 1000"), "Must set 24 hour session window");

  // Audit logging and validation
  assert.ok(actionsCode.includes("recordSupportAuditLog"), "Must invoke db.recordSupportAuditLog");
  assert.ok(actionsCode.includes("gotras.find"), "Must validate gotra against 18 recognized Gotras");
  assert.ok(actionsCode.includes("enqueueEmail"), "Must queue authorization email to member/head");
});

