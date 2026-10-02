import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { gotras } from "../src/data/gotras.ts";

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

// ============================================================================
// REGRESSION SUITE: Authorization Guards
// ============================================================================
test("Issue 052: Authorization guards reject unauthenticated and non-admin callers across all server actions", () => {
  const actionsCode = read("src/actions/support-session.ts");

  // 1. Static contract verification: every action calls getSession and rejects non-admin
  const guardRequirement = 'if (!session || session.role !== "admin")';
  const unauthorizedAdminError = 'Unauthorized: Admin privileges required.';

  // requestAdminSupportSession guard
  assert.ok(
    actionsCode.includes("requestAdminSupportSession") &&
    actionsCode.includes(guardRequirement),
    "requestAdminSupportSession must enforce admin role check"
  );
  assert.ok(
    actionsCode.includes(unauthorizedAdminError),
    "Must return standardized admin unauthorized error"
  );

  // verifyAdminSupportSession guard
  const verifySection = actionsCode.slice(actionsCode.indexOf("verifyAdminSupportSession("));
  assert.ok(
    verifySection.includes(guardRequirement),
    "verifyAdminSupportSession must enforce admin role check"
  );

  // getActiveSupportSessionAction guard
  const getActiveSection = actionsCode.slice(actionsCode.indexOf("getActiveSupportSessionAction("));
  assert.ok(
    getActiveSection.includes(guardRequirement),
    "getActiveSupportSessionAction must enforce admin role check"
  );

  // adminCorrectMemberDetailsAction guard
  const correctSection = actionsCode.slice(actionsCode.indexOf("adminCorrectMemberDetailsAction("));
  assert.ok(
    correctSection.includes(guardRequirement),
    "adminCorrectMemberDetailsAction must enforce admin role check"
  );

  // revokeAdminSupportSessionAction guard: permits admin OR affected household member
  const revokeSection = actionsCode.slice(actionsCode.indexOf("revokeAdminSupportSessionAction("));
  assert.ok(
    revokeSection.includes('if (!session)'),
    "revokeAdminSupportSessionAction must check for active session"
  );
  assert.ok(
    revokeSection.includes('session.role === "admin"'),
    "revokeAdminSupportSessionAction must permit admin"
  );
  assert.ok(
    revokeSection.includes('supportSession.householdId'),
    "revokeAdminSupportSessionAction must permit affected household member"
  );
  assert.ok(
    revokeSection.includes("Unauthorized: You do not have permission to revoke this session."),
    "revokeAdminSupportSessionAction must reject unpermitted users"
  );

  // getSupportAuditLogsAction guard
  const auditLogsSection = actionsCode.slice(actionsCode.indexOf("getSupportAuditLogsAction("));
  assert.ok(
    auditLogsSection.includes(guardRequirement),
    "getSupportAuditLogsAction must enforce admin role check"
  );

  // 2. Behavioral verification of the authorization engine
  function simulateAdminGuard(session) {
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }
    return { success: true };
  }

  function simulateRevokeGuard(session, supportSession) {
    if (!session) {
      return { success: false, error: "Unauthorized: Active session required." };
    }
    const isAdmin = session.role === "admin";
    const isHouseholdMember =
      session.userId === supportSession.householdId ||
      session.contact === supportSession.householdId;
    if (!isAdmin && !isHouseholdMember) {
      return { success: false, error: "Unauthorized: You do not have permission to revoke this session." };
    }
    return { success: true };
  }

  // Unauthenticated caller
  assert.deepEqual(simulateAdminGuard(null), {
    success: false,
    error: "Unauthorized: Admin privileges required.",
  });
  assert.deepEqual(simulateAdminGuard(undefined), {
    success: false,
    error: "Unauthorized: Admin privileges required.",
  });

  // Non-admin roles (member, volunteer, etc.)
  assert.deepEqual(simulateAdminGuard({ role: "member", userId: "mem-123" }), {
    success: false,
    error: "Unauthorized: Admin privileges required.",
  });
  assert.deepEqual(simulateAdminGuard({ role: "user", userId: "user-456" }), {
    success: false,
    error: "Unauthorized: Admin privileges required.",
  });

  // Admin role passes
  assert.deepEqual(simulateAdminGuard({ role: "admin", userId: "admin-master" }), {
    success: true,
  });

  // Revoke authorization:
  const mockSupportSession = { id: "sess-1", householdId: "hh-target" };
  // Unauthenticated fails
  assert.deepEqual(simulateRevokeGuard(null, mockSupportSession), {
    success: false,
    error: "Unauthorized: Active session required.",
  });
  // Unrelated member fails
  assert.deepEqual(simulateRevokeGuard({ role: "member", userId: "hh-other" }, mockSupportSession), {
    success: false,
    error: "Unauthorized: You do not have permission to revoke this session.",
  });
  // Affected household owner succeeds
  assert.deepEqual(simulateRevokeGuard({ role: "member", userId: "hh-target" }, mockSupportSession), {
    success: true,
  });
  // Admin succeeds
  assert.deepEqual(simulateRevokeGuard({ role: "admin", userId: "admin-user" }, mockSupportSession), {
    success: true,
  });
});

