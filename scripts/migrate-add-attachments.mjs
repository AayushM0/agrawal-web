/**
 * migrate-add-attachments.mjs
 *
 * Idempotent migration that:
 * 1. ALTERs the messages table to add 4 attachment columns and make message_body nullable
 * 2. Creates the private 'chat-attachments' Supabase Storage bucket (if not exists)
 *
 * Usage:
 *   node --env-file=.env.production.local scripts/migrate-add-attachments.mjs
 *   node --env-file=.env.local scripts/migrate-add-attachments.mjs
 */

import pg from "pg";

const { Client } = pg;

const connStr = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("?pgbouncer=true", "")
  : "postgresql://localhost:5432/agrawal_dev";

console.log("\n🔧 Connecting to:", connStr.replace(/:\/\/[^@]*@/, "://<creds>@"));

const client = new Client({ connectionString: connStr });
await client.connect();

// ── 1. Alter messages table (idempotent) ─────────────────────────────────────
console.log("\n📦 Applying messages table migration...");

await client.query(`
  ALTER TABLE messages
    ALTER COLUMN message_body DROP NOT NULL
`).catch(e => {
  if (e.message.includes("column") && e.message.includes("not null")) {
    console.log("   ✓ message_body already nullable");
  } else {
    throw e;
  }
});

const alterStatements = [
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url   TEXT`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type  VARCHAR(20)`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name  TEXT`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size  INTEGER`,
  `CREATE INDEX IF NOT EXISTS idx_messages_has_attachment ON messages(conversation_id) WHERE attachment_url IS NOT NULL`,
];

for (const stmt of alterStatements) {
  await client.query(stmt);
  console.log("   ✓", stmt.slice(0, 60).trim() + "...");
}

// ── 2. Verify columns exist ───────────────────────────────────────────────────
const colCheck = await client.query(`
  SELECT column_name, is_nullable, data_type
  FROM information_schema.columns
  WHERE table_name = 'messages'
  AND column_name IN ('message_body', 'attachment_url', 'attachment_type', 'attachment_name', 'attachment_size')
  ORDER BY column_name
`);

console.log("\n✅ Messages table columns after migration:");
colCheck.rows.forEach(r => {
  console.log(`   ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
});

await client.end();

// ── 3. Create private Supabase Storage bucket ─────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("\n⚠  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping bucket creation.");
  process.exit(0);
}

console.log("\n🗂️  Creating Supabase Storage bucket 'chat-attachments'...");

// Check if bucket already exists
const listRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  },
});

const buckets = await listRes.json();
const existing = Array.isArray(buckets) && buckets.find(b => b.name === "chat-attachments");

if (existing) {
  console.log("   ✓ Bucket 'chat-attachments' already exists (public:", existing.public, ")");
} else {
  const createRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "chat-attachments",
      name: "chat-attachments",
      public: false,             // PRIVATE — access via signed URLs only
      file_size_limit: 10485760, // 10 MB
      allowed_mime_types: [
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
        "video/mp4", "video/quicktime", "video/webm",
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
    }),
  });

  const createBody = await createRes.json();
  if (createRes.ok) {
    console.log("   ✅ Bucket 'chat-attachments' created successfully (private)");
  } else {
    console.error("   ❌ Failed to create bucket:", JSON.stringify(createBody));
    process.exit(1);
  }
}

console.log("\n🎉 Migration complete!\n");
