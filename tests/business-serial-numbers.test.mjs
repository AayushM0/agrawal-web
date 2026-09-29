import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.join(import.meta.dirname, "..");
const db = fs.readFileSync(path.join(root, "src/lib/db.ts"), "utf8");
const schema = fs.readFileSync(path.join(root, "src/db/schema.sql"), "utf8");
const template = fs.readFileSync(path.join(root, "..", "opendesign/mockups/business-certificate/verified-business-email-template.html"), "utf8");
const backfill = fs.readFileSync(path.join(root, "scripts/backfill-business-serial-numbers.mjs"), "utf8");

test("business serials use a unique MAFLBUS format and approval assigns them", () => {
  assert.ok(schema.includes("business_serial_no VARCHAR(32) UNIQUE"));
  assert.ok(db.includes("generateNextBusinessSerialNo"));
  assert.ok(db.includes("MAFLBUS-${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 9)}"));
  assert.ok(db.includes("approveAndVerifyBusinessProfile"));
  assert.ok(db.includes("business_serial_no = NULL"));
});

test("backfill is transactional and deterministic", () => {
  assert.ok(backfill.includes("ORDER BY created_at ASC, id ASC FOR UPDATE"));
  assert.ok(backfill.includes("BEGIN") && backfill.includes("COMMIT"));
  assert.ok(backfill.includes("BACKFILL_BUSINESS_SERIAL_NO"));
});

test("email certificate uses the serial and foundation website", () => {
  assert.ok(template.includes("{{business_serial_no}}"));
  assert.ok(template.includes("https://www.maharajaagrasenfoundation.com/"));
});
