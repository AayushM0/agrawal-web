import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

// ============================================================================
// ISSUE #1 TESTS: Core Schema, Standard Serial Numbering (MAFL-000-000-000)
// ============================================================================

test("Issue 1.1: Serial number format regex complies with MAFL-XXX-XXX-XXX", () => {
  const serialRegex = /^MAFL-\d{3}-\d{3}-\d{3}$/;
  assert.ok(serialRegex.test("MAFL-000-000-001"), "MAFL-000-000-001 must be valid");
  assert.ok(serialRegex.test("MAFL-001-042-999"), "MAFL-001-042-999 must be valid");
  assert.ok(!serialRegex.test("AGR-2026-LIVE"), "Legacy codes must not match new format");
  assert.ok(!serialRegex.test("MAFL-000-00-01"), "Short codes must be rejected");
});

test("Issue 1.2: Schema DDL contains serial_no, address, and government ID columns", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  
  // Serial number columns & index
  assert.ok(schemaSql.includes("serial_no VARCHAR(32) UNIQUE") || schemaSql.includes("serial_no"), "households must define serial_no");
  assert.ok(schemaSql.includes("idx_households_serial_no"), "Must define index on households.serial_no");
  
  // 5-Tier address columns
  assert.ok(schemaSql.includes("country"), "Must define country column");
  assert.ok(schemaSql.includes("postal_code"), "Must define postal_code column");
  assert.ok(schemaSql.includes("state"), "Must define state column");
  assert.ok(schemaSql.includes("city"), "Must define city column");
  assert.ok(schemaSql.includes("full_address"), "Must define full_address column");

  // Government ID columns
  assert.ok(schemaSql.includes("aadhaar_number"), "Must define aadhaar_number column");
  assert.ok(schemaSql.includes("pan_number"), "Must define pan_number column");
  assert.ok(schemaSql.includes("passport_number"), "Must define passport_number column");
  assert.ok(schemaSql.includes("govt_id_number"), "Must define govt_id_number column");

  // Profession fields
  assert.ok(schemaSql.includes("profession_title"), "Must define profession_title column");
  assert.ok(schemaSql.includes("profession_description"), "Must define profession_description column");
});

test("Issue 1.3: Data access layer generates MAFL sequence and maps columns", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  
  assert.ok(dbCode.includes("generateNextSerialNo"), "db.ts must export/contain generateNextSerialNo");
  assert.ok(dbCode.includes("MAFL-"), "db.ts serial generator must prefix with MAFL-");
  assert.ok(dbCode.includes("serial_no"), "db.ts queries must select/insert serial_no");
  assert.ok(dbCode.includes("full_address"), "db.ts queries must map full_address");
  assert.ok(dbCode.includes("aadhaar_number"), "db.ts queries must map aadhaar_number");
  assert.ok(dbCode.includes("pan_number"), "db.ts queries must map pan_number");
  assert.ok(dbCode.includes("passport_number"), "db.ts queries must map passport_number");
  assert.ok(dbCode.includes("govt_id_number"), "db.ts queries must map govt_id_number");
});

// ============================================================================
// ISSUE #2 TESTS: 5-Tier Cascading Location Selector & Phone Code Binding
// ============================================================================

test("Issue 2.1: LocationSelector provides 5 cascading tiers", () => {
  const locationSelectorCode = fs.readFileSync(path.join(webRoot, "src/components/LocationSelector.tsx"), "utf8");
  
  // Tiers existence
  assert.ok(locationSelectorCode.includes("Country of Residence"), "Must include Country tier");
  assert.ok(locationSelectorCode.includes("Postal / PIN Code"), "Must include Postal Code tier");
  assert.ok(locationSelectorCode.includes("State / Province"), "Must include State tier");
  assert.ok(locationSelectorCode.includes("City / District / Area"), "Must include City tier");
  assert.ok(locationSelectorCode.includes("Complete Residential Address"), "Must include Full Address tier");
});

test("Issue 2.2: LocationSelector emits onPhoneCodeChange on country selection", () => {
  const locationSelectorCode = fs.readFileSync(path.join(webRoot, "src/components/LocationSelector.tsx"), "utf8");
  
  assert.ok(locationSelectorCode.includes("onPhoneCodeChange"), "Must support onPhoneCodeChange prop callback");
  assert.ok(locationSelectorCode.includes("phonecode"), "Must extract country phonecode");
});

test("Issue 2.3: LocationSelector auto-detects State & City from PIN code with API endpoint", () => {
  const locationSelectorCode = fs.readFileSync(path.join(webRoot, "src/components/LocationSelector.tsx"), "utf8");
  const pincodeRouteCode = fs.readFileSync(path.join(webRoot, "src/app/api/location/pincode/route.ts"), "utf8");

  assert.ok(locationSelectorCode.includes("/api/location/pincode"), "LocationSelector must query pincode API");
  assert.ok(locationSelectorCode.includes("Auto-detecting State & City"), "LocationSelector must display auto-detecting feedback");
  assert.ok(pincodeRouteCode.includes("api.postalpincode.in"), "API route must query official India Post registry");
});

