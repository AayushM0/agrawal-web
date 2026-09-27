# Non-Mandatory Member Photos & "Not Specified" Date of Birth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make member photographs completely non-mandatory across all sections (including Matrimonial profiles), make Date of Birth (DOB) optional across the platform, and provide an explicit "Not specified" option wherever DOB is requested.

**Architecture:** Database columns for `dob` in `members` and `matrimonial_profiles` tables are altered to drop `NOT NULL` constraints, while `sanitizeDate` is updated to return `null` for empty or "Not specified" values. In the UI, asterisks and `required` attributes are removed from DOB and photo inputs in Signup, Matrimony, and Dashboard modals, and a dedicated "Not specified (जन्म तिथि ज्ञात नहीं)" control is added to DOB inputs. Directory, profile, and matrimony showcase cards cleanly fall back to placeholder avatars and "Not specified" badges when photos or birth dates are omitted.

**Tech Stack:** Next.js 15.3.9 App Router, React 19, PostgreSQL (pg driver), Tailwind CSS, Node.js Test Runner.

## Global Constraints

- Never push feature branches directly to remote; merge with `main` before pushing, and push `main`.
- Preserve all existing database tables, constraints, and untouched components (`/surgical-changes`).
- Do not show any mandatory asterisk (`*`) or validation error when a user omits photos or Date of Birth.
- When Date of Birth is omitted or selected as "Not specified", store `null` in PostgreSQL without breaking age calculations, search filters, or ID card generation (`calculateAge` and `extractBirthYear` safely return `null`).
- Every task must end with verified automated tests (`npm test`) and clean compilation (`npm run build`).

---

### Task 1: Database Schema & Migration Hardening for Nullable DOB & Fallbacks

**Files:**
- Modify: `web/src/db/schema.sql:55-75, 290-305`
- Modify: `web/src/lib/db.ts:80-105, 130-160, 1000-1015, 1395-1410, 2675-2690`
- Modify: `web/src/types/household.ts:10-25`
- Modify: `web/src/types/matrimony.ts:35-45, 125-135`
- Test: `web/tests/seams.test.mjs`

**Interfaces:**
- Consumes: `initDb()` migration runner and database query execution in `src/lib/db.ts`.
- Produces: Nullable `dob DATE` column support in `members` and `matrimonial_profiles`, and `sanitizeDate(dob?: string): string | null` returning `null` for omitted or `"not specified"` birth dates.

- [ ] **Step 1: Write failing test in `tests/seams.test.mjs`**

Add Seam 27 test asserting that `dob` in `members` and `matrimonial_profiles` is nullable, and `sanitizeDate` returns `null` for undefined or empty input.

```javascript
test("Seam 27: Nullable DOB and non-mandatory photos across schema and helpers", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // Schema must not enforce NOT NULL on dob
  assert.ok(!schemaSql.includes("dob DATE NOT NULL"), "schema.sql must not enforce NOT NULL on dob");
  assert.ok(dbCode.includes("ALTER TABLE members ALTER COLUMN dob DROP NOT NULL"), "db.ts must idempotently drop NOT NULL on members.dob");
  assert.ok(dbCode.includes("ALTER TABLE matrimonial_profiles ALTER COLUMN dob DROP NOT NULL"), "db.ts must idempotently drop NOT NULL on matrimonial_profiles.dob");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/seams.test.mjs`
Expected: FAIL asserting schema does not contain `dob DATE NOT NULL`.

- [ ] **Step 3: Update `schema.sql`, `db.ts`, and TypeScript types**

1. In `src/db/schema.sql`:
   Change:
   ```sql
   dob DATE NOT NULL,
   ```
   to:
   ```sql
   dob DATE,
   ```
   in both `members` table (around line 61) and `matrimonial_profiles` table (around line 297).

2. In `src/lib/db.ts`:
   In `initDb()` around line 150, add idempotent column migration:
   ```typescript
   await client.query(`
     ALTER TABLE members ALTER COLUMN dob DROP NOT NULL;
     ALTER TABLE matrimonial_profiles ALTER COLUMN dob DROP NOT NULL;
   `);
   ```
   Update `sanitizeDate`:
   ```typescript
   function sanitizeDate(dob?: string): string | null {
     if (!dob || !dob.trim() || dob.trim().toLowerCase() === "not specified") {
       return null;
     }
     const clean = dob.trim();
     if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
       return clean;
     }
     if (/^\d{4}$/.test(clean)) {
       return `${clean}-01-01`;
     }
     if (/^\d{1,3}$/.test(clean)) {
       const age = parseInt(clean, 10);
       const year = new Date().getFullYear() - age;
       return `${year}-01-01`;
     }
     const parsed = new Date(clean);
     if (!isNaN(parsed.getTime())) {
       return parsed.toISOString().split("T")[0];
     }
     return null;
   }
   ```
   In `createHousehold`:
   ```typescript
   const safeDob = m.dob ? sanitizeDate(m.dob) : null;
   ```
   In `addMemberToHousehold`:
   ```typescript
   const safeDob = member.dob ? sanitizeDate(member.dob) : null;
   ```
   In `createMatrimonialProfile`:
   ```typescript
   p.dob ? sanitizeDate(p.dob) : null,
   ```

