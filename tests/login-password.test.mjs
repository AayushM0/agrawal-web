import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("TDD: auth.ts exports loginWithPassword and checkLoginLockout", async () => {
  const authFile = fs.readFileSync(path.join(__dirname, "../src/actions/auth.ts"), "utf8");
  assert.ok(authFile.includes("export async function loginWithPassword"), "auth.ts must export loginWithPassword");
  assert.ok(authFile.includes("checkLoginLockout"), "auth.ts must implement or use checkLoginLockout");
  assert.ok(authFile.includes("recordLoginAttempt"), "loginWithPassword must record login attempts");
  assert.ok(authFile.includes("verifyPassword"), "loginWithPassword must verify password using bcrypt");
  assert.ok(authFile.includes("Invalid email or password"), "loginWithPassword must use OWASP generic error");
});

test("TDD: login/page.tsx renders password login for members", () => {
  const loginPage = fs.readFileSync(path.join(__dirname, "../src/app/login/page.tsx"), "utf8");
  assert.ok(loginPage.includes("loginWithPassword"), "login page must call loginWithPassword");
  assert.ok(loginPage.includes("showPassword") || loginPage.includes("type=\"password\""), "login page must have password field with toggle");
  assert.ok(loginPage.includes("/forgot-password"), "login page must have Forgot Password link");
});
