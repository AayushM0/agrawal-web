import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("TDD: profile.ts blocks mutations for unactivated sessions", () => {
  const profileCode = fs.readFileSync(path.join(webRoot, "src/actions/profile.ts"), "utf8");

  // 1. saveMemberProfile must check isActivated
  assert.ok(
    profileCode.includes("isActivated === false") || profileCode.includes("!session.isActivated"),
    "saveMemberProfile must check session.isActivated"
  );

  // 2. saveHouseholdInfo must check isActivated
  assert.ok(
    profileCode.includes("Account activation required"),
    "profile.ts must return account activation required message"
  );

  // 3. addHouseholdMember must check isActivated
  assert.ok(
    profileCode.includes("session.isActivated === false") || profileCode.includes("!session.isActivated"),
    "addHouseholdMember must check session.isActivated"
  );
});

test("TDD: dashboard/page.tsx displays preview banner and intercepts gated actions", () => {
  const dashboardCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");

  // 1. Must track isActivated state
  assert.ok(
    dashboardCode.includes("isActivated"),
    "dashboard/page.tsx must maintain isActivated state"
  );

  // 2. Must render preview/unactivated banner
  assert.ok(
    dashboardCode.includes("preview mode") || dashboardCode.includes("Verify & Set Password") || dashboardCode.includes("Account Activation"),
    "dashboard/page.tsx must render preview or activation banner"
  );

  // 3. Modifying actions must be gated by activation check
  assert.ok(
    dashboardCode.includes("requireActivation") || dashboardCode.includes("checkActivation"),
    "dashboard/page.tsx must use an activation guard for gated actions"
  );
});

test("TDD: middleware.ts guards /directory against unactivated sessions", () => {
  const middlewareCode = fs.readFileSync(path.join(webRoot, "src/middleware.ts"), "utf8");

  assert.ok(
    middlewareCode.includes("isActivated === false") || middlewareCode.includes("!session.isActivated"),
    "middleware.ts must check session.isActivated for protected routes"
  );
});