3. In `src/types/household.ts`:
   ```typescript
   dob?: string;
   ```
   In `src/types/matrimony.ts`:
   ```typescript
   dob?: string;
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/seams.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/db/schema.sql src/lib/db.ts src/types/household.ts src/types/matrimony.ts tests/seams.test.mjs
git commit -m "feat(db): make dob nullable in members and matrimonial_profiles schema"
```

---

### Task 2: Membership Signup (`src/app/signup/page.tsx`) - Optional DOB with "Not Specified" Control

**Files:**
- Modify: `web/src/app/signup/page.tsx:645-660, 825-840, 1455-1480, 1875-1900`
- Test: `web/tests/seams.test.mjs`

**Interfaces:**
- Consumes: Head and Member form state in `signup/page.tsx`.
- Produces: User ability to input DOB or select "Not specified (जन्म तिथि ज्ञात नहीं)", with automatic clearing of date input and zero blocking validation on submit.

- [ ] **Step 1: Write failing test in `tests/seams.test.mjs`**

Add assertion verifying that `signup/page.tsx` does not require DOB for Head or additional members and provides "Not specified" support.

```javascript
test("Seam 28: Signup page allows DOB to be omitted or marked as Not specified", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // Step 2 Head DOB validation must not block when empty
  assert.ok(!signupCode.includes('Please enter a valid Date of Birth (जन्म तिथि) for the Head of Household.'), "Head DOB must not be blocking");
  // Step 3 Member DOB validation must not block when empty
  assert.ok(!signupCode.includes('Please enter Date of Birth for ${m.fullName'), "Member DOB must not be blocking");
  // UI must include Not specified control
  assert.ok(signupCode.includes("Not specified") || signupCode.includes("ज्ञात नहीं"), "Must render Not specified control");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/seams.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Update `src/app/signup/page.tsx`**

1. In `handleStep2Next` (around line 650):
   Remove blocking validation:
   ```typescript
   // DOB is now optional; if empty or not specified, proceed without error
   ```
2. In `handleStep3Next` (around line 830):
   Remove blocking validation:
   ```typescript
   // Member DOB is now optional; if empty or not specified, proceed without error
   ```
3. In Head DOB UI (around line 1460):
   - Remove asterisk `*` from `Date of Birth (जन्म तिथि)`.
   - Remove `required` from the `<input type="date" />`.
   - Add a checkbox control:
     ```tsx
     <div className="flex items-center justify-between mb-1">
       <label className="block text-xs font-bold text-body-heading">
         Date of Birth (जन्म तिथि)
       </label>
       {headDob ? (
         headAge !== null && (
           <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
             {headAge} yrs
           </span>
         )
       ) : (
         <span className="text-[10px] text-body-muted">Not specified</span>
       )}
     </div>
     <div className="space-y-1.5">
       <input
         type="date"
         value={headDob}
         disabled={headDob === "Not specified"}
         onChange={(e) => setHeadDob(e.target.value)}
         className="w-full px-3.5 py-2 rounded-xl border border-brand-accent/40 text-xs text-body-heading bg-white focus:ring-1 focus:ring-brand-primary outline-none disabled:bg-gray-100 disabled:text-gray-400"
       />
       <label className="flex items-center gap-1.5 text-[11px] text-body-muted cursor-pointer select-none">
         <input
           type="checkbox"
           checked={!headDob}
           onChange={(e) => {
             if (e.target.checked) {
               setHeadDob("");
             }
           }}
           className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
         />
         <span>Not specified (जन्म तिथि ज्ञात नहीं)</span>
       </label>
     </div>
     ```
4. In Member DOB UI (around line 1880):
   - Remove asterisk `*` from `Date of Birth`.
   - Remove `required` from `<input type="date" />`.
   - Add "Not specified (ज्ञात नहीं)" control for each additional member:
     ```tsx
     <div className="flex items-center justify-between mb-1">
       <label className="block text-[11px] font-bold text-body-heading">
         Date of Birth
       </label>
       {member.dob ? (
         memberAge !== null && (
           <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
             {memberAge} yrs
           </span>
         )
       ) : (
         <span className="text-[10px] text-body-muted">Not specified</span>
       )}
     </div>
     <div className="space-y-1">
       <input
         type="date"
         value={member.dob || ""}
         onChange={(e) => updateAdditionalMember(member.id, "dob", e.target.value)}
         className="w-full px-3 py-1.5 rounded-lg border border-brand-accent/40 text-xs bg-white focus:ring-1 focus:ring-brand-primary"
       />
       <label className="flex items-center gap-1.5 text-[10px] text-body-muted cursor-pointer select-none">
         <input
           type="checkbox"
           checked={!member.dob}
           onChange={(e) => {
             if (e.target.checked) {
               updateAdditionalMember(member.id, "dob", "");
             }
           }}
           className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-3 w-3"
         />
         <span>Not specified (ज्ञात नहीं)</span>
       </label>
     </div>
     ```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/seams.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/app/signup/page.tsx tests/seams.test.mjs
git commit -m "feat(signup): make DOB non-mandatory with not-specified option for head and members"
```

