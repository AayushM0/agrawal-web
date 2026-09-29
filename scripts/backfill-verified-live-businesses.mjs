/**
 * One-time, idempotent Supabase Postgres backfill for the unified approval flow.
 *
 * It only updates businesses that are already live and do not yet have the
 * verified badge. Each update and its audit log are committed atomically.
 *
 * Usage (safe preview):
 *   node --env-file=.env.production.local scripts/backfill-verified-live-businesses.mjs --dry-run
 *
 * Usage (apply to the configured Supabase database):
 *   node --env-file=.env.production.local scripts/backfill-verified-live-businesses.mjs --apply
 */

import pg from "pg";

const { Client } = pg;
const validFlags = new Set(["--dry-run", "--apply"]);
const flags = process.argv.slice(2);

if (flags.some((flag) => !validFlags.has(flag)) || flags.length > 1) {
  throw new Error("Usage: backfill-verified-live-businesses.mjs [--dry-run|--apply]");
}

const apply = flags.includes("--apply");
const connectionString = process.env.DATABASE_URL?.replace("?pgbouncer=true", "");

if (!connectionString) {
  throw new Error("DATABASE_URL must point to the target Supabase Postgres database.");
}

const client = new Client({ connectionString });
const migrationActor = "system:backfill-verified-live-businesses";
const migrationAction = "BACKFILL_VERIFY_LIVE_BUSINESS";

console.log(`Connecting to ${connectionString.replace(/:\/\/[^@]*@/, "://<creds>@")}`);
console.log(apply ? "Applying verified-business backfill." : "Dry run: no changes will be committed.");

await client.connect();

try {
  await client.query("BEGIN");

  const candidates = await client.query(`
    SELECT id, business_name
    FROM business_profiles
    WHERE status = 'live'
      AND is_verified_badge = FALSE
    FOR UPDATE
  `);

  console.log(`${candidates.rowCount} live, unverified business${candidates.rowCount === 1 ? "" : "es"} selected.`);

  if (!apply) {
    await client.query("ROLLBACK");
    console.log("Dry run complete. Re-run with --apply to commit these updates.");
  } else {
    for (const business of candidates.rows) {
      const updated = await client.query(
        `UPDATE business_profiles
         SET is_verified_badge = TRUE,
             updated_at = NOW()
         WHERE id = $1
           AND status = 'live'
           AND is_verified_badge = FALSE
         RETURNING id`,
        [business.id]
      );

      if (updated.rowCount !== 1) {
        throw new Error(`Business ${business.id} no longer matches the backfill criteria.`);
      }

      await client.query(
        `INSERT INTO admin_audit_logs
          (admin_id, admin_contact, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, 'business', $4, $5::jsonb, 'system')`,
        [
          migrationActor,
          migrationActor,
          migrationAction,
          business.id,
          JSON.stringify({
            businessName: business.business_name,
            source: "unified-business-approval-backfill",
            previousStatus: "live",
            previousVerifiedBadge: false,
            isVerifiedBadge: true,
          }),
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`Committed ${candidates.rowCount} verified-business update${candidates.rowCount === 1 ? "" : "s"}.`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
