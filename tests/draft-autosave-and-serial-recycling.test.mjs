import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

// ============================================================================
// SEAM A: Draft Storage, Retrieval & OWASP Data Scrubbing
// ============================================================================
test("TDD Seam A1: Registration Draft Schema defines form_data JSONB and proper indexes", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // Schema DDL must define form_data JSONB
  assert.ok(
    schemaSql.includes("form_data JSONB DEFAULT '{}'::jsonb"),
    "schema.sql must define form_data JSONB column in registration_drafts"
  );
  assert.ok(
    schemaSql.includes("ALTER TABLE registration_drafts ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;"),
    "schema.sql must include idempotent ALTER TABLE for form_data"
  );

  // Runtime DDL in ensureSchema must also define form_data JSONB
  assert.ok(
    dbLib.includes("form_data JSONB DEFAULT '{}'::jsonb"),
    "db.ts ensureSchema must define form_data JSONB column"
  );
  assert.ok(
    dbLib.includes("ALTER TABLE registration_drafts ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;"),
    "db.ts ensureSchema must include idempotent ALTER TABLE for form_data"
  );
});

test("TDD Seam A2: Server Action saveRegistrationDraft scrubs sensitive password data before storage (OWASP)", () => {
  const draftActionCode = fs.readFileSync(path.join(webRoot, "src/actions/draft.ts"), "utf8");

  // 1. Must accept formData in input interface
  assert.ok(
    draftActionCode.includes("formData?: Record<string, any>"),
    "SaveDraftInput must support optional formData payload"
  );

  // 2. Must destructively strip password and confirmPassword before calling db
  assert.ok(
    draftActionCode.includes("const { password, confirmPassword, turnstileToken, ...rest } = input.formData") ||
    (draftActionCode.includes("delete safeData.password") && draftActionCode.includes("delete safeData.confirmPassword")),
    "saveRegistrationDraft must strictly strip password and confirmPassword from formData (OWASP Top 10)"
  );

  // 3. Must pass sanitized payload to db.saveRegistrationDraft
  assert.ok(
    draftActionCode.includes("formData: safeFormData"),
    "saveRegistrationDraft must pass sanitized safeFormData to database layer"
  );
});

test("TDD Seam A3: Draft actions export getRegistrationDraft and discardRegistrationDraft", () => {
  const draftActionCode = fs.readFileSync(path.join(webRoot, "src/actions/draft.ts"), "utf8");
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // Server actions
  assert.ok(
    draftActionCode.includes("export async function getRegistrationDraft"),
    "draft.ts must export getRegistrationDraft action"
  );
  assert.ok(
    draftActionCode.includes("export async function discardRegistrationDraft"),
    "draft.ts must export discardRegistrationDraft action"
  );

  // Database layer
  assert.ok(
    dbCode.includes("async getRegistrationDraft(contact: string)"),
    "db.ts must implement getRegistrationDraft"
  );
  assert.ok(
    dbCode.includes("async discardRegistrationDraft(contact: string)"),
    "db.ts must implement discardRegistrationDraft"
  );
});

// ============================================================================
// SEAM B: Gap-Free Serial Number Recycling Engine
// ============================================================================
test("TDD Seam B1: Admin rejection resets serial numbers to NULL on both household and members", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const moderateCode = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");

  // 1. db.updateHouseholdStatus sets serial_no = NULL for rejected households
  assert.ok(
    dbCode.includes("UPDATE households SET status = $1, rejection_reason = $2, serial_no = NULL WHERE id = $3"),
    "db.ts updateHouseholdStatus must reset household serial_no to NULL when status is rejected"
  );

  // 2. db.updateHouseholdStatus sets serial_no = NULL for all members of the rejected household
  assert.ok(
    dbCode.includes("UPDATE members SET serial_no = NULL WHERE household_id = $1"),
    "db.ts updateHouseholdStatus must reset all member serial_no to NULL when status is rejected"
  );

  // 3. moderate.ts calls db.updateHouseholdStatus with 'rejected'
  assert.ok(
    moderateCode.includes('db.updateHouseholdStatus(householdId, "rejected", rejectionReason.trim())'),
    "moderate.ts rejectHousehold must call updateHouseholdStatus with rejected status"
  );
});

