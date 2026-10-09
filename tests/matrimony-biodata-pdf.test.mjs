import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

test("renderBiodataPdf produces a non-empty PDF buffer", () => {
  const output = execFileSync(process.execPath, [
    "--experimental-strip-types",
    path.join(testDirectory, "fixtures", "render-matrimony-biodata-pdf.mjs"),
  ], { encoding: "utf8" });
  const result = JSON.parse(output);

  assert.equal(result.header, "%PDF-");
  assert.ok(result.length > 0);
});

test("biodata download UI exposes resilient download controls in member views", () => {
  const root = path.join(testDirectory, "..");
  const button = fs.readFileSync(path.join(root, "src", "components", "matrimony", "DownloadBiodataButton.tsx"), "utf8");
  const profilePage = fs.readFileSync(path.join(root, "src", "app", "matrimony", "[id]", "page.tsx"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "src", "app", "dashboard", "page.tsx"), "utf8");
  const adminCreator = fs.readFileSync(path.join(root, "src", "components", "admin", "AdminAssistedProfilesCreator.tsx"), "utf8");

  assert.match(button, /variant\?: "default" \| "outline" \| "admin"/);
  assert.match(button, /className\?: string/);
  assert.match(button, /Content-Disposition/);
  assert.match(button, /response\.status === 401/);
  assert.match(button, /Unable to generate biodata PDF right now/);
  assert.match(button, /inFlightRef/);
  assert.match(profilePage, /<DownloadBiodataButton/);
  assert.match(dashboard, /<DownloadBiodataButton/);
  assert.match(adminCreator, /<DownloadBiodataButton/);
  assert.match(adminCreator, /variant="admin"/);
});

test("canAccessMatrimonialBiodata enforces strict IDOR security boundaries", async () => {
  const { canAccessMatrimonialBiodata } = await import("../src/lib/matrimony-access.ts");

  const sampleProfile = {
    id: "prof-100",
    householdId: "house-100",
    memberId: "mem-100",
    createdByUserId: "user-creator",
    status: "active",
    gender: "male",
    fullName: "Aarav Bansal",
    createdFor: "Self",
    gotra: "Bansal",
    highestEducation: "M.Tech",
    employmentSector: "Public",
    occupationTitle: "Researcher",
    fatherName: "Father Bansal",
    motherName: "Mother Bansal",
    nativePlace: "Agroha",
    familyLocation: "Singapore",
    contactPerson: "Father Bansal",
    contactRelation: "Father",
    contactPhone: "+65 9111 2222",
    photos: [],
    customFields: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Unauthenticated request
  assert.equal(await canAccessMatrimonialBiodata(null, sampleProfile), false);
  assert.equal(await canAccessMatrimonialBiodata({ userId: undefined }, sampleProfile), false);

  // 2. System Admin
  assert.equal(await canAccessMatrimonialBiodata({ userId: "admin-1", role: "admin" }, sampleProfile), true);

  // 3. Creator of the profile
  assert.equal(await canAccessMatrimonialBiodata({ userId: "user-creator" }, sampleProfile), true);

  // 4. Candidate themselves
  assert.equal(await canAccessMatrimonialBiodata({ userId: "mem-100" }, sampleProfile), true);

  // 5. Approved household member
  assert.equal(await canAccessMatrimonialBiodata({ userId: "house-member", householdId: "house-100" }, sampleProfile), true);

  // 6. Unauthorized non-owner stranger
  assert.equal(await canAccessMatrimonialBiodata({ userId: "stranger-99", householdId: "house-other" }, sampleProfile), false);

  // 7. Approved mutual contact match
  globalThis.__approvedMatrimonialMatches = new Set(["mutual-user:mem-100"]);
  assert.equal(await canAccessMatrimonialBiodata({ userId: "mutual-user" }, sampleProfile), true);
  globalThis.__approvedMatrimonialMatches.clear();
  assert.equal(await canAccessMatrimonialBiodata({ userId: "mutual-user" }, sampleProfile), false);
});

test("sanitizeBiodataInput neutralizes XSS and unauthorized URL schemes", async () => {
  const { sanitizeBiodataInput } = await import("../src/lib/matrimony-biodata-template.ts");

  const maliciousProfile = {
    id: "prof-malicious",
    fullName: "Aarav<script>alert('xss')</script> Singhal",
    aboutMe: "Intro<iframe src='http://evil.com'></iframe>Safe",
    college: "IIT<embed src='payload.swf'>",
    photoUrl: "file:///etc/passwd",
    residentialAddress: "javascript:alert(document.cookie)",
    gotra: "Singhal",
    fatherName: "Father<object data='exploit'></object>",
    motherName: "Mother",
    nativePlace: "Agroha",
    familyLocation: "Singapore",
    contactPerson: "Contact",
    contactPhone: "+65 1234 5678",
  };

  const clean = sanitizeBiodataInput(maliciousProfile);

  assert.equal(clean.fullName, "Aarav Singhal");
  assert.equal(clean.aboutMe, "IntroSafe");
  assert.equal(clean.college, "IIT");
  assert.equal(clean.photoUrl, undefined);
  assert.equal(clean.residentialAddress, "");
  assert.equal(clean.fatherName, "Father");
});

test("ChromiumRenderPool enforces bounded concurrency semaphore", async () => {
  const { ChromiumRenderPool } = await import("../src/lib/matrimony-pdf.ts");

  assert.equal(ChromiumRenderPool.max, 3);
  assert.equal(ChromiumRenderPool.active, 0);

  await ChromiumRenderPool.acquire();
  assert.equal(ChromiumRenderPool.active, 1);

  await ChromiumRenderPool.acquire();
  assert.equal(ChromiumRenderPool.active, 2);

  ChromiumRenderPool.release();
  ChromiumRenderPool.release();
  assert.equal(ChromiumRenderPool.active, 0);
});

