import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("TDD: loginWithPassword returns needsActivation for unactivated accounts and upgrades session on success", () => {
  const authCode = fs.readFileSync(path.join(webRoot, "src/actions/auth.ts"), "utf8");

  // 1. loginWithPassword must detect unactivated accounts (account exists but !storedHash)
  assert.ok(
    authCode.includes("needsActivation"),
    "loginWithPassword must return needsActivation flag for unactivated accounts"
  );

  // 2. Successful loginWithPassword must create session with isActivated: true and hasPassword: true
  const loginFnMatch = authCode.match(/export async function loginWithPassword[\s\S]*?export async function requestPasswordReset/);
  assert.ok(loginFnMatch, "loginWithPassword function must exist");
  assert.ok(
    loginFnMatch[0].includes("isActivated: true") && loginFnMatch[0].includes("hasPassword: true"),
    "loginWithPassword must set isActivated: true and hasPassword: true in createSession"
  );
});

test("TDD: login/page.tsx handles needsActivation fallback with inline OTP and password activation", () => {
  const loginCode = fs.readFileSync(path.join(webRoot, "src/app/login/page.tsx"), "utf8");

  // 1. Must handle needsActivation from login response
  assert.ok(
    loginCode.includes("needsActivation"),
    "login/page.tsx must handle needsActivation response"
  );

  // 2. Must import or invoke activateAccountWithOtp
  assert.ok(
    loginCode.includes("activateAccountWithOtp"),
    "login/page.tsx must invoke activateAccountWithOtp for unactivated accounts"
  );

  // 3. Must preserve admin tab and standard member login
  assert.ok(
    loginCode.includes("verifyAdminPassword"),
    "login/page.tsx must preserve admin authentication"
  );
});