test("TDD Seam B2: Sequence generators generateNextHouseholdNo and generateNextMemberSerialNo implement gap detection", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // 1. generateNextHouseholdNo uses generate_series with NOT EXISTS
  assert.ok(
    dbCode.includes("generate_series(bounds.start_num, bounds.max_num) s(n)") &&
    dbCode.includes("WHERE NOT EXISTS (SELECT 1 FROM existing_nums e WHERE e.num = s.n)"),
    "generateNextHouseholdNo must detect sequence gaps using generate_series and NOT EXISTS"
  );

  // 2. Both generators pick the lowest available gap (ORDER BY s.n ASC LIMIT 1)
  assert.ok(
    dbCode.includes("ORDER BY s.n ASC") && dbCode.includes("LIMIT 1"),
    "Sequence generators must sort by lowest gap (ORDER BY s.n ASC LIMIT 1) to recycle freed numbers"
  );

  // 3. Generators format as 3-digit zero-padded segments
  assert.ok(
    dbCode.includes("`HHN-${part1}-${part2}-${part3}`"),
    "generateNextHouseholdNo must format as HHN-000-000-000"
  );
  assert.ok(
    dbCode.includes("`MAFL-${part1}-${part2}-${part3}`"),
    "generateNextMemberSerialNo must format as MAFL-000-000-000"
  );
});

// Pure algorithmic verification of gap detection query logic
test("TDD Seam B3: Gap detection algorithm accurately identifies lowest missing integer in a sequence", () => {
  function findLowestGap(existingNums) {
    const numSet = new Set(existingNums.filter((n) => typeof n === "number" && n > 0));
    const max = Math.max(0, ...numSet);
    for (let i = 1; i <= max + 1; i++) {
      if (!numSet.has(i)) {
        return i;
      }
    }
    return 1;
  }

  // Case 1: Empty database starts at 1
  assert.equal(findLowestGap([]), 1, "Empty DB must start at serial 1");

  // Case 2: Consecutive sequence 1..5 advances to 6
  assert.equal(findLowestGap([1, 2, 3, 4, 5]), 6, "Consecutive 1..5 must advance to 6");

  // Case 3: Number #3 was rejected and cleared (gap at 3)
  assert.equal(findLowestGap([1, 2, 4, 5]), 3, "Missing serial #3 must be reclaimed first");

  // Case 4: Multiple gaps (#2 and #4 missing), must pick lowest gap (#2)
  assert.equal(findLowestGap([1, 3, 5]), 2, "Lowest gap #2 must be picked over #4");

  // Case 5: The exact user scenario: Serial #169 was rejected
  const numbersWith169Missing = Array.from({ length: 200 }, (_, i) => i + 1).filter((n) => n !== 169);
  assert.equal(
    findLowestGap(numbersWith169Missing),
    169,
    "Rejected serial #169 must be inherited by the next applicant"
  );

  // Once #169 is re-filled, next applicant should get 201
  const numbersWith169Refilled = Array.from({ length: 200 }, (_, i) => i + 1);
  assert.equal(
    findLowestGap(numbersWith169Refilled),
    201,
    "Once #169 is re-occupied, next applicant gets 201"
  );
});

// ============================================================================
// SEAM C: Rejection Lifecycle Resolution & Resubmission Engine
// ============================================================================
test("TDD Seam C1: checkContactRegistration identifies rejected status and enables resubmission", () => {
  const registerActionCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");

  // 1. Must check getHouseholdByContact first to inspect lifecycle status
  assert.ok(
    registerActionCode.includes("const existing = await db.getHouseholdByContact(canonicalContact);"),
    "checkContactRegistration must fetch household by contact to check status"
  );

  // 2. When status is 'rejected', must return canResubmit: true and rejectionReason
  assert.ok(
    registerActionCode.includes('existing.status === "rejected"'),
    "checkContactRegistration must detect rejected household"
  );
  assert.ok(
    registerActionCode.includes("canResubmit: true"),
    "checkContactRegistration must set canResubmit: true for rejected applications"
  );
  assert.ok(
    registerActionCode.includes("rejectionReason: existing.rejectionReason"),
    "checkContactRegistration must return rejectionReason for applicant review"
  );
  assert.ok(
    registerActionCode.includes("previousHousehold:"),
    "checkContactRegistration must return previousHousehold payload to pre-fill the form"
  );

  // 3. When status is 'pending_review', must flag isPending
  assert.ok(
    registerActionCode.includes('existing.status === "pending_review"'),
    "checkContactRegistration must detect pending_review applications"
  );
  assert.ok(
    registerActionCode.includes("isPending: true"),
    "checkContactRegistration must set isPending: true for under-review applications"
  );
});