---

### Task 3: Matrimonial Network - Non-Mandatory Photos & Optional/Not-Specified DOB

**Files:**
- Modify: `web/src/app/matrimony/create/page.tsx:285-300, 610-630, 1230-1250`
- Modify: `web/src/actions/matrimony.ts:220-230, 250-270`
- Modify: `web/src/app/matrimony/page.tsx:550-570`
- Modify: `web/src/app/matrimony/[id]/page.tsx:265-280`
- Test: `web/tests/seams.test.mjs`

**Interfaces:**
- Consumes: Matrimony candidate form input and backend action `createMatrimonialProfileAction`.
- Produces: Profile creation without requiring portrait photos or date of birth, displaying placeholder avatars and "Not specified" labels where appropriate.

- [ ] **Step 1: Write failing test in `tests/seams.test.mjs`**

Add assertion verifying that `matrimony/create/page.tsx` and `actions/matrimony.ts` allow empty photos and optional DOB.

```javascript
test("Seam 29: Matrimony profile allows optional photos and optional DOB", () => {
  const matrimonyActionCode = fs.readFileSync(path.join(webRoot, "src/actions/matrimony.ts"), "utf8");
  const matrimonyCreateCode = fs.readFileSync(path.join(webRoot, "src/app/matrimony/create/page.tsx"), "utf8");

  // Server action must not require DOB or photos
  assert.ok(!matrimonyActionCode.includes('return { success: false, error: "Date of Birth is required." };'), "Matrimony action must not enforce DOB required");
  // UI must not block submit when photos.length === 0
  assert.ok(!matrimonyCreateCode.includes('Please upload at least 1 portrait photograph for the matrimonial biodata.'), "Matrimony form must not enforce photo upload");
  // UI must not have mandatory asterisks on photos or DOB
  assert.ok(!matrimonyCreateCode.includes('Candidate Photographs (2-3 तस्वीरें) *'), "Photo section must not have asterisk");
  assert.ok(!matrimonyCreateCode.includes('Date of Birth *'), "DOB section must not have asterisk");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/seams.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Update `matrimony/create/page.tsx` and `actions/matrimony.ts`**

1. In `src/app/matrimony/create/page.tsx`:
   - In `handleFormSubmit` (line 288):
     Remove:
     ```typescript
     if (photos.length === 0) {
       setErrorMessage("Please upload at least 1 portrait photograph for the matrimonial biodata.");
       return;
     }
     ```
   - In DOB input section (line 612):
     Change `Date of Birth *` to `Date of Birth`, remove `required`, and add:
     ```tsx
     <label className="flex items-center gap-1.5 text-[11px] text-body-muted cursor-pointer mt-1.5 select-none">
       <input
         type="checkbox"
         checked={!dob}
         onChange={(e) => {
           if (e.target.checked) setDob("");
         }}
         className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
       />
       <span>Not specified (जन्म तिथि ज्ञात नहीं)</span>
     </label>
     ```
   - In Candidate Photographs header (line 1237):
     Change `6. Candidate Photographs (2-3 तस्वीरें) *` to `6. Candidate Photographs (2-3 तस्वीरें)`.

2. In `src/actions/matrimony.ts`:
   - Around line 221:
     Change:
     ```typescript
     const dob = candidateMember.dob || input.dob;
     if (!dob) {
       return { success: false, error: "Date of Birth is required." };
     }
     ```
     to:
     ```typescript
     const dob = (candidateMember.dob || input.dob)?.trim() || null;
     ```
   - Around line 250:
     Ensure empty `rawPhotos = []` proceeds smoothly without error.

3. In `src/app/matrimony/page.tsx` and `src/app/matrimony/[id]/page.tsx`:
   - Verify fallback avatar `<div className="...">{p.fullName.charAt(0)}</div>` renders gracefully when `photos.length === 0`.
   - If `dob` is null or empty, display "Age: Not specified" or omit cleanly.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/seams.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/app/matrimony/create/page.tsx src/actions/matrimony.ts src/app/matrimony/page.tsx src/app/matrimony/[id]/page.tsx tests/seams.test.mjs
git commit -m "feat(matrimony): make photos non-mandatory and DOB optional with not-specified option"
```

