import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Serial Numbering 1: DB schema defines serial_no on members and households", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  assert.ok(
    schemaSql.includes("serial_no VARCHAR(32) UNIQUE"),
    "members table must define serial_no VARCHAR(32) UNIQUE"
  );
  assert.ok(
    schemaSql.includes("CREATE INDEX IF NOT EXISTS idx_members_serial_no ON members(serial_no);"),
    "members table must have index on serial_no"
  );
});

test("Serial Numbering 2: db.ts implements generateNextHouseholdNo with HHN format and generateNextMemberSerialNo with MAFL format", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  assert.ok(
    dbCode.includes("generateNextHouseholdNo"),
    "db.ts must implement generateNextHouseholdNo"
  );
  assert.ok(
    dbCode.includes("generateNextMemberSerialNo"),
    "db.ts must implement generateNextMemberSerialNo"
  );
  assert.ok(
    dbCode.includes("`HHN-${part1}-${part2}-${part3}`"),
    "db.ts must format households with HHN-000-000-000"
  );
  assert.ok(
    dbCode.includes("`MAFL-${part1}-${part2}-${part3}`"),
    "db.ts must format members with MAFL-000-000-000"
  );
});

test("Serial Numbering 3: Unified pass data prioritizes individual member serial number", async () => {
  const { createUnifiedPassData } = await import("../src/lib/pass.ts");

  const member = {
    fullName: "Pooja Agrawal",
    relationToHead: "spouse",
    currentCity: "Jaipur",
    gotra: "Goyal",
    serialNo: "MAFL-000-000-002",
    householdCode: "HHN-000-000-001",
  };

  const household = {
    gotra: "Goyal",
    householdCode: "HHN-000-000-001",
    serialNo: "HHN-000-000-001",
  };

  const passData = createUnifiedPassData({ member, household });
  assert.equal(
    passData.serialNo,
    "MAFL-000-000-002",
    "Pass must use member's distinct MAFL serial number, not household HHN"
  );
  assert.equal(passData.householdCode, "HHN-000-000-001");
});

test("Serial Numbering 4: Dashboard pass page prioritizes member serial number", () => {
  const passPageCode = fs.readFileSync(
    path.join(webRoot, "src/app/dashboard/pass/page.tsx"),
    "utf8"
  );
  assert.ok(
    passPageCode.includes("serialNo: member.serialNo"),
    "dashboard pass page must check member.serialNo before household.serialNo"
  );
});
