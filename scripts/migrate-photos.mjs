import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.argv.includes("--prod");
const isDryRun = process.argv.includes("--dry-run");

// Load Environment variables
let dbUrl = process.env.DATABASE_URL;
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const envContent = fs.readFileSync(filePath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "DATABASE_URL" && (!dbUrl || isProd)) dbUrl = val;
    if (key === "NEXT_PUBLIC_SUPABASE_URL" && (!supabaseUrl || isProd)) supabaseUrl = val;
    if (key === "SUPABASE_SERVICE_ROLE_KEY" && (!serviceKey || isProd)) serviceKey = val;
  }
}

if (isProd) {
  console.log("🌐 Target: PRODUCTION (.env.production.local)");
  loadEnvFile(path.join(__dirname, "../.env.production.local"));
} else {
  console.log("💻 Target: LOCAL (.env.local)");
  loadEnvFile(path.join(__dirname, "../.env.local"));
}

console.log("=== Base64 -> Supabase Storage Photo Migration ===");

if (!dbUrl) {
  console.error("❌ Missing DATABASE_URL");
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Supabase credentials are required to upload legacy images to cloud storage.");
  process.exit(1);
}

if (isDryRun) {
  console.log("🔍 Running in DRY-RUN mode. No changes will be applied.");
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("📡 Scanning database for legacy Base64 photos in 'members' table...");
    const res = await client.query(`
      SELECT id, full_name, photo_url 
      FROM members 
      WHERE photo_url IS NOT NULL 
        AND photo_url LIKE 'data:image/%';
    `);

    const membersWithBase64 = res.rows;
    console.log(`📸 Found ${membersWithBase64.length} members with Base64 photos stored in PostgreSQL.`);

    if (membersWithBase64.length === 0) {
      console.log("✅ All member photos are already clean URLs or empty. Nothing to migrate!");
      return;
    }

    let successCount = 0;
    let totalBytesFreed = 0;

    for (const m of membersWithBase64) {
      const b64 = m.photo_url;
      const b64Length = b64.length;
      totalBytesFreed += b64Length;

      const match = b64.trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
      if (!match) {
        console.warn(`⚠️ Skipping member ${m.id} (${m.full_name}): Unrecognized Base64 format.`);
        continue;
      }

      const contentType = match[1].toLowerCase();
      let ext = "jpg";
      if (contentType.includes("png")) ext = "png";
      else if (contentType.includes("webp")) ext = "webp";
      else if (contentType.includes("gif")) ext = "gif";
      else if (contentType.includes("svg")) ext = "svg";

      const rawB64 = match[2].trim().replace(/\s/g, "");
      const buffer = Buffer.from(rawB64, "base64");
      const cleanId = String(m.id).replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `avatars/member_${cleanId}-${Date.now()}.${ext}`;

      if (isDryRun) {
        console.log(`[DRY-RUN] Would upload ${b64Length} bytes for '${m.full_name}' -> ${fileName}`);
        successCount++;
        continue;
      }

      console.log(`⬆️ Uploading avatar for '${m.full_name}' (${(b64Length / 1024).toFixed(1)} KB)...`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("member-photos")
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error(`❌ Upload failed for member ${m.id}:`, uploadError.message);
        continue;
      }

      const { data: publicData } = supabase.storage
        .from("member-photos")
        .getPublicUrl(fileName);

      const publicUrl = publicData.publicUrl;

      // Update PostgreSQL record
      await client.query("UPDATE members SET photo_url = $1 WHERE id = $2;", [publicUrl, m.id]);
      console.log(`✅ Updated member '${m.full_name}' with CDN URL: ${publicUrl}`);
      successCount++;
    }

    console.log("\n" + "=".repeat(60));
    console.log(`🎉 Migration Finished: ${successCount}/${membersWithBase64.length} members migrated.`);
    console.log(`💾 Estimated database bloat eliminated: ${(totalBytesFreed / (1024 * 1024)).toFixed(2)} MB`);
    console.log("=".repeat(60));

  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
