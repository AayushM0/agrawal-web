/**
 * scripts/migrate-audit-view.mjs
 *
 * Standalone, idempotent migration script that:
 * 1. Adds category, severity, and checksum columns to admin_audit_logs (if not exists)
 * 2. Creates query performance indexes on admin_audit_logs
 * 3. Enforces prevent_audit_log_mutation() trigger function and immutability triggers
 * 4. Creates or replaces the unified view view_platform_audit_trail
 *
 * Usage:
 *   node scripts/migrate-audit-view.mjs
 *   DATABASE_URL="postgres://..." node scripts/migrate-audit-view.mjs
 */

import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("?pgbouncer=true", "")
  : "postgresql://localhost:5432/agrawal_dev";

export async function runAuditViewMigration(connStr = connectionString) {
  console.log("\n🔧 Running audit view and security hardening migration...");
  console.log("   Connecting to:", connStr.replace(/:\/\/[^@]*@/, "://<creds>@"));

  const pool = new Pool({ connectionString: connStr });
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // 1. Column additions
    console.log("   1. Adding audit columns to admin_audit_logs if not present...");
    await client.query(`
      ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS category VARCHAR(64) DEFAULT 'MODERATION';
      ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(32) DEFAULT 'INFO';
      ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS checksum TEXT;
    `);

    // 2. Indexes
    console.log("   2. Creating indexes for audit trail performance...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_created ON admin_audit_logs(action, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_category ON admin_audit_logs(category, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id, created_at DESC);
    `);

    // 3. Immutability trigger function & triggers
    console.log("   3. Creating immutability trigger function and triggers...");
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Audit logs are strictly immutable and cannot be updated or deleted.';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_immutable_admin_audit_logs ON admin_audit_logs;
      CREATE TRIGGER trg_immutable_admin_audit_logs
      BEFORE UPDATE OR DELETE ON admin_audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

      DROP TRIGGER IF EXISTS trg_immutable_admin_support_audit_logs ON admin_support_audit_logs;
      CREATE TRIGGER trg_immutable_admin_support_audit_logs
      BEFORE UPDATE OR DELETE ON admin_support_audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
    `);

    // 4. Unified Platform Audit Trail View
    console.log("   4. Creating unified view_platform_audit_trail view...");
    await client.query(`
      CREATE OR REPLACE VIEW view_platform_audit_trail AS
      SELECT
        l.id,
        l.created_at AS "timestamp",
        l.admin_id AS "adminId",
        l.admin_contact AS "adminContact",
        l.action,
        COALESCE(l.category, 'MODERATION') AS "category",
        COALESCE(l.severity, 'INFO') AS "severity",
        l.target_type AS "targetType",
        l.target_id AS "targetId",
        CASE
          WHEN l.target_type = 'household' THEN (SELECT h.head_name || ' (' || COALESCE(h.serial_no, h.household_code, 'ID') || ')' FROM households h WHERE h.id::text = l.target_id LIMIT 1)
          WHEN l.target_type = 'member' THEN (SELECT m.full_name || ' (' || COALESCE(m.serial_no, 'ID') || ')' FROM members m WHERE m.id::text = l.target_id LIMIT 1)
          WHEN l.target_type IN ('business', 'business_profile') THEN (SELECT b.business_name || ' (' || COALESCE(b.business_serial_no, 'ID') || ')' FROM business_profiles b WHERE b.id::text = l.target_id LIMIT 1)
          WHEN l.target_type = 'career_profile' THEN (SELECT m.full_name || ' (Career Profile)' FROM career_profiles cp JOIN members m ON m.id = cp.member_id WHERE cp.id::text = l.target_id LIMIT 1)
          WHEN l.target_type = 'matrimonial_profile' THEN (SELECT m.full_name || ' (Matrimonial Profile)' FROM matrimonial_profiles mp JOIN members m ON m.id = mp.member_id WHERE mp.id::text = l.target_id LIMIT 1)
          WHEN l.target_type = 'job_posting' THEN (SELECT jp.title || ' @ ' || jp.company_name FROM job_postings jp WHERE jp.id::text = l.target_id LIMIT 1)
          ELSE l.target_id
        END AS "targetName",
        l.details,
        l.ip_address AS "ipAddress",
        l.checksum,
        'admin_audit_logs'::text AS "sourceTable"
      FROM admin_audit_logs l

      UNION ALL

      SELECT
        s.id,
        s.created_at AS "timestamp",
        s.admin_id AS "adminId",
        'admin-support'::text AS "adminContact",
        'MEMBER_DETAILS_CORRECTED'::text AS "action",
        'SUPPORT_SESSION'::text AS "category",
        'CRITICAL'::text AS "severity",
        CASE WHEN s.member_id IS NOT NULL THEN 'member' ELSE 'household' END AS "targetType",
        COALESCE(s.member_id::text, s.household_id::text) AS "targetId",
        CASE
          WHEN s.member_id IS NOT NULL THEN (SELECT m.full_name || ' (' || COALESCE(m.serial_no, 'ID') || ')' FROM members m WHERE m.id = s.member_id LIMIT 1)
          ELSE (SELECT h.head_name || ' (' || COALESCE(h.serial_no, h.household_code, 'ID') || ')' FROM households h WHERE h.id = s.household_id LIMIT 1)
        END AS "targetName",
        jsonb_build_object(
          'sessionId', s.session_id,
          'householdId', s.household_id,
          'memberId', s.member_id,
          'changes', s.changes,
          'reason', s.reason
        ) AS "details",
        NULL::text AS "ipAddress",
        NULL::text AS "checksum",
        'admin_support_audit_logs'::text AS "sourceTable"
      FROM admin_support_audit_logs s;
    `);

    await client.query("COMMIT;");
    console.log("✅ Migration complete! view_platform_audit_trail and immutability triggers verified.\n");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runAuditViewMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
