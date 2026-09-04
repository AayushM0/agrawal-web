import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePassword, hashPassword, verifyPassword, evaluateLockout } from "../src/lib/auth-crypto.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Auth Lifecycle 1: Telecom and Twilio code is removed from otp.ts", () => {
  const otpCode = fs.readFileSync(path.join(__dirname, "../src/actions/otp.ts"), "utf8");
  assert.ok(!otpCode.includes("TWILIO_ACCOUNT_SID"), "TWILIO_ACCOUNT_SID should be removed from otp.ts");
  assert.ok(!otpCode.includes("verify_api:"), "Twilio Verify cookie token should be removed");
  assert.ok(!otpCode.includes("api.twilio.com"), "Twilio endpoints should be removed");
  assert.ok(otpCode.includes("RESEND_API_KEY"), "Resend email engine must be preserved");
});

test("Auth Lifecycle 2: Password hashing, verification, and complexity", async () => {
  const pwd = "Agr@walSecure2026";
  const validation = validatePassword(pwd);
  assert.equal(validation.valid, true);

  const hash = await hashPassword(pwd);
  assert.ok(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$"), "Hash must use bcrypt Cost Factor 12");

  const validMatch = await verifyPassword(pwd, hash);
  assert.equal(validMatch, true, "Valid password must verify");

  const wrongMatch = await verifyPassword("WrongPassword123!", hash);
  assert.equal(wrongMatch, false, "Invalid password must be rejected");
});

test("Auth Lifecycle 3: Brute-force lockout triggers on 5 consecutive failures", () => {
  const now = Date.now();
  const failedAttempts = [
    { success: false, created_at: new Date(now - 1 * 60 * 1000) },
    { success: false, created_at: new Date(now - 2 * 60 * 1000) },
    { success: false, created_at: new Date(now - 3 * 60 * 1000) },
    { success: false, created_at: new Date(now - 4 * 60 * 1000) },
    { success: false, created_at: new Date(now - 5 * 60 * 1000) },
  ];

  const lockout = evaluateLockout(failedAttempts, now);
  assert.equal(lockout.locked, true, "5 consecutive failures must lock account");
  assert.ok(lockout.remainingMinutes && lockout.remainingMinutes > 0, "Must calculate remaining lockout minutes");

  const successInterrupted = [
    { success: false, created_at: new Date(now - 1 * 60 * 1000) },
    { success: true, created_at: new Date(now - 2 * 60 * 1000) },
    ...failedAttempts.slice(2),
  ];
  const unlocked = evaluateLockout(successInterrupted, now);
  assert.equal(unlocked.locked, false, "Successful attempt breaks the failure streak");
});

test("Auth Lifecycle 4: Password update and invalidation flow", async () => {
  const oldPassword = "InitialPassword123!";
  const newPassword = "UpdatedPassword456@";

  let storedHash = await hashPassword(oldPassword);
  assert.equal(await verifyPassword(oldPassword, storedHash), true);

  // Simulate password reset update
  storedHash = await hashPassword(newPassword);

  // New password authenticates
  assert.equal(await verifyPassword(newPassword, storedHash), true);

  // Old password is now rejected
  assert.equal(await verifyPassword(oldPassword, storedHash), false);
});

test("Auth Lifecycle 5: Server action exports and contracts adhere to OWASP", () => {
  const authCode = fs.readFileSync(path.join(__dirname, "../src/actions/auth.ts"), "utf8");
  assert.ok(authCode.includes("loginWithPassword"), "auth.ts exports loginWithPassword");
  assert.ok(authCode.includes("requestPasswordReset"), "auth.ts exports requestPasswordReset");
  assert.ok(authCode.includes("resetPasswordWithOtp"), "auth.ts exports resetPasswordWithOtp");
  assert.ok(authCode.includes("checkLoginLockout"), "auth.ts exports checkLoginLockout");
  assert.ok(authCode.includes("Invalid email or password"), "auth.ts uses anti-enumeration error");
  assert.ok(authCode.includes("If an account exists with this email"), "auth.ts uses anti-enumeration reset message");
});