---

### Task 4: Dashboard & Family Member Profile Editing - "Not Specified" DOB Controls & Guide Updates

**Files:**
- Modify: `web/src/app/dashboard/page.tsx:1470-1485, 1945-1960`
- Modify: `web/src/app/guide/page.tsx:95-105, 250-260`
- Test: `web/tests/seams.test.mjs`

**Interfaces:**
- Consumes: `editingMember` and `newMemberForm` state in `dashboard/page.tsx`.
- Produces: Ability to view, clear, or set DOB to "Not specified" when editing an existing member or adding a new household member.

- [ ] **Step 1: Write failing test in `tests/seams.test.mjs`**

Add assertion verifying that Dashboard edit and add modals include "Not specified" DOB controls and Guide text clarifies photos are optional.

```javascript
test("Seam 30: Dashboard and guide support Not specified DOB and optional photos", () => {
  const dashboardCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");
  const guideCode = fs.readFileSync(path.join(webRoot, "src/app/guide/page.tsx"), "utf8");

  assert.ok(dashboardCode.includes("Not specified") || dashboardCode.includes("ज्ञात नहीं"), "Dashboard must provide Not specified DOB toggle");
  assert.ok(!guideCode.includes("photograph is required for each member to generate their official ID card"), "Guide must not claim photo is strictly required");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/seams.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Update `src/app/dashboard/page.tsx` and `src/app/guide/page.tsx`**

1. In `src/app/dashboard/page.tsx`:
   - In Edit Member modal (line 1470):
     Add "Not specified (जन्म तिथि ज्ञात नहीं)" option beneath Date of Birth:
     ```tsx
     <label className="flex items-center gap-1.5 text-[11px] text-body-muted cursor-pointer mt-1 select-none">
       <input
         type="checkbox"
         checked={!editingMember.dob}
         onChange={(e) => {
           if (e.target.checked) setEditingMember({ ...editingMember, dob: "" });
         }}
         className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
       />
       <span>Not specified (जन्म तिथि ज्ञात नहीं)</span>
     </label>
     ```
   - In Add Family Member modal (line 1948):
     Add "Not specified (जन्म तिथि ज्ञात नहीं)" option beneath Date of Birth:
     ```tsx
     <label className="flex items-center gap-1.5 text-[11px] text-body-muted cursor-pointer mt-1 select-none">
       <input
         type="checkbox"
         checked={!newMemberForm.dob}
         onChange={(e) => {
           if (e.target.checked) setNewMemberForm((prev) => ({ ...prev, dob: "" }));
         }}
         className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
       />
       <span>Not specified (जन्म तिथि ज्ञात नहीं)</span>
     </label>
     ```
2. In `src/app/guide/page.tsx`:
   - Line 99: Update from "A clear passport-style photograph is required for each member to generate their official ID card." to "A clear passport-style photograph is recommended (optional) for each member to display on their official digital pass."
   - Line 253: Update description to reflect optional photo and DOB.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/seams.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/app/dashboard/page.tsx src/app/guide/page.tsx tests/seams.test.mjs
git commit -m "feat(dashboard): add not-specified DOB options and update photo guidance"
```

---

### Task 5: End-to-End Build, Test Verification & Git Branch Integration

**Files:**
- Test: All suites (`npm test`)
- Build: Next.js production build (`npm run build`)

**Interfaces:**
- Consumes: All updated files from Tasks 1–4.
- Produces: Verified production build, passing test suite, and clean merge with `main`.

- [ ] **Step 1: Run all test suites**

Run: `npm test`
Expected: 42/42 passing tests with 0 failures.

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`
Expected: Successful compile with zero TypeScript errors or lint issues.

- [ ] **Step 3: Verify git status and merge workflow**

Confirm on `main`, working tree clean, merge if on feature branch, and push `main` to `origin/main` according to memory policy `mem_d9d9857d0c68`.
