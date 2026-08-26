import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../src/lib/db.ts");
const dbCode = fs.readFileSync(dbPath, "utf8");

test("Contact availability: does not use empty LIKE patterns when querying emails", () => {
  // Ensure that getHouseholdByContact separates email and phone branches
  assert.ok(
    !dbCode.includes("[clean, canonical, last10, `%${last10}`]"),
    "getHouseholdByContact must not pass `%${last10}` unconditionally into SQL queries"
  );
  assert.ok(
    !dbCode.includes("[clean, canonical, `%${last10}`]"),
    "queries must not use uncontrolled LIKE clauses with `%${last10}` for email inputs"
  );
});
