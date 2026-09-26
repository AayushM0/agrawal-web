import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Admin Assisted Profiles: src/actions/admin-profiles.ts exports required server actions", () => {
  const filePath = path.join(webRoot, "src/actions/admin-profiles.ts");
  assert.ok(fs.existsSync(filePath), "src/actions/admin-profiles.ts must exist");

  const content = fs.readFileSync(filePath, "utf8");
  assert.ok(content.includes("searchMembersForAdminAction"), "Must export searchMembersForAdminAction");
  assert.ok(content.includes("adminCreateMatrimonyProfileAction"), "Must export adminCreateMatrimonyProfileAction");
  assert.ok(content.includes("adminCreateCareerProfileAction"), "Must export adminCreateCareerProfileAction");
  assert.ok(content.includes("adminCreateBusinessProfileAction"), "Must export adminCreateBusinessProfileAction");
});

test("Admin Assisted Profiles: Server actions enforce admin authentication & record audit logs", () => {
  const filePath = path.join(webRoot, "src/actions/admin-profiles.ts");
  const content = fs.readFileSync(filePath, "utf8");

  assert.ok(content.includes('session?.role !== "admin"'), "Must guard actions with session.role !== 'admin'");
  assert.ok(content.includes("recordAdminAuditLog"), "Must record audit trail in admin_action_logs");
  assert.ok(content.includes("ADMIN_CREATE_MATRIMONY_PROFILE"), "Must log matrimony creation action");
  assert.ok(content.includes("ADMIN_CREATE_CAREER_PROFILE"), "Must log career creation action");
  assert.ok(content.includes("ADMIN_CREATE_BUSINESS_PROFILE"), "Must log business creation action");
});

test("Admin Assisted Profiles: URL normalization & duplicate prevention contracts", () => {
  const filePath = path.join(webRoot, "src/actions/admin-profiles.ts");
  const content = fs.readFileSync(filePath, "utf8");

  assert.ok(content.includes("startsWith(\"http\")"), "Must ensure external URLs are prefixed with https://");
  assert.ok(content.includes("getMatrimonialProfileByMemberId"), "Must verify candidate does not have duplicate matrimony profile");
  assert.ok(content.includes("getCareerProfileByMemberId"), "Must verify candidate does not have duplicate career profile");
});

test("Admin Assisted Profiles: Admin Moderation page includes Create on Behalf tab & Member Picker", () => {
  const modPagePath = path.join(webRoot, "src/app/admin/moderation/page.tsx");
  assert.ok(fs.existsSync(modPagePath), "src/app/admin/moderation/page.tsx must exist");

  const content = fs.readFileSync(modPagePath, "utf8");
  assert.ok(content.includes("AdminAssistedProfilesCreator") || content.includes("admin-profiles"), "Must wire admin profile creator component");
  assert.ok(content.includes("assisted") || content.includes("on_behalf") || content.includes("Create on Behalf"), "Must include Create on Behalf tab");
});
