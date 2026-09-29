import pg from "pg";

const apply = process.argv.includes("--apply");
const connectionString = process.env.DATABASE_URL?.replace("?pgbouncer=true", "");
if (!connectionString) throw new Error("DATABASE_URL is required.");
const client = new pg.Client({ connectionString });
const format = (value) => {
  const number = String(value).padStart(9, "0");
  return `MAFLBUS-${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6, 9)}`;
};

await client.connect();
try {
  await client.query("BEGIN");
  await client.query("ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS business_serial_no VARCHAR(32) UNIQUE");
  await client.query("CREATE INDEX IF NOT EXISTS idx_business_profiles_serial_no ON business_profiles(business_serial_no)");
  const result = await client.query("SELECT id FROM business_profiles WHERE business_serial_no IS NULL ORDER BY created_at ASC, id ASC FOR UPDATE");
  console.log(`${result.rowCount} businesses need serial numbers.`);
  if (!apply) { await client.query("ROLLBACK"); console.log("Dry run complete."); }
  else {
    for (const [index, business] of result.rows.entries()) {
      const serial = format(index + 1);
      await client.query("UPDATE business_profiles SET business_serial_no = $2, updated_at = NOW() WHERE id = $1", [business.id, serial]);
      await client.query("INSERT INTO admin_audit_logs (admin_id, admin_contact, action, target_type, target_id, details, ip_address) VALUES ($1, $1, 'BACKFILL_BUSINESS_SERIAL_NO', 'business', $2, $3::jsonb, 'system')", ["system:business-serial-backfill", business.id, JSON.stringify({ businessSerialNo: serial })]);
    }
    await client.query("COMMIT");
    console.log(`Assigned ${result.rowCount} business serial numbers.`);
  }
} catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
finally { await client.end(); }
