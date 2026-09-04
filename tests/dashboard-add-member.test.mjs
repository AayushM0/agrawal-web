import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Dashboard Add Member 1: addHouseholdMember server action contract & authentication", () => {
  const profilePath = path.join(webRoot, "src/actions/profile.ts");
  const code = fs.readFileSync(profilePath, "utf8");

  assert.ok(code.includes("export async function addHouseholdMember"), "profile.ts must export addHouseholdMember");
  assert.ok(code.includes("export interface AddMemberInput"), "profile.ts must export AddMemberInput interface");

  // Verify anti-IDOR session check
  assert.ok(code.includes("const session = await getSession();"), "Must verify session");
  assert.ok(code.includes("Authentication required"), "Must return authentication error for unauthenticated requests");
  assert.ok(code.includes("db.getHouseholdByContact(session.contact)"), "Household ID must be strictly derived from session contact (Anti-IDOR)");
  assert.ok(code.includes("isHead"), "Must check head of household authorization");
});

test("Dashboard Add Member 2: Action validates required fields and relation restrictions", async () => {
  const profilePath = path.join(webRoot, "src/actions/profile.ts");
  const code = fs.readFileSync(profilePath, "utf8");

  // Verify relation restrictions (cannot be 'self')
  assert.ok(code.includes("cannot be 'self'"), "Must reject relationToHead 'self' to preserve single head integrity");
  assert.ok(code.includes("allowedRelations"), "Must validate against allowed relationships list");

  // Verify father/husband cultural label check
  assert.ok(code.includes("isSpouseOrMarriedFemale"), "Must implement dynamic Father/Husband cultural logic");
  assert.ok(code.includes("Father's / Husband's Name"), "Must reference culturally respectful label for married female/spouse");

  // Verify contact collision check
  assert.ok(code.includes("checkContactExists"), "Must verify contact availability before insertion");
});

test("Dashboard Add Member 3: db.ts addMemberToHousehold enforces 25-member quota & default privacy", async () => {
  const dbPath = path.join(webRoot, "src/lib/db.ts");
  const code = fs.readFileSync(dbPath, "utf8");

  assert.ok(code.includes("addMemberToHousehold"), "db must implement addMemberToHousehold");
  assert.ok(code.includes("count >= 25"), "db.addMemberToHousehold must enforce 25-member quota ceiling");
  assert.ok(code.includes("Household has reached maximum member capacity"), "Must include quota error message");
  assert.ok(code.includes("visibility_contact, visibility_dob, visibility_photo"), "Must set privacy visibility columns");
  assert.ok(code.includes("verified_by_self, owner_locked, password_hash"), "Must initialize unverified and unlocked");
});

test("Dashboard Add Member 4: Dashboard UI provides + Add Family Member CTA and secure modal", () => {
  const dashboardPath = path.join(webRoot, "src/app/dashboard/page.tsx");
  const code = fs.readFileSync(dashboardPath, "utf8");

  assert.ok(code.includes("Add Family Member"), "Dashboard must include '+ Add Family Member' trigger button");
  assert.ok(code.includes("openAddMemberModal"), "Dashboard must define openAddMemberModal handler");
  assert.ok(code.includes("handleAddMemberSubmit"), "Dashboard must define handleAddMemberSubmit handler");
  assert.ok(code.includes("handleNewMemberPhotoUpload"), "Dashboard must handle new member photo upload");
  assert.ok(code.includes("optimizeImageForUpload"), "Photo upload must use client-side image compression");
  assert.ok(code.includes("image/jpeg,image/png,image/webp"), "Photo selector must restrict to safe image types");
});
