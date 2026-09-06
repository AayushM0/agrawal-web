import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Concurrency Guard 1: db.ts defines REGISTRATION_CONCURRENCY_LOCK_ID and uses pg_advisory_xact_lock", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  assert.ok(
    dbCode.includes("REGISTRATION_CONCURRENCY_LOCK_ID"),
    "db.ts must define REGISTRATION_CONCURRENCY_LOCK_ID"
  );
  assert.ok(
    dbCode.includes("pg_advisory_xact_lock"),
    "db.ts must acquire pg_advisory_xact_lock to serialize concurrent registrations"
  );
});

test("Concurrency Guard 2: createHousehold and addMemberToHousehold both serialize with the advisory lock", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // createHousehold section
  const createIndex = dbCode.indexOf("async createHousehold");
  const createSection = dbCode.slice(createIndex, createIndex + 600);
  assert.ok(
    createSection.includes("pg_advisory_xact_lock"),
    "createHousehold must acquire transaction advisory lock"
  );

  // addMemberToHousehold section
  const addIndex = dbCode.indexOf("async addMemberToHousehold");
  const addSection = dbCode.slice(addIndex, addIndex + 600);
  assert.ok(
    addSection.includes("pg_advisory_xact_lock"),
    "addMemberToHousehold must acquire transaction advisory lock"
  );
});

test("Concurrency Guard 3: serial number generators query MAX existing serial numbers to prevent count drift", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  assert.ok(
    dbCode.includes("SELECT COALESCE(MAX(NULLIF(regexp_replace(serial_no, '[^0-9]', '', 'g'), '')::bigint), 0) as max_val"),
    "serial generators must check MAX existing serial number"
  );
});
