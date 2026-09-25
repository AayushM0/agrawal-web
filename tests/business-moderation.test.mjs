import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Task 6: src/actions/moderate.ts exports approveBusinessProfileAction and rejectBusinessProfileAction with admin session check", () => {
  const modActionsPath = path.join(webRoot, "src/actions/moderate.ts");
  assert.ok(fs.existsSync(modActionsPath), "src/actions/moderate.ts must exist");

  const content = fs.readFileSync(modActionsPath, "utf8");
  assert.ok(
    content.includes("approveBusinessProfileAction"),
    "Must export approveBusinessProfileAction"
  );
  assert.ok(
    content.includes("rejectBusinessProfileAction"),
    "Must export rejectBusinessProfileAction"
  );
  assert.ok(
    content.includes("getPendingBusinessProfilesAction"),
    "Must export getPendingBusinessProfilesAction"
  );
  assert.ok(
    content.includes('role !== "admin"') || content.includes("Admin privileges required"),
    "Moderation actions must enforce admin role check"
  );
});

test("Task 6: Admin moderation UI renders 'Business Directory' tab and review controls", () => {
  const modPagePath = path.join(webRoot, "src/app/admin/moderation/page.tsx");
  assert.ok(fs.existsSync(modPagePath), "src/app/admin/moderation/page.tsx must exist");

  const content = fs.readFileSync(modPagePath, "utf8");
  assert.ok(
    content.includes("approveBusinessProfileAction"),
    "Moderation page must import approveBusinessProfileAction"
  );
  assert.ok(
    content.includes("rejectBusinessProfileAction"),
    "Moderation page must import rejectBusinessProfileAction"
  );
  assert.ok(
    content.includes("Businesses") || content.includes("व्यापार"),
    "Moderation page must render Business Directory tab"
  );
  assert.ok(
    content.includes("awardVerified") || content.includes("Verified Enterprise Badge") || content.includes("is_verified_badge"),
    "Must support awarding Verified Enterprise Badge upon approval"
  );
});
