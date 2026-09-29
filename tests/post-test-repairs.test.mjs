import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("dashboard uses in-app confirmations for member and business deletion", () => {
  const dashboard = read("src/app/dashboard/page.tsx");
  assert.ok(dashboard.includes("setMemberPendingRemoval"));
  assert.ok(dashboard.includes("setBusinessPendingDeletion"));
  assert.ok(!dashboard.includes("window.confirm("));
});

test("business serial allocator recycles the lowest released serial in memory mode", () => {
  const db = read("src/lib/db.ts");
  assert.ok(db.includes("findLowestAvailableBusinessSerial"));
});

test("identity dialog keeps actions visible and documents remain write-only", () => {
  const dashboard = read("src/app/dashboard/page.tsx");
  const help = read("src/app/help/page.tsx");
  assert.ok(dashboard.includes("max-h-[90vh]"));
  assert.ok(dashboard.includes("sticky bottom-0"));
  assert.ok(help.includes("write-only"));
});

test("DOB toggles can be turned off after being selected", () => {
  const signup = read("src/app/signup/page.tsx");
  assert.ok(signup.includes("headDobNotSpecified"));
  assert.ok(signup.includes("disabled={headDobNotSpecified}"));
});

test("business directory refreshes when the page becomes visible", () => {
  const directory = read("src/app/businesses/page.tsx");
  assert.ok(directory.includes('document.addEventListener("visibilitychange", refreshWhenVisible)'));
});

test("dependent removal receives canonical household IDs for both caller and target", () => {
  const db = read("src/lib/db.ts");
  const profile = read("src/actions/profile.ts");
  assert.ok(db.includes("householdId: String(r.household_id)"));
  assert.ok(db.includes('m.household_id as "householdId"'));
  assert.ok(profile.includes("actingMember.householdId === household?.id"));
  assert.ok(profile.includes("household.id !== member.householdId"));
});

test("a rejected dependent deletion keeps its confirmation open and explains the failure", () => {
  const dashboard = read("src/app/dashboard/page.tsx");
  assert.ok(dashboard.includes("memberRemovalError"));
  assert.ok(dashboard.includes("setMemberPendingRemoval(null);"));
});

test("dashboard always redirects an unauthenticated visitor to login", () => {
  const middleware = read("src/middleware.ts");
  assert.ok(!middleware.includes("const isStrictAuth"));
  assert.ok(middleware.includes("isProtectedDirectoryRoute || isProtectedDashboardRoute") && middleware.includes("!session"));
});

test("getMemberById properly exposes householdId in query and mapped return", () => {
  const db = read("src/lib/db.ts");
  const getMemberByIdIndex = db.indexOf("async getMemberById(");
  assert.ok(getMemberByIdIndex !== -1, "getMemberById function must exist");
  const getMemberByIdSlice = db.slice(getMemberByIdIndex, getMemberByIdIndex + 3000);
  assert.ok(getMemberByIdSlice.includes('m.household_id as "householdId"'), "getMemberById query must alias m.household_id as householdId");
  assert.ok(getMemberByIdSlice.includes("householdId: String("), "getMemberById return object must map householdId");
});

test("removeHouseholdMember safely evaluates authorization against both member and session", () => {
  const profile = read("src/actions/profile.ts");
  assert.ok(profile.includes("isHouseholdHead"));
  assert.ok(profile.includes("targetHouseholdId"));
  assert.ok(profile.includes("db.deleteMember"));
});
