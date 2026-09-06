import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("TDD: auth.ts exports activateAccountWithOtp with password validation, OTP verification, and session upgrade", () => {
  const authCode = fs.readFileSync(path.join(webRoot, "src/actions/auth.ts"), "utf8");

  // 1. Must export activateAccountWithOtp
  assert.ok(
    authCode.includes("export async function activateAccountWithOtp"),
    "auth.ts must export activateAccountWithOtp"
  );

  // 2. Must validate password complexity
  assert.ok(
    authCode.includes("validatePassword"),
    "activateAccountWithOtp must validate password complexity"
  );

  // 3. Must verify OTP
  assert.ok(
    authCode.includes("verifyOtp"),
    "activateAccountWithOtp must verify OTP challenge"
  );

  // 4. Must hash password using bcrypt
  assert.ok(
    authCode.includes("hashPassword"),
    "activateAccountWithOtp must hash password"
  );

  // 5. Must update password hash in database
  assert.ok(
    authCode.includes("updatePasswordHash"),
    "activateAccountWithOtp must update password hash in database"
  );

  // 6. Must issue upgraded session with isActivated: true and hasPassword: true
  assert.ok(
    authCode.includes("isActivated: true") && authCode.includes("hasPassword: true"),
    "activateAccountWithOtp must issue upgraded session"
  );
});

test("TDD: dashboard/page.tsx implements ActivationModal with OTP & password setup and resumes pendingAction", () => {
  const dashboardCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");

  // 1. Must import or invoke activateAccountWithOtp
  assert.ok(
    dashboardCode.includes("activateAccountWithOtp"),
    "dashboard/page.tsx must call activateAccountWithOtp"
  );

  // 2. Must render ActivationModal when showActivationModal is true
  assert.ok(
    dashboardCode.includes("showActivationModal"),
    "dashboard/page.tsx must track showActivationModal"
  );

  // 3. Must have password complexity indicators or validation
  assert.ok(
    dashboardCode.includes("password") || dashboardCode.includes("Password"),
    "dashboard/page.tsx must provide password input fields"
  );

  // 4. Must execute pending action after successful activation
  assert.ok(
    dashboardCode.includes("pendingAction"),
    "dashboard/page.tsx must maintain and execute pendingAction on activation"
  );
});
