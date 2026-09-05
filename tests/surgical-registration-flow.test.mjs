import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("TDD: register.ts allows optional password and issues unactivated preview session", () => {
  const registerCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  
  // 1. Password must be optional in RegisterHouseholdInput
  assert.ok(
    registerCode.includes("password?: string") || registerCode.includes("password?: string | undefined"),
    "RegisterHouseholdInput must declare password as optional"
  );

  // 2. Session created upon registration must record isActivated: false
  assert.ok(
    registerCode.includes("isActivated: false"),
    "createSession in register.ts must mark unactivated state (isActivated: false)"
  );

  // 3. Password hashing must be conditional on input.password presence
  assert.ok(
    registerCode.includes("if (input.password)") || registerCode.includes("input.password ?"),
    "Password hashing in register.ts must be conditional"
  );
});

test("TDD: signup/page.tsx Step 1 collects Email and Phone without upfront OTP/password", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // 1. Step 1 must have inputs for email and mobile phone
  assert.ok(
    signupCode.includes("Primary Email Address") || signupCode.includes("primaryEmail"),
    "Step 1 must have primary email input"
  );
  assert.ok(
    signupCode.includes("PhoneInputWithCountry") || signupCode.includes("primaryPhone"),
    "Step 1 must have primary mobile phone input"
  );

  // 2. Step 1 advance button must proceed directly to Step 2 without needing OTP verification
  assert.ok(
    signupCode.includes("setStep(2)"),
    "Step 1 must transition directly to Step 2 upon validating contacts"
  );

  // 3. Invariants: Step 2 Gotra, Photos, Native Place, and IDs must remain intact
  assert.ok(signupCode.includes("gotras"), "Must preserve 18 Gotras selector");
  assert.ok(signupCode.includes("optimizeImageForUpload"), "Must preserve image optimizer");
  assert.ok(signupCode.includes("calculateAge"), "Must preserve age calculator");
});
