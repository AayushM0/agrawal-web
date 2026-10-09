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

test("ChromiumRenderPool enforces bounded concurrency semaphore and FIFO queueing", async () => {
  const { ChromiumRenderPool } = await import("../src/lib/matrimony-pdf.ts");

  assert.equal(ChromiumRenderPool.max, 3);
  assert.equal(ChromiumRenderPool.active, 0);

  // Fill all 3 slots
  await ChromiumRenderPool.acquire();
  await ChromiumRenderPool.acquire();
  await ChromiumRenderPool.acquire();
  assert.equal(ChromiumRenderPool.active, 3);

  // 4th request must be queued
  let fourthResolved = false;
  const fourthPromise = ChromiumRenderPool.acquire().then(() => {
    fourthResolved = true;
  });

  // Ensure 4th has not resolved yet
  assert.equal(fourthResolved, false);

  // Release 1 slot -> 4th request resolves
  ChromiumRenderPool.release();
  await fourthPromise;
  assert.equal(fourthResolved, true);
  assert.equal(ChromiumRenderPool.active, 3);

  // Drain remaining slots
  ChromiumRenderPool.release();
  ChromiumRenderPool.release();
  ChromiumRenderPool.release();
  assert.equal(ChromiumRenderPool.active, 0);
});

test("GET /api/matrimony/[id]/biodata/pdf route enforces security and delivery contracts", () => {
  const root = path.join(testDirectory, "..");
  const routeContent = fs.readFileSync(path.join(root, "src", "app", "api", "matrimony", "[id]", "biodata", "pdf", "route.ts"), "utf8");

  // Route runtime configuration
  assert.match(routeContent, /export const dynamic = "force-dynamic"/);
  assert.match(routeContent, /export const runtime = "nodejs"/);

  // 401 Unauthorized check
  assert.match(routeContent, /if \(!session\?\.userId\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/);

  // 404 Not Found check
  assert.match(routeContent, /if \(!profile\) return NextResponse\.json\(\{ error: "Not Found" \}, \{ status: 404 \}\)/);

  // 403 Forbidden IDOR check
  assert.match(routeContent, /const allowed = await canAccessMatrimonialBiodata\(session, profile\)/);
  assert.match(routeContent, /if \(!allowed\) \{\s*return NextResponse\.json\(\{ error: "Access denied" \}, \{ status: 403 \}\);\s*\}/);

  // 504 Gateway Timeout check
  assert.match(routeContent, /timed out/);
  assert.match(routeContent, /status: 504/);

  // 200 Streaming PDF delivery headers
  assert.match(routeContent, /"Content-Type": "application\/pdf"/);
  assert.match(routeContent, /"Content-Disposition": `attachment; filename="\$\{filename\(profile\.fullName\)\}"`/);
  assert.match(routeContent, /"Cache-Control": "private, no-store, must-revalidate"/);
});

test("compileBiodataHtml collapses absent optional sections on minimal profiles", async () => {
  const { compileBiodataHtml } = await import("../src/lib/matrimony-biodata-template.ts");

  const minimalData = {
    id: "prof-min-001",
    fullName: "Aarav Garg",
    gotra: "Garg",
  };

  const html = compileBiodataHtml(minimalData);

  assert.ok(html.includes("Aarav Garg"));
  assert.ok(html.includes("prof-min-001"));
  assert.ok(html.includes("Garg"));
  assert.ok(html.includes("NotoDevanagari"));
  assert.ok(html.includes("@page { size: A4 portrait; margin: 6mm; }"));

  // Optional sections with zero data must NOT render headers or empty cards
  assert.ok(!html.includes("Horoscope & astrology"));
  assert.ok(!html.includes("Education & career"));
  assert.ok(!html.includes("Family background"));
  assert.ok(!html.includes("<img class=\"photo\""));
});

test("compileBiodataHtml safely renders rich edge-case data, unicode Devanagari and long text", async () => {
  const { compileBiodataHtml } = await import("../src/lib/matrimony-biodata-template.ts");

  const richData = {
    id: "prof-rich-999",
    fullName: "Pooja & Priya Bansal <Special>",
    gender: "Female",
    dob: "1998-05-15",
    age: 28,
    height: "5' 6\" (168 cm)",
    weight: "55 kg",
    complexion: "Fair",
    bloodGroup: "O+",
    diet: "Vegetarian",
    motherTongue: "Hindi / Marwari",
    languages: ["Hindi", "English", "Marwari"],
    photoUrl: "https://example.com/photo.jpg",
    fourGotras: {
      selfGotra: "Bansal",
      motherGotra: "Mittal",
      dadiGotra: "Garg",
      naniGotra: "Singhal",
    },
    manglik: "Anshik Manglik",
    rashi: "Tula",
    nakshatra: "Swati",
    charan: "3",
    tob: "08:45 AM",
    pob: "Jaipur, Rajasthan",
    highestEducation: "Master of Science in Computer Science & Artificial Intelligence (Honors)",
    college: "National University of Singapore",
    schooling: "Delhi Public School, R.K. Puram",
    occupation: "Senior AI Software Engineer",
    company: "Google Singapore Pte. Ltd.",
    annualIncome: "SGD 180,000 / year",
    workLocation: "Marina Bay Financial Centre, Singapore",
    fatherName: "Rajesh Bansal",
    fatherOccupation: "Managing Director, Global Logistics Pvt Ltd",
    motherName: "Sunita Bansal",
    motherOccupation: "Homemaker",
    siblings: ["Elder Brother: Rohan Bansal (Vice President, Goldman Sachs Singapore)"],
    nativePlace: "Agroha Dham, Hisar, Haryana",
    currentCity: "Orchard Road, Singapore",
    familyType: "Nuclear with Traditional Values",
    familyValues: "Liberal & Culturally Grounded",
    partnerPreferences: {
      notes: "Seeking an educated, family-oriented partner from Agrawal community with mutual respect.",
      ageRange: "27 - 32 years",
      heightRange: "5' 9\" to 6' 2\"",
      education: "Master's or Professional Degree",
      diet: "Vegetarian",
      gotraExclusion: "Excluding Bansal, Mittal, Garg, Singhal",
      location: "Singapore, India, or USA",
    },
    contactPerson: "Rajesh Bansal (Father)",
    contactPhone: "+65 9123 4567",
    secondaryPhone: "+65 9876 5432",
    contactEmail: "rajesh.bansal@example.com",
    residentialAddress: "12 Paterson Road, Paterson Suites #18-02, Singapore 238511",
    verificationSeal: "MAFL Government-ID Verified",
    footerPortalInfo: "Maharaja Agrasen Foundation Limited · Registered in Singapore",
  };

  const html = compileBiodataHtml(richData);

  // Devanagari script preservation
  assert.ok(html.includes("॥ श्री गणेशाय नमः ॥"));
  assert.ok(html.includes("वैवाहिक परिचय पत्र"));
  assert.ok(html.includes("॥ श्री कुलदेव्यै नमः ॥"));
  assert.ok(html.includes("दादी / Dadi"));
  assert.ok(html.includes("नानी / Nani"));

  // 4 Gotras badges
  assert.ok(html.includes("Bansal"));
  assert.ok(html.includes("Mittal"));
  assert.ok(html.includes("Garg"));
  assert.ok(html.includes("Singhal"));

  // Escaping verification
  assert.ok(html.includes("Pooja &amp; Priya Bansal &lt;Special&gt;"));
  assert.ok(!html.includes("<Special>"));

  // Rich data content
  assert.ok(html.includes("Master of Science in Computer Science"));
  assert.ok(html.includes("National University of Singapore"));
  assert.ok(html.includes("Senior AI Software Engineer"));
  assert.ok(html.includes("Rohan Bansal (Vice President"));
  assert.ok(html.includes("Excluding Bansal, Mittal, Garg, Singhal"));
  assert.ok(html.includes("MAFL Government-ID Verified"));
  assert.ok(html.includes("img class=\"photo\""));
});


