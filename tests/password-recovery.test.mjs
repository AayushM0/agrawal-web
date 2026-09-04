import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("TDD: auth.ts exports requestPasswordReset and resetPasswordWithOtp", () => {
  const authFile = fs.readFileSync(path.join(__dirname, "../src/actions/auth.ts"), "utf8");
  assert.ok(authFile.includes("export async function requestPasswordReset"), "auth.ts must export requestPasswordReset");
  assert.ok(authFile.includes("export async function resetPasswordWithOtp"), "auth.ts must export resetPasswordWithOtp");
  assert.ok(authFile.includes("updatePasswordHash"), "resetPasswordWithOtp must call db.updatePasswordHash");
  assert.ok(authFile.includes("validatePassword"), "resetPasswordWithOtp must validate password complexity");
});

test("TDD: forgot-password/page.tsx wizard exists and handles 2-step reset", () => {
  const pagePath = path.join(__dirname, "../src/app/forgot-password/page.tsx");
  assert.ok(fs.existsSync(pagePath), "forgot-password page must exist");
  const pageContent = fs.readFileSync(pagePath, "utf8");
  assert.ok(pageContent.includes("requestPasswordReset"), "page must call requestPasswordReset");
  assert.ok(pageContent.includes("resetPasswordWithOtp"), "page must call resetPasswordWithOtp");
  assert.ok(pageContent.includes("showPassword") || pageContent.includes("type=\"password\""), "page must render password input");
  assert.ok(pageContent.includes("/login"), "page must link back to login");
});
