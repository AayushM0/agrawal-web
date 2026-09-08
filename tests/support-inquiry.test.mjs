import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Support Inquiry: schema.sql contains support_inquiries table with RLS and indexes", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");

  assert.ok(
    schemaSql.includes("CREATE TABLE IF NOT EXISTS support_inquiries"),
    "schema.sql must contain support_inquiries table definition"
  );
  assert.ok(
    schemaSql.includes("ticket_id VARCHAR(32) NOT NULL UNIQUE"),
    "support_inquiries must have unique ticket_id column"
  );
  assert.ok(
    schemaSql.includes("ALTER TABLE support_inquiries ENABLE ROW LEVEL SECURITY"),
    "support_inquiries must have Row-Level Security enabled"
  );
  assert.ok(
    schemaSql.includes("idx_support_inquiries_created"),
    "support_inquiries must have index on created_at"
  );
});

test("Support Inquiry: db.ts includes support inquiry operations and ensureSchema migration", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  assert.ok(
    dbCode.includes("CREATE TABLE IF NOT EXISTS support_inquiries"),
    "db.ts ensureSchema must create support_inquiries table"
  );
  assert.ok(
    dbCode.includes("createSupportInquiry"),
    "db.ts must export createSupportInquiry method"
  );
  assert.ok(
    dbCode.includes("getSupportInquiries"),
    "db.ts must export getSupportInquiries method"
  );
  assert.ok(
    dbCode.includes("updateSupportInquiryStatus"),
    "db.ts must export updateSupportInquiryStatus method"
  );
  assert.ok(
    dbCode.includes("checkSupportRateLimit"),
    "db.ts must export checkSupportRateLimit method"
  );
});

test("Support Inquiry: submitSupportInquiry server action has validation and rate-limit guard", () => {
  const supportActionCode = fs.readFileSync(path.join(webRoot, "src/actions/support.ts"), "utf8");

  assert.ok(
    supportActionCode.includes("'use server'"),
    "support.ts must be a Next.js Server Action"
  );
  assert.ok(
    supportActionCode.includes("checkSupportRateLimit"),
    "support.ts must enforce rate limiting"
  );
  assert.ok(
    supportActionCode.includes("dispatchInquiryEmails"),
    "support.ts must trigger Resend email notifications"
  );
  assert.ok(
    supportActionCode.includes("contact@maharajaagrasenfoundation.com"),
    "support.ts must notify secretariat email"
  );
  assert.ok(
    supportActionCode.includes("substantiveMessage.length < 10"),
    "support.ts must validate minimum substantive message length"
  );
});

test("Support Inquiry: support page UI is wired to live server action", () => {
  const supportPageCode = fs.readFileSync(path.join(webRoot, "src/app/support/page.tsx"), "utf8");

  assert.ok(
    supportPageCode.includes("submitSupportInquiry"),
    "support/page.tsx must import and call submitSupportInquiry"
  );
  assert.ok(
    supportPageCode.includes("ticketId"),
    "support/page.tsx must display ticket reference"
  );
  assert.ok(
    supportPageCode.includes("+65 9277 4444"),
    "support/page.tsx must display +65 9277 4444 contact number"
  );
  assert.ok(
    supportPageCode.includes("wa.me/6592774444"),
    "support/page.tsx must contain direct WhatsApp link"
  );
});

test("Support Inquiry: moderation portal includes Inquiries tab and status handlers", () => {
  const modPageCode = fs.readFileSync(path.join(webRoot, "src/app/admin/moderation/page.tsx"), "utf8");

  assert.ok(
    modPageCode.includes("getAdminSupportInquiries"),
    "moderation page must load inquiries"
  );
  assert.ok(
    modPageCode.includes("handleUpdateInquiryStatus"),
    "moderation page must support status updates"
  );
  assert.ok(
    modPageCode.includes('filter === "inquiries"'),
    "moderation page must render inquiries view"
  );
  assert.ok(
    modPageCode.includes("inquiries.filter"),
    "moderation page must count open inquiries in tab badge"
  );
});

test("Support Inquiry: db.ts queries contain correct ticket generation and SQL commands", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  assert.ok(
    dbCode.includes("INSERT INTO support_inquiries"),
    "Must execute INSERT into support_inquiries"
  );
  assert.ok(
    dbCode.includes("SELECT id, ticket_id as \"ticketId\""),
    "Must select formatted fields from support_inquiries"
  );
  assert.ok(
    dbCode.includes("UPDATE support_inquiries"),
    "Must execute UPDATE on support_inquiries"
  );
  assert.ok(
    dbCode.includes("INTERVAL '1 hour'"),
    "Must enforce 1-hour rate limiting window"
  );
});
