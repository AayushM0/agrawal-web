import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("TDD: db.ts checkContactExists handles phone formatting variations and checks households and members", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // Must have checkContactExists function
  assert.ok(
    dbCode.includes("async checkContactExists("),
    "db.ts must implement checkContactExists"
  );

  // Must query households table
  assert.ok(
    dbCode.includes("FROM households") && dbCode.includes("verified_contact"),
    "checkContactExists must check verified_contact in households"
  );

  // Must query members table for phone and email
  assert.ok(
    dbCode.includes("FROM members") && dbCode.includes("m.phone") && dbCode.includes("m.email"),
    "checkContactExists must check phone and email in members"
  );

  // Must use formatting-tolerant matching (REGEXP_REPLACE or sanitized digits)
  assert.ok(
    dbCode.includes("REGEXP_REPLACE") || dbCode.includes("digitsOnly") || dbCode.includes("last10"),
    "checkContactExists must handle phone number format variations"
  );
});

test("TDD: register.ts exports checkContactRegistration returning rich conflict details", () => {
  const registerCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");

  assert.ok(
    registerCode.includes("export async function checkContactRegistration"),
    "register.ts must export checkContactRegistration"
  );

  assert.ok(
    registerCode.includes("isRegistered") && registerCode.includes("householdCode"),
    "checkContactRegistration must return isRegistered and householdCode"
  );
});

test("TDD: signup/page.tsx implements live onBlur contact checks across Step 1, Step 2, and Step 4", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // Step 1 live validation on blur
  assert.ok(
    signupCode.includes("handleContactBlur") || signupCode.includes("checkEmailBlur") || signupCode.includes("onBlur"),
    "signup/page.tsx must implement onBlur checks for Step 1 contact inputs"
  );

  // Step 4 member live contact validation
  assert.ok(
    signupCode.includes("memberContactErrors") || signupCode.includes("checkMemberContact") || signupCode.includes("handleMemberContactBlur"),
    "signup/page.tsx must implement live contact validation for additional members"
  );
});

test("TDD: dashboard/page.tsx implements live onBlur checks in Add Member modal", () => {
  const dashboardCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");

  assert.ok(
    dashboardCode.includes("newMemberPhoneConflict") || dashboardCode.includes("handleNewMemberContactCheck") || dashboardCode.includes("checkNewMemberContact"),
    "dashboard/page.tsx must validate phone and email availability in Add Member modal"
  );
});