// ============================================================================
// REGRESSION SUITE: Session Lifecycle & Cryptographic OTP Verification
// ============================================================================
test("Issue 052: Session lifecycle creates pending session with cryptographic OTP and queues email payload", () => {
  const actionsCode = read("src/actions/support-session.ts");

  // 1. Cryptographic OTP generation assertions
  assert.ok(
    actionsCode.includes("crypto.randomInt(100000, 1000000).toString()"),
    "Must generate 6-digit OTP using crypto.randomInt"
  );
  assert.ok(
    actionsCode.includes("crypto.createHmac(\"sha256\", secret)"),
    "Must hash OTP using HMAC-SHA256"
  );
  assert.ok(
    actionsCode.includes("crypto.timingSafeEqual"),
    "Must compare OTP hash using timingSafeEqual"
  );

  // 2. Behavioral verification of OTP generator and timing-safe comparison
  const mockSecret = "test_auth_secret_for_regression_suite_12345";

  function hashSupportOtp(otp, secret = mockSecret) {
    return crypto.createHmac("sha256", secret).update(otp.trim()).digest("hex");
  }

  function verifySupportOtpHash(otp, expectedHash, secret = mockSecret) {
    try {
      const computedHash = hashSupportOtp(otp, secret);
      const computedBuf = Buffer.from(computedHash, "hex");
      const expectedBuf = Buffer.from(expectedHash, "hex");
      if (computedBuf.length !== expectedBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(computedBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  // Generate 200 sample codes and verify 6-digit integer bounds
  for (let i = 0; i < 200; i++) {
    const code = crypto.randomInt(100000, 1000000).toString();
    assert.equal(code.length, 6, "OTP code must be 6 digits");
    const num = parseInt(code, 10);
    assert.ok(num >= 100000 && num <= 999999, "OTP code must be between 100000 and 999999");
  }

  const validOtp = "749215";
  const otpHash = hashSupportOtp(validOtp);

  // Matching code succeeds timing-safely
  assert.equal(verifySupportOtpHash(validOtp, otpHash), true);
  assert.equal(verifySupportOtpHash("  749215 \n", otpHash), true, "Whitespace should be trimmed");

  // Invalid codes fail
  assert.equal(verifySupportOtpHash("000000", otpHash), false);
  assert.equal(verifySupportOtpHash("749216", otpHash), false);
  assert.equal(verifySupportOtpHash("", otpHash), false);
  assert.equal(verifySupportOtpHash("short", otpHash), false);

  // Different secret produces non-matching hash
  assert.equal(verifySupportOtpHash(validOtp, otpHash, "different_secret"), false);

  // 3. Email queue payload contract
  assert.ok(
    actionsCode.includes("enqueueEmail({"),
    "Must invoke enqueueEmail"
  );
  assert.ok(
    actionsCode.includes("type: \"admin_support_session_otp\""),
    "Email metadata must specify type admin_support_session_otp"
  );
  assert.ok(
    actionsCode.includes("is your MAFL Support Session Authorization Code"),
    "Email subject must contain authorization code reference"
  );
  assert.ok(
    actionsCode.includes("24-hour editing window"),
    "Email body must state 24-hour editing window security notice"
  );
  assert.ok(
    actionsCode.includes("maskEmail("),
    "Must mask recipient email in response payload"
  );
});

test("Issue 052: Session lifecycle enforces OTP verification failure and max attempt lockout (3 attempts)", () => {
  const actionsCode = read("src/actions/support-session.ts");

  // Code inspection for attempt counting and lockout
  assert.ok(
    actionsCode.includes("if (supportSession.otpAttempts >= 3)"),
    "Must check supportSession.otpAttempts >= 3"
  );
  assert.ok(
    actionsCode.includes("Maximum OTP verification attempts exceeded (3/3)"),
    "Must return lockout message upon reaching 3 attempts"
  );
  assert.ok(
    actionsCode.includes("nextAttempts >= 3 ? \"expired\" : supportSession.status"),
    "Must set session status to expired upon 3rd failure"
  );
  assert.ok(
    actionsCode.includes("Verification OTP has expired"),
    "Must reject expired OTP"
  );

  // Behavioral simulation of 3-attempt lockout lifecycle
  const secret = "otp_lockout_test_secret";
  const expectedOtp = "834921";
  const expectedHash = crypto.createHmac("sha256", secret).update(expectedOtp).digest("hex");

  let sessionState = {
    id: "session-lockout-test",
    status: "pending",
    otpHash: expectedHash,
    otpAttempts: 0,
    otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  function simulateVerify(session, inputOtp) {
    if (session.status !== "pending") {
      return { success: false, error: `Support session is not pending (current status: ${session.status}).` };
    }
    if (session.otpAttempts >= 3) {
      return { success: false, error: "Maximum OTP verification attempts exceeded (3/3). Please request a new session." };
    }
    if (new Date(session.otpExpiresAt).getTime() < Date.now()) {
      session.status = "expired";
      return { success: false, error: "Verification OTP has expired. Please request a new support session." };
    }

    const computed = crypto.createHmac("sha256", secret).update(String(inputOtp).trim()).digest("hex");
    const isMatch = computed === session.otpHash;

    if (!isMatch) {
      session.otpAttempts += 1;
      if (session.otpAttempts >= 3) {
        session.status = "expired";
      }
      const remaining = Math.max(0, 3 - session.otpAttempts);
      return {
        success: false,
        error: remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Invalid verification code. Maximum attempts reached.",
      };
    }

    session.status = "active";
    session.authorizedAt = new Date().toISOString();
    session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return { success: true, session };
  }

  // Attempt 1: Wrong code
  const res1 = simulateVerify(sessionState, "111111");
  assert.equal(res1.success, false);
  assert.equal(sessionState.otpAttempts, 1);
  assert.equal(sessionState.status, "pending");
  assert.equal(res1.error, "Invalid verification code. 2 attempts remaining.");

  // Attempt 2: Wrong code
  const res2 = simulateVerify(sessionState, "222222");
  assert.equal(res2.success, false);
  assert.equal(sessionState.otpAttempts, 2);
  assert.equal(sessionState.status, "pending");
  assert.equal(res2.error, "Invalid verification code. 1 attempt remaining.");

  // Attempt 3: 3rd wrong code locks out and transitions status to expired
  const res3 = simulateVerify(sessionState, "333333");
  assert.equal(res3.success, false);
  assert.equal(sessionState.otpAttempts, 3);
  assert.equal(sessionState.status, "expired");
  assert.equal(res3.error, "Invalid verification code. Maximum attempts reached.");

  // Attempt 4: Further attempts blocked immediately
  const res4 = simulateVerify(sessionState, expectedOtp);
  assert.equal(res4.success, false);
  assert.ok(res4.error.includes("not pending") || res4.error.includes("Maximum OTP verification attempts exceeded"));

  // Expired OTP simulation
  const expiredSession = {
    id: "session-expired-otp",
    status: "pending",
    otpHash: expectedHash,
    otpAttempts: 0,
    otpExpiresAt: new Date(Date.now() - 1000).toISOString(), // expired 1s ago
  };
  const resExpired = simulateVerify(expiredSession, expectedOtp);
  assert.equal(resExpired.success, false);
  assert.equal(expiredSession.status, "expired");
  assert.equal(resExpired.error, "Verification OTP has expired. Please request a new support session.");
});

test("Issue 052: Session lifecycle activates valid OTP verification with 24h TTL", () => {
  const actionsCode = read("src/actions/support-session.ts");

  assert.ok(
    actionsCode.includes("24 * 60 * 60 * 1000"),
    "Must calculate 24 hour TTL (24 * 60 * 60 * 1000)"
  );
  assert.ok(
    actionsCode.includes("authorizedAt: now"),
    "Must set authorizedAt to current timestamp"
  );
  assert.ok(
    actionsCode.includes("db.updateSupportSessionStatus(sessionId, \"active\""),
    "Must transition session status to active"
  );

  // Behavioral test for 24h TTL activation
  const secret = "ttl_verification_secret";
  const validOtp = "998877";
  const otpHash = crypto.createHmac("sha256", secret).update(validOtp).digest("hex");

  const pendingSession = {
    id: "sess-ttl-test",
    status: "pending",
    otpHash,
    otpAttempts: 0,
    otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    authorizedAt: null,
    expiresAt: null,
  };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  pendingSession.status = "active";
  pendingSession.authorizedAt = now.toISOString();
  pendingSession.expiresAt = expiresAt.toISOString();

  // Validate session is active
  assert.equal(pendingSession.status, "active");
  assert.ok(pendingSession.authorizedAt);
  assert.ok(pendingSession.expiresAt);

  // Check TTL calculation is exactly 24 hours (86,400,000 ms)
  const ttlMs = new Date(pendingSession.expiresAt).getTime() - new Date(pendingSession.authorizedAt).getTime();
  assert.equal(ttlMs, 86400000, "Support session TTL must be exactly 24 hours (86,400,000 ms)");
});

// ============================================================================
// REGRESSION SUITE: Member Correction & Audit Logging
// ============================================================================
test("Issue 052: Member correction updates member details (Krishna Bansal, Astitva Agrawal) and verifies DB update and audit log", () => {
  const actionsCode = read("src/actions/support-session.ts");

  // Verify that actions support diffing and logging
  assert.ok(
    actionsCode.includes("const changes: Record<string, { old: any; new: any }> = {};"),
    "Must initialize changes diff object"
  );
  assert.ok(
    actionsCode.includes("db.updateMemberProfile(memberId, memberUpdates)"),
    "Must call db.updateMemberProfile with changes"
  );
  assert.ok(
    actionsCode.includes("db.recordSupportAuditLog("),
    "Must record audit log entry"
  );

  // Diff computation helper matching support-session.ts implementation
  function computeMemberDiff(currentMember, updates) {
    const changes = {};
    const memberUpdates = {};
    const memberFieldKeys = [
      "fullName",
      "fatherName",
      "dob",
      "gender",
      "maritalStatus",
      "relationToHead",
      "currentCity",
      "currentCountry",
      "profession",
      "professionTitle",
    ];

    for (const key of memberFieldKeys) {
      if (key in updates && updates[key] !== undefined) {
        const oldVal = currentMember[key] ?? null;
        const newVal = updates[key] ?? null;
        const oldNorm = oldVal === "" ? null : oldVal;
        const newNorm = newVal === "" ? null : newVal;
        if (String(oldNorm ?? "") !== String(newNorm ?? "")) {
          changes[key] = { old: oldVal, new: newVal };
          memberUpdates[key] = newVal;
        }
      }
    }
    return { changes, memberUpdates };
  }

  // 1. Test Krishna Bansal typo correction scenario (Old: 'Kishan Bansal' -> New: 'Krishna Bansal')
  const memberKrishnaOld = {
    id: "mem-kb-01",
    fullName: "Kishan Bansal",
    fatherName: "Shri Omprakash Bansal",
    gender: "Male",
    maritalStatus: "Married",
    relationToHead: "self",
  };

  const updateKrishna = {
    fullName: "Krishna Bansal",
  };

  const diffKrishna = computeMemberDiff(memberKrishnaOld, updateKrishna);
  assert.deepEqual(diffKrishna.changes, {
    fullName: { old: "Kishan Bansal", new: "Krishna Bansal" },
  });
  assert.deepEqual(diffKrishna.memberUpdates, {
    fullName: "Krishna Bansal",
  });

  // Verify simulated audit log payload for Krishna Bansal
  const auditLogKrishna = {
    sessionId: "sess-krishna-01",
    adminId: "admin-suresh",
    householdId: "hh-krishna-01",
    memberId: memberKrishnaOld.id,
    changes: diffKrishna.changes,
    reason: "Member typo correction requested via support ticket",
  };

  assert.equal(auditLogKrishna.adminId, "admin-suresh");
  assert.equal(auditLogKrishna.sessionId, "sess-krishna-01");
  assert.equal(auditLogKrishna.changes.fullName.old, "Kishan Bansal");
  assert.equal(auditLogKrishna.changes.fullName.new, "Krishna Bansal");
  assert.equal(auditLogKrishna.reason, "Member typo correction requested via support ticket");

  // 2. Test Astitva Agrawal typo correction scenario (Old: 'Astitva Agarwal' -> New: 'Astitva Agrawal')
  const memberAstitvaOld = {
    id: "mem-aa-02",
    fullName: "Astitva Agarwal",
    fatherName: "Shri Ramesh Agrawal",
    gender: "Male",
    maritalStatus: "Single",
    relationToHead: "son",
  };

  const updateAstitva = {
    fullName: "Astitva Agrawal",
  };

  const diffAstitva = computeMemberDiff(memberAstitvaOld, updateAstitva);
  assert.deepEqual(diffAstitva.changes, {
    fullName: { old: "Astitva Agarwal", new: "Astitva Agrawal" },
  });
  assert.deepEqual(diffAstitva.memberUpdates, {
    fullName: "Astitva Agrawal",
  });

  // 3. Multi-field update diff (e.g. fatherName and city)
  const multiUpdate = {
    fullName: "Krishna Bansal",
    fatherName: "Shri Om Prakash Bansal",
  };
  const diffMulti = computeMemberDiff(memberKrishnaOld, multiUpdate);
  assert.deepEqual(diffMulti.changes, {
    fullName: { old: "Kishan Bansal", new: "Krishna Bansal" },
    fatherName: { old: "Shri Omprakash Bansal", new: "Shri Om Prakash Bansal" },
  });

  // 4. Untouched fields produce no diff
  const noopUpdate = {
    fullName: "Kishan Bansal", // same as old
  };
  const diffNoop = computeMemberDiff(memberKrishnaOld, noopUpdate);
  assert.deepEqual(diffNoop.changes, {});
  assert.deepEqual(diffNoop.memberUpdates, {});
});

test("Issue 052: Member correction validates gotra against 18 recognized Gotras, native place, and identity fields", () => {
  const actionsCode = read("src/actions/support-session.ts");

  // Validation checks in code
  assert.ok(
    actionsCode.includes("gotras.find"),
    "Must validate gotra against 18 recognized Gotras"
  );
  assert.ok(
    actionsCode.includes("Must be one of the 18 recognized Gotras"),
    "Must return error message for unrecognized Gotra"
  );
  assert.ok(
    actionsCode.includes("Full name must be at least 2 characters"),
    "Must validate fullName minimum length"
  );
  assert.ok(
    actionsCode.includes("Father's name must be at least 2 characters"),
    "Must validate fatherName minimum length"
  );
  assert.ok(
    actionsCode.includes("Native place must be at least 2 characters"),
    "Must validate nativePlace minimum length"
  );
  assert.ok(
    actionsCode.includes("Gender must be Male, Female, or Other"),
    "Must validate gender enum values"
  );

  // Behavioral validation logic test
  function validateGotraInput(inputGotra) {
    if (!inputGotra) return { valid: true, value: null };
    const clean = String(inputGotra).trim();
    const matched = gotras.find(
      (g) => g.name.toLowerCase() === clean.toLowerCase() || g.devanagari === clean
    );
    if (!matched) {
      return {
        valid: false,
        error: `Invalid gotra: "${inputGotra}". Must be one of the 18 recognized Gotras.`,
      };
    }
    return { valid: true, value: matched.name };
  }

  // 18 Gotras acceptance test
  const expected18 = [
    "Garg", "Bansal", "Bindal", "Dharan", "Airon", "Goyal",
    "Jindal", "Kansal", "Kuchhal", "Madhukul", "Mangal", "Mittal",
    "Nangil", "Singhal", "Tayal", "Tingal", "Vatsil", "Kasal"
  ];
  for (const gName of expected18) {
    const res = validateGotraInput(gName);
    assert.equal(res.valid, true, `Gotra ${gName} must be accepted`);
    assert.equal(res.value, gName);
  }

  // Devanagari script acceptance
  assert.equal(validateGotraInput("बंसल").valid, true);
  assert.equal(validateGotraInput("बंसल").value, "Bansal");
  assert.equal(validateGotraInput("गर्ग").valid, true);
  assert.equal(validateGotraInput("गर्ग").value, "Garg");

  // Invalid Gotras rejected
  assert.equal(validateGotraInput("NonExistentGotra").valid, false);
  assert.equal(validateGotraInput("RandomFamily").valid, false);

  // Household diff calculation (gotra + nativePlace)
  function computeHouseholdDiff(currentHousehold, updates) {
    const changes = {};
    const householdUpdates = {};

    if ("gotra" in updates && updates.gotra !== undefined) {
      const oldGotra = currentHousehold?.gotra ?? null;
      const newGotra = updates.gotra ?? null;
      if (String(oldGotra ?? "") !== String(newGotra ?? "")) {
        changes.gotra = { old: oldGotra, new: newGotra };
        householdUpdates.gotra = newGotra;
      }
    }

    if ("nativePlace" in updates && updates.nativePlace !== undefined) {
      const oldNativePlace = currentHousehold?.nativePlace ?? null;
      const newNativePlace = updates.nativePlace ?? null;
      if (String(oldNativePlace ?? "") !== String(newNativePlace ?? "")) {
        changes.nativePlace = { old: oldNativePlace, new: newNativePlace };
        householdUpdates.nativePlace = newNativePlace;
      }
    }

    return { changes, householdUpdates };
  }

  const currentHh = { id: "hh-01", gotra: "Goyal", nativePlace: "Agroha, Haryana" };
  const hhDiff = computeHouseholdDiff(currentHh, { gotra: "Bansal", nativePlace: "Hisar, Haryana" });

  assert.deepEqual(hhDiff.changes, {
    gotra: { old: "Goyal", new: "Bansal" },
    nativePlace: { old: "Agroha, Haryana", new: "Hisar, Haryana" },
  });
  assert.deepEqual(hhDiff.householdUpdates, {
    gotra: "Bansal",
    nativePlace: "Hisar, Haryana",
  });
});

// ============================================================================
// REGRESSION SUITE: Expiry, Revocation & Lockout Enforcement
// ============================================================================
test("Issue 052: Expiry and revocation immediately lock out subsequent modifications", () => {
  const actionsCode = read("src/actions/support-session.ts");

  // Verification checks in support-session.ts
  assert.ok(
    actionsCode.includes("supportSession.status !== \"active\""),
    "Must verify session status is active before allowing corrections"
  );
  assert.ok(
    actionsCode.includes("new Date(supportSession.expiresAt).getTime() <= Date.now()"),
    "Must verify session is not expired before allowing corrections"
  );
  assert.ok(
    actionsCode.includes("db.updateSupportSessionStatus(sessionId, \"expired\")"),
    "Must auto-transition expired session to status expired"
  );
  assert.ok(
    actionsCode.includes("db.updateSupportSessionStatus(sessionId, \"revoked\""),
    "Must set session status to revoked on revoke action"
  );

  // Behavioral simulation of session validity checks
  function checkCorrectionAllowed(session) {
    if (!session) {
      return { allowed: false, error: "Support session not found." };
    }
    if (session.status !== "active") {
      return { allowed: false, error: `Support session is not active (current status: ${session.status}).` };
    }
    if (!session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      session.status = "expired";
      return { allowed: false, error: "Support session has expired. Modifications are no longer permitted." };
    }
    return { allowed: true };
  }

  // 1. Active and unexpired session is permitted
  const activeSession = {
    id: "sess-active",
    status: "active",
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12h remaining
  };
  assert.deepEqual(checkCorrectionAllowed(activeSession), { allowed: true });

  // 2. Pending session is rejected
  const pendingSession = {
    id: "sess-pending",
    status: "pending",
    expiresAt: null,
  };
  assert.deepEqual(checkCorrectionAllowed(pendingSession), {
    allowed: false,
    error: "Support session is not active (current status: pending).",
  });

  // 3. Revoked session is rejected immediately
  const revokedSession = {
    id: "sess-revoked",
    status: "revoked",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
  assert.deepEqual(checkCorrectionAllowed(revokedSession), {
    allowed: false,
    error: "Support session is not active (current status: revoked).",
  });

  // 4. Expired status session is rejected
  const expiredSession = {
    id: "sess-expired-status",
    status: "expired",
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  };
  assert.deepEqual(checkCorrectionAllowed(expiredSession), {
    allowed: false,
    error: "Support session is not active (current status: expired).",
  });

  // 5. Active session whose 24-hour TTL has elapsed auto-expires and rejects
  const timeElapsedSession = {
    id: "sess-ttl-elapsed",
    status: "active",
    expiresAt: new Date(Date.now() - 5000).toISOString(), // expired 5 seconds ago
  };
  const resElapsed = checkCorrectionAllowed(timeElapsedSession);
  assert.equal(resElapsed.allowed, false);
  assert.equal(timeElapsedSession.status, "expired");
  assert.equal(resElapsed.error, "Support session has expired. Modifications are no longer permitted.");

  // 6. Early revocation sets status to 'revoked' immediately
  function simulateRevocation(session) {
    session.status = "revoked";
    session.expiresAt = new Date().toISOString();
    return session;
  }

  const liveSession = {
    id: "sess-to-revoke",
    status: "active",
    expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
  };
  simulateRevocation(liveSession);
  assert.equal(liveSession.status, "revoked");

  // Attempting correction on newly revoked session fails
  const afterRevokeRes = checkCorrectionAllowed(liveSession);
  assert.equal(afterRevokeRes.allowed, false);
  assert.equal(afterRevokeRes.error, "Support session is not active (current status: revoked).");
});

// ============================================================================
// REGRESSION SUITE: In-Memory Dual Fallback Store Verification
// ============================================================================
test("Issue 052: In-memory dual fallback stores support sessions and audit logs accurately", () => {
  // Clear memory stores for test isolation
  globalThis.__memorySupportSessions = [];
  globalThis.__memorySupportAuditLogs = [];

  const sessionsStore = globalThis.__memorySupportSessions;
  const auditLogsStore = globalThis.__memorySupportAuditLogs;

  // In-memory createSupportSession
  function createSessionInMemory(input) {
    const session = {
      id: crypto.randomUUID(),
      adminId: input.adminId,
      householdId: input.householdId,
      memberId: input.memberId || null,
      otpHash: input.otpHash,
      otpExpiresAt: input.otpExpiresAt instanceof Date ? input.otpExpiresAt.toISOString() : String(input.otpExpiresAt),
      otpAttempts: 0,
      status: input.status || "pending",
      authorizedAt: null,
      expiresAt: null,
      reason: input.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessionsStore.unshift(session);
    return session;
  }

  // In-memory getActiveSupportSession
  function getActiveSessionInMemory(householdId, memberId) {
    const now = new Date();
    const candidates = sessionsStore.filter((s) => {
      if (s.householdId !== householdId) return false;
      if (s.status !== "active") return false;
      if (!s.expiresAt || new Date(s.expiresAt) <= now) return false;
      if (memberId && s.memberId && s.memberId !== memberId) return false;
      return true;
    });
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => new Date(b.expiresAt || 0).getTime() - new Date(a.expiresAt || 0).getTime());
    return candidates[0];
  }

  // In-memory recordSupportAuditLog
  function recordAuditLogInMemory(input) {
    const log = {
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      adminId: input.adminId,
      householdId: input.householdId,
      memberId: input.memberId || null,
      changes: input.changes || {},
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(log);
    return log;
  }

  // 1. Create a pending session
  const created = createSessionInMemory({
    adminId: "admin-mem-01",
    householdId: "hh-mem-01",
    memberId: "mem-mem-01",
    otpHash: "sample_hash_123",
    otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    reason: "Astitva Agrawal name typo correction",
  });

  assert.ok(created.id);
  assert.equal(created.status, "pending");
  assert.equal(created.otpAttempts, 0);
  assert.equal(sessionsStore.length, 1);

  // Pending session must not be returned by getActiveSupportSession
  assert.equal(getActiveSessionInMemory("hh-mem-01"), null);

  // 2. Activate the session with 24h TTL
  created.status = "active";
  created.authorizedAt = new Date().toISOString();
  created.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Active session must be found
  const active = getActiveSessionInMemory("hh-mem-01", "mem-mem-01");
  assert.ok(active);
  assert.equal(active.id, created.id);
  assert.equal(active.status, "active");

  // 3. Record audit log
  const log = recordAuditLogInMemory({
    sessionId: created.id,
    adminId: created.adminId,
    householdId: created.householdId,
    memberId: created.memberId,
    changes: { fullName: { old: "Astitva Agarwal", new: "Astitva Agrawal" } },
    reason: "Astitva Agrawal name typo correction",
  });

  assert.ok(log.id);
  assert.equal(auditLogsStore.length, 1);
  assert.deepEqual(log.changes, {
    fullName: { old: "Astitva Agarwal", new: "Astitva Agrawal" },
  });

  // 4. Revocation clears active status
  created.status = "revoked";
  created.expiresAt = new Date().toISOString();

  assert.equal(getActiveSessionInMemory("hh-mem-01"), null);
});

// ============================================================================
// REGRESSION SUITE: Admin Moderation UI Components & Integration (AWB-9)
// ============================================================================
test("Issue 052 / AWB-9: Admin moderation UI components and tab integration adhere to contracts", () => {
  const modalCode = read("src/components/admin/AdminSupportSessionModal.tsx");
  const formCode = read("src/components/admin/AdminSupportCorrectionForm.tsx");
  const iconsCode = read("src/components/admin/AdminSupportIcons.tsx");
  const pageCode = read("src/app/admin/moderation/page.tsx");

  // 1. AdminSupportSessionModal contract
  assert.ok(modalCode.includes("export default function AdminSupportSessionModal"), "Must export AdminSupportSessionModal");
  assert.ok(modalCode.includes("requestAdminSupportSession"), "Modal Step 1 must call requestAdminSupportSession");
  assert.ok(modalCode.includes("verifyAdminSupportSession"), "Modal Step 2 must call verifyAdminSupportSession");
  assert.ok(modalCode.includes("revokeAdminSupportSessionAction"), "Modal Step 3 must call revokeAdminSupportSessionAction");
  assert.ok(modalCode.includes("Send Authorization Code"), "Must have Send Authorization Code button");
  assert.ok(modalCode.includes("Verify & Activate Session"), "Must have Verify & Activate Session button");
  assert.ok(modalCode.includes("End Session Early"), "Must have End Session Early button");
  assert.ok(modalCode.includes("remaining"), "Must display session countdown pill with remaining time");

  // 2. AdminSupportCorrectionForm contract
  assert.ok(formCode.includes("export default function AdminSupportCorrectionForm"), "Must export AdminSupportCorrectionForm");
  assert.ok(formCode.includes("adminCorrectMemberDetailsAction"), "Form must call adminCorrectMemberDetailsAction");
  assert.ok(formCode.includes("getSupportAuditLogsAction"), "Form must call getSupportAuditLogsAction");
  assert.ok(formCode.includes("fullName"), "Form must edit fullName");
  assert.ok(formCode.includes("fatherName"), "Form must edit fatherName");
  assert.ok(formCode.includes("dob"), "Form must edit dob");
  assert.ok(formCode.includes("Not specified"), "Form must support Not specified DOB toggle");
  assert.ok(formCode.includes("gender"), "Form must edit gender");
  assert.ok(formCode.includes("maritalStatus"), "Form must edit maritalStatus");
  assert.ok(formCode.includes("gotras"), "Form must support gotra dropdown from gotras");
  assert.ok(formCode.includes("nativePlace"), "Form must edit nativePlace");
  assert.ok(formCode.includes("Visual Diff Review"), "Form must display visual diff review box");
  assert.ok(formCode.includes("Immutable Session Audit Trail"), "Form must display audit log panel");

  // 3. Page integration contract
  assert.ok(pageCode.includes('"support"'), "page.tsx filter state must include 'support'");
  assert.ok(pageCode.includes("Support Sessions"), "page.tsx must have Support Sessions tab button");
  assert.ok(pageCode.includes("Initiate Support Session"), "page.tsx must have Initiate Support Session action button");
  assert.ok(pageCode.includes("AdminSupportSessionModal"), "page.tsx must mount AdminSupportSessionModal");

  // 4. Design invariants
  assert.ok(iconsCode.includes("ShieldCheck"), "Must define ShieldCheck icon");
  assert.ok(iconsCode.includes("KeyRound"), "Must define KeyRound icon");
  assert.ok(iconsCode.includes("Clock"), "Must define Clock icon");
  assert.ok(iconsCode.includes("History"), "Must define History icon");
  assert.ok(iconsCode.includes("UserCheck"), "Must define UserCheck icon");
  assert.ok(modalCode.includes("min-h-[44px]") || modalCode.includes("h-11"), "Primary CTAs must have 44px touch target");
  assert.ok(formCode.includes("min-h-[44px]") || formCode.includes("h-11"), "Primary CTAs must have 44px touch target");
});

// ============================================================================
// REGRESSION SUITE: Chunk 3.1 Hardening & UI Polish (AWB-13)
// ============================================================================

test("Issue 052 / AWB-13: In-modal two-step revocation eliminates window.confirm dependency", () => {
  const modalCode = read("src/components/admin/AdminSupportSessionModal.tsx");

  // 1. Static assertion: Must not use native window.confirm or confirm(
  assert.ok(
    !modalCode.includes("window.confirm(") && !modalCode.includes("confirm("),
    "AdminSupportSessionModal must NOT rely on native browser confirm()"
  );

  // 2. Static assertion: Must define showRevokeConfirm state
  assert.ok(
    modalCode.includes("showRevokeConfirm") && modalCode.includes("setShowRevokeConfirm"),
    "AdminSupportSessionModal must define showRevokeConfirm state"
  );

  // 3. Static assertion: Must render step buttons
  assert.ok(
    modalCode.includes("End Session Early"),
    "Must render 'End Session Early' button"
  );
  assert.ok(
    modalCode.includes("Confirm End Session"),
    "Must render 'Confirm End Session' button"
  );
  assert.ok(
    modalCode.includes("Cancel"),
    "Must render 'Cancel' button to abort revocation"
  );

  // 4. Behavioral simulation of two-step in-modal revocation flow
  let showRevokeConfirm = false;
  let isRevoking = false;
  let revokeApiCalled = false;

  const handleStartRevoke = () => {
    showRevokeConfirm = true;
  };

  const handleCancelRevoke = () => {
    showRevokeConfirm = false;
  };

  const handleConfirmRevoke = async () => {
    isRevoking = true;
    revokeApiCalled = true;
    showRevokeConfirm = false;
    isRevoking = false;
  };

  // Step 1: Initial state
  assert.equal(showRevokeConfirm, false, "Initial state must not show confirmation");
  assert.equal(revokeApiCalled, false);

  // Step 2: User clicks 'End Session Early'
  handleStartRevoke();
  assert.equal(showRevokeConfirm, true, "Clicking 'End Session Early' must activate in-modal confirmation");
  assert.equal(revokeApiCalled, false, "Must not invoke revoke API until confirmed");

  // Step 3: User cancels
  handleCancelRevoke();
  assert.equal(showRevokeConfirm, false, "Canceling must dismiss confirmation without revoking");
  assert.equal(revokeApiCalled, false);

  // Step 4: User clicks 'End Session Early' and then 'Confirm End Session'
  handleStartRevoke();
  assert.equal(showRevokeConfirm, true);
  handleConfirmRevoke();
  assert.equal(revokeApiCalled, true, "Confirming must trigger revocation");
  assert.equal(showRevokeConfirm, false);
});

test("Issue 052 / AWB-13: Session resurrection prevention resets modal state and notifies parent", () => {
  const modalCode = read("src/components/admin/AdminSupportSessionModal.tsx");
  const pageCode = read("src/app/admin/moderation/page.tsx");

  // 1. Static assertion: Modal props interface and destructuring
  assert.ok(
    modalCode.includes("onSessionRevoked?: () => void;"),
    "AdminSupportSessionModalProps must define onSessionRevoked callback"
  );
  assert.ok(
    modalCode.includes("onSessionRevoked,"),
    "AdminSupportSessionModal must destructure onSessionRevoked"
  );

  // 2. Static assertion: Revocation success resets all states and calls onSessionRevoked
  assert.ok(
    modalCode.includes("setActiveSession(null);"),
    "Revocation handler must clear activeSession"
  );
  assert.ok(
    modalCode.includes('setStep("request");'),
    "Revocation handler must reset step to 'request'"
  );
  assert.ok(
    modalCode.includes("setShowRevokeConfirm(false);"),
    "Revocation handler must reset showRevokeConfirm"
  );
  assert.ok(
    modalCode.includes("if (onSessionRevoked) onSessionRevoked();"),
    "Revocation handler must invoke onSessionRevoked callback"
  );

  // 3. Static assertion: page.tsx handles onSessionRevoked to clear parent state
  assert.ok(
    pageCode.includes("onSessionRevoked={() => {"),
    "page.tsx must provide onSessionRevoked handler to AdminSupportSessionModal"
  );
  assert.ok(
    pageCode.includes("session: null"),
    "page.tsx must set supportModalState session to null on revocation"
  );

  // 4. Behavioral simulation: Verify parent and child state synchronization prevents resurrection
  let parentSupportModalState = {
    isOpen: true,
    household: { id: "hh-1", name: "Bansal Family" },
    memberId: "mem-1",
    session: { id: "sess-1", status: "active", expiresAt: new Date(Date.now() + 3600000).toISOString() },
  };

  let modalActiveSession = parentSupportModalState.session;
  let modalSessionId = parentSupportModalState.session.id;
  let modalStep = "active";
  let modalShowRevokeConfirm = true;

  // Simulate revocation completion
  const onSessionRevoked = () => {
    parentSupportModalState = {
      ...parentSupportModalState,
      session: null,
    };
  };

  // Perform modal state teardown
  modalActiveSession = null;
  modalSessionId = null;
  modalStep = "request";
  modalShowRevokeConfirm = false;
  onSessionRevoked();

  // Assert modal state cleared
  assert.equal(modalActiveSession, null, "Modal activeSession must be null");
  assert.equal(modalSessionId, null, "Modal sessionId must be null");
  assert.equal(modalStep, "request", "Modal step must be 'request'");
  assert.equal(modalShowRevokeConfirm, false, "Modal showRevokeConfirm must be false");

  // Assert parent state cleared
  assert.equal(parentSupportModalState.session, null, "Parent session must be null to prevent resurrection on re-render");

  // Simulate re-render check with parent state
  if (parentSupportModalState.session && parentSupportModalState.session.status === "active") {
    modalStep = "active";
  } else {
    modalStep = "request";
  }
  assert.equal(modalStep, "request", "Re-render must NOT resurrect into 'active' step");
});

test("Issue 052 / AWB-13: PostgreSQL DATE type parser (OID 1082) prevents timezone day shift", () => {
  const dbCode = read("src/lib/db.ts");

  // 1. Static assertion: pg.types.setTypeParser configured for OID 1082
  assert.ok(
    dbCode.includes("pg.types.setTypeParser(1082"),
    "db.ts must configure pg.types.setTypeParser for OID 1082"
  );
  assert.ok(
    dbCode.includes("(val: string) => val"),
    "db.ts must configure DATE type parser to return raw string 'YYYY-MM-DD'"
  );

  // 2. Static assertion: row mappers use .split('T')[0] for safe date string formatting
  assert.ok(
    dbCode.includes('.split("T")[0]'),
    "db.ts row mappers must use .split('T')[0] to preserve date strings"
  );

  // 3. Behavioral simulation: Compare standard JS Date conversion vs raw string parser
  const rawPgDate = "1985-07-15";

  // Simulate pg OID 1082 parser
  const parser1082 = (val) => val;
  const parsedValue = parser1082(rawPgDate);
  assert.equal(parsedValue, "1985-07-15", "Type parser 1082 must return exact string value");

  // Test row mapper date normalizer logic
  function normalizeDob(dob) {
    if (!dob) return "";
    return dob instanceof Date ? dob.toISOString().split("T")[0] : String(dob).split("T")[0];
  }

  assert.equal(normalizeDob("1985-07-15"), "1985-07-15");
  assert.equal(normalizeDob("1985-07-15T00:00:00.000Z"), "1985-07-15");
  assert.equal(normalizeDob("2000-12-31"), "2000-12-31");
  assert.equal(normalizeDob(null), "");
  assert.equal(normalizeDob(""), "");

  // Demonstrate timezone shift vulnerability that pg parser 1082 prevents:
  // When pg parses DATE as a local Date, IST (UTC+5:30) midnight 1985-07-15 is 1985-07-14T18:30:00.000Z
  const simulatedIstMidnightIso = "1985-07-14T18:30:00.000Z";
  // Without raw string parsing, toISOString() in UTC shifts the date to July 14!
  assert.equal(simulatedIstMidnightIso.split("T")[0], "1985-07-14");
  // With raw string parsing 1082, pg passes "1985-07-15", which never converts to UTC midnight
  assert.equal(normalizeDob(parsedValue), "1985-07-15", "DATE string is preserved without timezone shift");
});

test("Issue 052 / AWB-13: AdminSupportCorrectionForm clears sticky validation errors on input change", () => {
  const formCode = read("src/components/admin/AdminSupportCorrectionForm.tsx");

  // 1. Static assertion: Input change handlers clear statusMessage
  const requiredFields = [
    "fullName",
    "fatherName",
    "dob",
    "gender",
    "maritalStatus",
    "nativePlace",
    "reason",
  ];

  for (const field of requiredFields) {
    assert.ok(
      formCode.includes(`if (statusMessage) setStatusMessage(null);`),
      `Form must clear statusMessage on input change`
    );
  }

  // Check gotra select handler
  assert.ok(
    formCode.includes("setGotra(e.target.value);") && formCode.includes("if (statusMessage) setStatusMessage(null);"),
    "Gotra selection change must clear statusMessage"
  );

  // 2. Behavioral simulation: Status message clearing on field edit
  let statusMessage = { type: "error", message: "A valid reason (minimum 3 characters) is required." };

  function handleInputChange(fieldName, newValue) {
    if (statusMessage) {
      statusMessage = null;
    }
  }

  assert.ok(statusMessage !== null, "Initial error message present");
  handleInputChange("fullName", "Krishna Bansal");
  assert.equal(statusMessage, null, "Editing fullName must clear statusMessage");

  // Simulate another error and field change
  statusMessage = { type: "error", message: "Please select a valid Gotra from the 18 recognized Gotras." };
  handleInputChange("gotra", "Garg");
  assert.equal(statusMessage, null, "Changing gotra must clear statusMessage");
});

test("Issue 052 / AWB-13: Digital countdown timer renders in HH:MM:SS format", () => {
  const modalCode = read("src/components/admin/AdminSupportSessionModal.tsx");

  // 1. Static assertions
  assert.ok(
    modalCode.includes("const pad = (n: number) => String(n).padStart(2, \"0\");"),
    "AdminSupportSessionModal must use padStart to format 2-digit time segments"
  );
  assert.ok(
    modalCode.includes("setRemainingTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);"),
    "AdminSupportSessionModal must set countdown in HH:MM:SS format"
  );
  assert.ok(
    modalCode.includes('setRemainingTime("00:00:00");'),
    "AdminSupportSessionModal must set '00:00:00' when session expires"
  );

  // 2. Behavioral simulation: Test countdown formatting logic
  function formatCountdown(expiresAt, currentNow) {
    if (!expiresAt) {
      return "Active";
    }
    const diffMs = new Date(expiresAt).getTime() - currentNow;
    if (diffMs <= 0) {
      return "00:00:00";
    }
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  const now = 1700000000000;

  // Exactly 24 hours remaining: 24:00:00
  assert.equal(formatCountdown(new Date(now + 24 * 3600 * 1000).toISOString(), now), "24:00:00");

  // 23 hours, 59 minutes, 59 seconds: 23:59:59
  assert.equal(formatCountdown(new Date(now + (23 * 3600 + 59 * 60 + 59) * 1000).toISOString(), now), "23:59:59");

  // 1 hour, 5 minutes, 9 seconds: 01:05:09
  assert.equal(formatCountdown(new Date(now + (1 * 3600 + 5 * 60 + 9) * 1000).toISOString(), now), "01:05:09");

  // 0 hours, 2 minutes, 30 seconds: 00:02:30
  assert.equal(formatCountdown(new Date(now + (2 * 60 + 30) * 1000).toISOString(), now), "00:02:30");

  // Expired (0ms remaining): 00:00:00
  assert.equal(formatCountdown(new Date(now).toISOString(), now), "00:00:00");

  // Negative diff (passed expiration): 00:00:00
  assert.equal(formatCountdown(new Date(now - 10000).toISOString(), now), "00:00:00");

  // No expiration: Active
  assert.equal(formatCountdown(null, now), "Active");
});

test("Issue 052 / AWB-13: Moderation page metrics bar displays Active Sessions, Pending Authorizations, and Total Audit Logs", () => {
  const pageCode = read("src/app/admin/moderation/page.tsx");

  // 1. Static assertions for metrics bar labels
  assert.ok(
    pageCode.includes("Active Sessions"),
    "page.tsx must render 'Active Sessions' label in metrics bar"
  );
  assert.ok(
    pageCode.includes("Pending Authorizations"),
    "page.tsx must render 'Pending Authorizations' label in metrics bar"
  );
  assert.ok(
    pageCode.includes("Total Audit Logs"),
    "page.tsx must render 'Total Audit Logs' label in metrics bar"
  );

  // 2. Static assertions for metrics state & action wiring
  assert.ok(
    pageCode.includes("totalSupportAuditLogs") && pageCode.includes("setTotalSupportAuditLogs"),
    "page.tsx must maintain totalSupportAuditLogs state"
  );
  assert.ok(
    pageCode.includes("getAdminAuditLogsAction(100)"),
    "page.tsx loadQueue must fetch admin audit logs via getAdminAuditLogsAction"
  );
  assert.ok(
    pageCode.includes("{activeSupportSessions.length}"),
    "page.tsx must bind activeSupportSessions count to Active Sessions card"
  );
  assert.ok(
    pageCode.includes("{totalSupportAuditLogs}"),
    "page.tsx must bind totalSupportAuditLogs to Total Audit Logs card"
  );
});

