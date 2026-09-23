import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const content = fs.readFileSync(file, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const prodEnv = loadEnv(path.join(webRoot, ".env.production.local"));
const localEnv = loadEnv(path.join(webRoot, ".env.local"));
const dbUrl = prodEnv.DATABASE_URL || localEnv.DATABASE_URL;

if (!dbUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const masked = dbUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
console.log("Connecting to:", masked);

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log("\n--- Public Tables & RLS Status ---");
    let disabledCount = 0;
    const disabledTables = [];
    for (const row of res.rows) {
      const status = row.rowsecurity ? "ENABLED" : "DISABLED (VULNERABLE)";
      console.log(`- ${row.tablename.padEnd(25)} : RLS ${status}`);
      if (!row.rowsecurity) {
        disabledCount++;
        disabledTables.push(row.tablename);
      }
    }

    console.log(`\nTotal tables: ${res.rows.length}, RLS Disabled: ${disabledCount}`);
    if (disabledTables.length > 0) {
      console.log("Tables needing RLS fix:", disabledTables);
    }

    const polRes = await client.query(`
      SELECT tablename, policyname, roles, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    console.log("\n--- Existing Policies ---");
    for (const pol of polRes.rows) {
      console.log(`- ${pol.tablename} [${pol.policyname}] (${pol.cmd}) for roles: ${pol.roles}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
