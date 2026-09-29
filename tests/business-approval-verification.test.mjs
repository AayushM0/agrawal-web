import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const moderateActionPath = path.join(webRoot, "src", "actions", "moderate.ts");
const moderationPagePath = path.join(webRoot, "src", "app", "admin", "moderation", "page.tsx");
const backfillPath = path.join(webRoot, "scripts", "backfill-verified-live-businesses.mjs");

test("approval always publishes and verifies a business in one action", () => {
  const action = fs.readFileSync(moderateActionPath, "utf8");

  assert.ok(
    !action.includes("awardVerifiedBadge?: boolean"),
    "approval must not expose an optional verification switch"
  );
  assert.ok(
    action.includes("approveAndVerifyBusinessProfile"),
    "approval must persist a live status and verified badge together"
  );
  assert.ok(
    action.includes("approved, published live, and verified"),
    "approval result must clearly describe the combined outcome"
  );
  assert.ok(
    action.includes("awardVerifiedBadge: true"),
    "approval audit metadata must record the granted badge"
  );
});

test("moderation UI offers one Approve and Verify Business action", () => {
  const page = fs.readFileSync(moderationPagePath, "utf8");

  assert.ok(!page.includes("awardVerifiedMap"), "UI must not retain optional badge state");
  assert.ok(!page.includes("Award Verified Enterprise Badge"), "UI must not show a separate badge checkbox");
  assert.ok(page.includes("Approve & Verify Business"), "UI must name the combined approval action");
  assert.ok(
    !page.includes("awardVerifiedBadge:"),
    "UI must send only the business identity to the combined approval action"
  );
});

test("backfill script is dry-run capable and only targets live unverified businesses", () => {
  assert.ok(fs.existsSync(backfillPath), "backfill script must exist");
  const script = fs.readFileSync(backfillPath, "utf8");

  assert.ok(script.includes("--dry-run"), "script must support a non-mutating dry run");
  assert.ok(script.includes("BEGIN"), "script must use a database transaction");
  assert.ok(script.includes("COMMIT"), "script must commit a successful backfill transaction");
  assert.ok(script.includes("status = 'live'"), "script must target live businesses only");
  assert.ok(script.includes("is_verified_badge = FALSE"), "script must target currently unverified businesses only");
  assert.ok(script.includes("BACKFILL_VERIFY_LIVE_BUSINESS"), "script must record a migration audit entry per business");
});
