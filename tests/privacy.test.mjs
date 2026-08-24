import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 010: src/lib/privacy.ts exists and exports required pure functions", () => {
  const privacyPath = path.join(webRoot, "src/lib/privacy.ts");
  assert.ok(fs.existsSync(privacyPath), "src/lib/privacy.ts must exist");

  const content = fs.readFileSync(privacyPath, "utf8");
  assert.ok(content.includes("export function calculateAge"), "Must export calculateAge");
  assert.ok(content.includes("export function maskPhone"), "Must export maskPhone");
  assert.ok(content.includes("export function maskEmail"), "Must export maskEmail");
  assert.ok(content.includes("export function maskGovtId"), "Must export maskGovtId");
  assert.ok(content.includes("export function maskContact"), "Must export maskContact");
  assert.ok(content.includes("export function sanitizeMemberProfile"), "Must export sanitizeMemberProfile");
});

test("Issue 010: Frontend pages must import privacy helpers from @/lib/privacy", () => {
  const signupPage = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");
  const directoryPage = fs.readFileSync(path.join(webRoot, "src/app/directory/page.tsx"), "utf8");
  const directoryIdPage = fs.readFileSync(path.join(webRoot, "src/app/directory/[id]/page.tsx"), "utf8");
  const dashboardPage = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");

  assert.ok(signupPage.includes("@/lib/privacy"), "signup/page.tsx must import from @/lib/privacy");
  assert.ok(directoryPage.includes("@/lib/privacy"), "directory/page.tsx must import from @/lib/privacy");
  assert.ok(directoryIdPage.includes("@/lib/privacy"), "directory/[id]/page.tsx must import from @/lib/privacy");
  assert.ok(dashboardPage.includes("@/lib/privacy"), "dashboard/page.tsx must import from @/lib/privacy");

  // Verify local duplicated declarations are removed
  assert.ok(!signupPage.includes("function calculateAge"), "signup/page.tsx should not define local calculateAge");
  assert.ok(!directoryPage.includes("function calculateAge"), "directory/page.tsx should not define local calculateAge");
  assert.ok(!directoryIdPage.includes("function maskPhone"), "directory/[id]/page.tsx should not define local maskPhone");
  assert.ok(!dashboardPage.includes("function maskContact"), "dashboard/page.tsx should not define local maskContact");
});