test("TDD Seam C2: registerHousehold routes rejected applicant to resubmitHousehold without 23505 collision", () => {
  const registerActionCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // 1. Unique contact check allows resubmission when status is rejected
  assert.ok(
    registerActionCode.includes('const isRejectedResubmission = Boolean(existing && existing.status === "rejected");'),
    "registerHousehold must recognize rejected applications as eligible for resubmission"
  );

  // 2. Calls db.resubmitHousehold instead of db.createHousehold
  assert.ok(
    registerActionCode.includes("created = await db.resubmitHousehold(existing.id, newHousehold);"),
    "registerHousehold must call db.resubmitHousehold for rejected applicants"
  );

  // 3. db.resubmitHousehold updates existing record, resets status to pending_review, and clears rejection_reason
  assert.ok(
    dbCode.includes("UPDATE households SET") &&
    dbCode.includes("status = 'pending_review'") &&
    dbCode.includes("rejection_reason = NULL"),
    "db.resubmitHousehold must reset status to pending_review and clear rejection_reason"
  );

  // 4. db.resubmitHousehold regenerates new member serials and replaces members under transaction lock
  assert.ok(
    dbCode.includes("DELETE FROM members WHERE household_id = $1;") &&
    dbCode.includes("pg_advisory_xact_lock"),
    "db.resubmitHousehold must replace members under transaction advisory lock"
  );
});

// ============================================================================
// SEAM D: Client-Side Draft Auto-Save, Banner & Recovery UI
// ============================================================================
test("TDD Seam D1: signup/page.tsx implements debounced auto-save without storing plaintext passwords", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // 1. Uses localStorage key mafl_signup_draft_v1
  assert.ok(
    signupCode.includes('"mafl_signup_draft_v1"'),
    "signup page must use localStorage key mafl_signup_draft_v1"
  );

  // 2. Auto-save triggers only when step >= 2
  assert.ok(
    signupCode.includes("if (step < 2 || isSuccess) return;"),
    "Auto-save must only trigger once user reaches Step 2 or higher"
  );

  // 3. Strict security invariant: Password must NOT be in draftPayload
  const autoSaveSection = signupCode.slice(
    signupCode.indexOf("const draftPayload = {"),
    signupCode.indexOf("savedAt: Date.now()")
  );
  assert.ok(
    !autoSaveSection.includes("password:") && !autoSaveSection.includes("confirmPassword:"),
    "draftPayload MUST NOT contain password or confirmPassword (OWASP security guard)"
  );

  // 4. Draft is debounced (e.g. 600ms timer)
  assert.ok(
    signupCode.includes("setTimeout(") && signupCode.includes("600"),
    "Auto-save must debounce updates by 600ms to avoid main-thread jank"
  );
});

test("TDD Seam D2: signup/page.tsx mounts resumption banner with 'Resume Application' and 'Start Fresh' controls", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // 1. Manages resumeDraft state and checks localStorage on mount
  assert.ok(
    signupCode.includes("const [resumeDraft, setResumeDraft] = useState"),
    "signup page must declare resumeDraft state"
  );
  assert.ok(
    signupCode.includes('localStorage.getItem("mafl_signup_draft_v1")'),
    "signup page must inspect localStorage on page mount"
  );

  // 2. Banner displays "Unfinished Registration Found"
  assert.ok(
    signupCode.includes("Unfinished Registration Found"),
    "signup page must render Unfinished Registration Found heading"
  );

  // 3. Provides Resume Application button wired to handleResumeDraft
  assert.ok(
    signupCode.includes("Resume Application") && signupCode.includes("handleResumeDraft"),
    "signup page must provide Resume Application button wired to handler"
  );

  // 4. Provides Start Fresh button wired to handleDiscardDraft
  assert.ok(
    signupCode.includes("Start Fresh") && signupCode.includes("handleDiscardDraft"),
    "signup page must provide Start Fresh button wired to discard handler"
  );
});

test("TDD Seam D3: signup/page.tsx renders rejection notice banner with moderator feedback", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // 1. Manages rejectionNotice state
  assert.ok(
    signupCode.includes("const [rejectionNotice, setRejectionNotice] = useState"),
    "signup page must declare rejectionNotice state"
  );

  // 2. Displays Rejection banner when present
  assert.ok(
    signupCode.includes("Updating Previously Rejected Application"),
    "signup page must render 'Updating Previously Rejected Application' banner"
  );
  assert.ok(
    signupCode.includes("Moderator Feedback:"),
    "signup page must render moderator feedback in rejection banner"
  );
});

test("TDD Seam D4: signup/page.tsx purges local draft from localStorage on successful registration", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // Successful submission must remove draft key
  assert.ok(
    signupCode.includes('localStorage.removeItem("mafl_signup_draft_v1");'),
    "signup page must call localStorage.removeItem('mafl_signup_draft_v1') upon success"
  );
});