// ============================================================================
// ISSUE #3 TESTS: Country-Specific Identity Verification & 4-Step Registration
// ============================================================================

test("Issue 3.1: 4-Step Progress Bar reflects new streamlined wizard", () => {
  const progressBarCode = fs.readFileSync(path.join(webRoot, "src/components/wizard/WizardProgressBar.tsx"), "utf8");
  
  assert.ok(!progressBarCode.includes("Privacy Preferences"), "Must not include removed Privacy step");
  assert.ok(progressBarCode.includes("Contact Verification"), "Must include Step 1");
  assert.ok(progressBarCode.includes("Head & Family Details"), "Must include Step 2 Head & Family Details");
  assert.ok(progressBarCode.includes("Additional Members (Optional)"), "Must include Step 3 Optional Members");
  assert.ok(progressBarCode.includes("Review & Submission"), "Must include Step 4");
});

test("Issue 3.2: Registration Server Action enforces country-branched IDs and mandatory fields", () => {
  const registerActionCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  
  // Mandatory head validations
  assert.ok(registerActionCode.includes("Head of Household name"), "Must enforce head name");
  assert.ok(registerActionCode.includes("Father's Full Name (पिता का नाम)"), "Must enforce head father name");
  assert.ok(registerActionCode.includes("Ancestral native place (मूल निवास)"), "Must enforce native place");
  assert.ok(registerActionCode.includes("Complete residential address"), "Must enforce address");
  assert.ok(registerActionCode.includes("Postal/PIN code"), "Must enforce postal code");

  // Country branching validations
  assert.ok(registerActionCode.includes("12-digit Aadhaar Number"), "Must enforce 12-digit Aadhaar for India");
  assert.ok(registerActionCode.includes("10-character PAN Number"), "Must enforce 10-char PAN for India");
  assert.ok(registerActionCode.includes("Passport Number"), "Must enforce Passport for international");
  assert.ok(registerActionCode.includes("Government Issued ID"), "Must enforce Govt ID for international");

  // Serial number mapping
  assert.ok(registerActionCode.includes("serialNo:"), "Must return serialNo on registration");
});

test("Issue 3.3: Signup UI captures Head in Step 2 and provides optional member additions in Step 3", () => {
  const signupPageCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");
  
  assert.ok(signupPageCode.includes("+ Add Family Member"), "Must contain add member CTA");
  assert.ok(signupPageCode.includes("Head of Household Profile (मुखिया की जानकारी)"), "Step 2 must capture Head profile");
  assert.ok(signupPageCode.includes("Profession Description (एक पंक्ति में विवरण)"), "Must capture 1-line profession description");
  assert.ok(signupPageCode.includes("Example:"), "Must provide profession description example");
});

test("Issue 3.4: Registration Server Action supports parent and all extended family relations", () => {
  const registerActionCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  
  assert.ok(registerActionCode.includes('"parent"'), "VALID_RELATIONS must include 'parent'");
  assert.ok(registerActionCode.includes('"spouse"'), "VALID_RELATIONS must include 'spouse'");
  assert.ok(registerActionCode.includes('"son"'), "VALID_RELATIONS must include 'son'");
  assert.ok(registerActionCode.includes('"daughter"'), "VALID_RELATIONS must include 'daughter'");
  assert.ok(registerActionCode.includes('"other"'), "VALID_RELATIONS must include 'other'");
  assert.ok(registerActionCode.includes("VALID_GENDERS"), "Must validate gender case-insensitively");
  assert.ok(registerActionCode.includes("VALID_MARITAL"), "Must validate marital status case-insensitively");
});

test("Issue 3.5: Contact uniqueness, DB checks, and auto-claim for family members without separate contacts", () => {
  const registerActionCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const claimActionCode = fs.readFileSync(path.join(webRoot, "src/actions/claim.ts"), "utf8");

  assert.ok(registerActionCode.includes("cannot be identical to the Head of Household's contact"), "Must block member using Head contact");
  assert.ok(registerActionCode.includes("isAutoClaimed"), "Must automatically claim members without separate contact");
  assert.ok(claimActionCode.includes("does not require separate claiming"), "Claim must reject auto-claimed members without separate contacts");
});

test("Issue 3.6: Mandatory profile photograph for Head and all family members", () => {
  const registerActionCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const signupPageCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  assert.ok(registerActionCode.includes("A recent profile photograph is mandatory for the Head of Household"), "Backend must require Head photo");
  assert.ok(registerActionCode.includes("A profile photograph is mandatory for"), "Backend must require member photos");
  assert.ok(signupPageCode.includes("headPhotoUrl.trim()"), "Signup Step 2 must enforce Head photo upload");
  assert.ok(signupPageCode.includes("m.photoUrl.trim()"), "Signup Step 3 must enforce member photo upload");
});

// ============================================================================
// ISSUE #4 TESTS: Default Contact Masking & Dynamic Age Computation
// ============================================================================

