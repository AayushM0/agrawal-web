import fs from "node:fs";
import path from "node:path";
import pg from "pg";
const { Pool } = pg;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile(path.resolve(".env.local"));
loadEnvFile(path.resolve(".env"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing from environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function cleanSlate() {
  console.log("Connecting to PostgreSQL database...");
  const client = await pool.connect();
  try {
    console.log("Truncating all application data tables with CASCADE...");
    await client.query(`
      TRUNCATE TABLE 
        households, 
        members, 
        conversations, 
        messages, 
        message_reports, 
        otp_rate_limits, 
        admin_login_attempts 
      CASCADE;
    `);
    console.log("✅ Database tables successfully cleaned for fresh testing.");
  } catch (err) {
    console.error("Error truncating tables:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanSlate();