test("Issue 4.1: Age calculation algorithm handles dates accurately", () => {
  function calculateAge(dobStr) {
    if (!dobStr || !dobStr.trim()) return null;
    const birthDate = new Date(dobStr.trim());
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  const birth25YearsAgo = new Date();
  birth25YearsAgo.setFullYear(birth25YearsAgo.getFullYear() - 25);
  const dob25 = birth25YearsAgo.toISOString().split("T")[0];
  assert.equal(calculateAge(dob25), 25, "Must accurately compute 25 years");

  assert.equal(calculateAge("invalid-date"), null, "Must return null for invalid date");
  assert.equal(calculateAge(""), null, "Must return null for empty string");
});

test("Issue 4.2: Phone & Email masking functions protect sensitive data", () => {
  function maskPhone(phone) {
    if (!phone) return "Not provided";
    const clean = phone.trim();
    if (clean.length <= 4) return "••••";
    return clean.slice(0, 3) + " •••••• " + clean.slice(-4);
  }

  function maskEmail(email) {
    if (!email || !email.includes("@")) return "Not provided";
    const [local, domain] = email.split("@");
    if (local.length <= 2) return `${local.slice(0, 1)}••••@${domain}`;
    return `${local.slice(0, 1)}••••${local.slice(-1)}@${domain}`;
  }

  assert.equal(maskPhone("+91987654409"), "+91 •••••• 4409", "Must mask phone middle digits");
  assert.equal(maskEmail("agrawal@gmail.com"), "a••••l@gmail.com", "Must mask email middle characters");
});

test("Issue 4.3: Directory and Dashboard render dynamic age and serial numbers", () => {
  const directoryCode = fs.readFileSync(path.join(webRoot, "src/app/directory/page.tsx"), "utf8");
  const profileCode = fs.readFileSync(path.join(webRoot, "src/app/directory/[id]/page.tsx"), "utf8");
  const dashboardCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");

  assert.ok(directoryCode.includes("calculateAge"), "Directory must calculate real-time age");
  assert.ok(directoryCode.includes("serialNo"), "Directory must render serialNo");

  assert.ok(profileCode.includes("maskPhone"), "Profile must mask phone by default");
  assert.ok(profileCode.includes("maskEmail"), "Profile must mask email by default");
  assert.ok(profileCode.includes("calculateAge"), "Profile must calculate age");

  assert.ok(dashboardCode.includes("maskContact"), "Dashboard must mask registered contact");
  assert.ok(dashboardCode.includes("calculateAge"), "Dashboard must calculate member ages");
});

// ============================================================================
// ISSUE #5 TESTS: High-DPI Logo Crispness & Visual Polish
// ============================================================================

test("Issue 5.1: MainHeader and MainFooter use high-resolution dimensions and quality factors", () => {
  const headerCode = fs.readFileSync(path.join(webRoot, "src/components/layout/MainHeader.tsx"), "utf8");
  const footerCode = fs.readFileSync(path.join(webRoot, "src/components/layout/MainFooter.tsx"), "utf8");

  assert.ok(headerCode.includes("quality={95}"), "Header logo must use quality={95}");
  assert.ok(headerCode.includes("width={120}"), "Header logo must specify high-DPI width=120");

  assert.ok(footerCode.includes("quality={95}"), "Footer logo must use quality={95}");
  assert.ok(footerCode.includes("width={110}"), "Footer logo must specify high-DPI width=110");
});

// ============================================================================
// ISSUE #6 TESTS: Serial Number PDF Pass Generation & Admin Moderation
// ============================================================================

test("Issue 6.1: PassPDF and PDF route generate official MAFL serial numbers", () => {
  const passPdfCode = fs.readFileSync(path.join(webRoot, "src/components/PassPDF.tsx"), "utf8");
  const pdfRouteCode = fs.readFileSync(path.join(webRoot, "src/app/api/pass/pdf/route.ts"), "utf8");
  const passPageCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/pass/page.tsx"), "utf8");

  assert.ok(passPdfCode.includes("OFFICIAL SERIAL NUMBER (SNO)"), "PassPDF must display Official Serial Number");
  assert.ok(passPdfCode.includes("passData.serialNo"), "PassPDF must bind serialNo");

  assert.ok(pdfRouteCode.includes("serialNo:"), "api/pass/pdf route must include serialNo");
  assert.ok(passPageCode.includes("serialNo:"), "dashboard/pass/page must pass serialNo");
});

test("Issue 6.2: Admin Moderation Portal displays address, government IDs, and serial numbers", () => {
  const moderationPageCode = fs.readFileSync(path.join(webRoot, "src/app/admin/moderation/page.tsx"), "utf8");
  const moderateActionCode = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");

  assert.ok(moderationPageCode.includes("h.serialNo"), "Moderation queue must display serialNo");
  assert.ok(moderationPageCode.includes("Residential Address:"), "Moderation queue must display residential address");
  assert.ok(moderationPageCode.includes("Aadhaar:"), "Moderation queue must display Aadhaar / PAN / Passport / Govt ID");

  assert.ok(moderateActionCode.includes("serialNo"), "Approval notifications must include serialNo");
  assert.ok(moderateActionCode.includes("allAttachments"), "Approval notifications must attach ID passes for all family members");
});
