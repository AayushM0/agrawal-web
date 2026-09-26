# Global Agarwal Jobs & Careers Network (Pillar 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Global Agarwal Jobs & Careers Network (Strategic Pillar 4 / रोजगार व करियर) enabling individual community members to create verified professional profiles, explore career opportunities, upload resumes, connect with community mentors, and allow verified enterprises from the Global Business Network to post job openings and hire community talent with zero raw contact exposure.

**Architecture:** Extends the Next.js App Router and PostgreSQL architecture. Introduces `career_profiles`, `job_postings`, and `job_applications` with Row Level Security (RLS). Adds server actions in `src/actions/career.ts` with strict session and live household gating. Delivers public talent search and job board at `/careers`, individual profile showcase at `/careers/[id]`, job detail at `/careers/jobs/[id]`, 4-step profile wizard at `/careers/create`, enterprise job builder at `/careers/jobs/create`, dashboard integration in `/dashboard`, admin moderation queue at `/admin/moderation`, user guide topic 9 in `/guide`, and Seam 25 contract tests in `tests/seams.test.mjs`.

**Tech Stack:** Next.js 15.3.9, React 19, TypeScript, PostgreSQL (Docker PostGIS / pg), Tailwind CSS, node:test.

---

## Global Constraints & Architectural Decisions
- **ADR-0001 & ADR-0004 (Contact Masking & In-Website Chat):** Candidate personal phone numbers and emails are NEVER rendered in public HTML or JSON payloads. Inquiries, interview requests, and mentorship applications route exclusively through in-platform messaging.
- **Strict Household Verification Gating:** Only authenticated members of households with `status === 'live'` can create career profiles or post job openings.
- **One Profile Per Individual Member:** A verified member (`members.id`) can own exactly one active career profile (`career_profiles.member_id UNIQUE`).
- **Surgical Isolation (`/surgical-changes`):** Zero modifications to existing directory, matrimony, or business tables. All 24 existing Seam tests must remain 100% passing.
- **Edge-Case Hardening (`/edge-case-audit`):** Idempotent DDL migrations, strict resume PDF MIME validation (max 5MB), PostgreSQL `TEXT[]` array parameterization, and confidential employer masking.

---

## Edge-Case Audit & Invariants Checklist

### 1. Schema & Migration Compatibility
- [x] `career_profiles`, `job_postings`, and `job_applications` created with `IF NOT EXISTS` in `schema.sql` and `src/lib/db.ts` (`ensureSchema`).
- [x] Foreign keys reference `households(id) ON DELETE CASCADE`, `members(id) ON DELETE CASCADE`, and `business_profiles(id) ON DELETE SET NULL`.
- [x] Unique constraint `career_profiles_member_id_key` and composite uniqueness `job_applications(job_posting_id, applicant_member_id)` ensure idempotent `ON CONFLICT` execution.
- [x] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` executed safely without table locks.

### 2. Encodings & System Paths
- [x] Resume uploads accept only `application/pdf`, max 5MB, sanitized filename `resumes/${householdId}_${memberId}_${Date.now()}.pdf`.
- [x] Skill tags normalized to lowercase for indexing while preserving display casing.
- [x] Windows/Linux cross-platform test file paths normalized via `path.resolve`.

### 3. Delimiters & Format Collision Traps
- [x] PostgreSQL `TEXT[]` arrays (`skills`, `preferred_locations`, `skills_required`) passed as native string arrays or parameterized `$1::text[]` to prevent delimiter corruption.
- [x] Search query inputs sanitized: SQL `LIKE` wildcards (`%`, `_`) escaped before querying.
- [x] Salary ranges stored as clean string bounds or formatted labels (e.g. `₹12 - ₹18 LPA`), not unvalidated raw user HTML.

### 4. Protocol & Harness Implicit Invariants
- [x] `getSession()` verification on every server action mutation.
- [x] Household `status === 'live'` enforced before allowing profile creation or job posting.
- [x] Confidential mode: If `is_confidential_mode = true`, current company is replaced with `"Confidential Enterprise"` in public feeds.
- [x] Zero regressions across existing Seams 1–24; Seam 25 verifies Pillar 4 contracts.

---

## Bite-Sized Implementation Tasks

### Task 1: Database Schema, TypeScript Types & Data Access Layer (Issue 01)

**Files:**
- Create: `web/src/types/career.ts`
- Modify: `web/src/db/schema.sql`
- Modify: `web/src/lib/db.ts`
- Test: `web/tests/career-schema.test.mjs`

**Interfaces:**
- Produces: `CareerProfile`, `JobPosting`, `JobApplication`, and filter interfaces in `src/types/career.ts`.
- Produces: `career_profiles`, `job_postings`, `job_applications` DDL and RLS in `schema.sql`.
- Produces: Data access methods in `src/lib/db.ts`:
  - `createCareerProfile(input)`, `getCareerProfileById(id)`, `getCareerProfileByMemberId(memberId)`, `getLiveCareerProfiles(filters)`, `updateCareerProfile(id, input)`, `deleteCareerProfile(id)`
  - `createJobPosting(input)`, `getJobPostingById(id)`, `getLiveJobPostings(filters)`, `updateJobPosting(id, input)`, `closeJobPosting(id)`
  - `createJobApplication(input)`, `getJobApplicationsByPosting(jobPostingId)`, `getJobApplicationsByMember(memberId)`

- [ ] **Step 1: Write the failing test**
Create `web/tests/career-schema.test.mjs` asserting:
1. `src/types/career.ts` exports `CareerProfile`, `JobPosting`, `JobApplication`.
2. `schema.sql` contains `CREATE TABLE IF NOT EXISTS career_profiles`, `job_postings`, `job_applications` with RLS enabled.
3. `src/lib/db.ts` contains all required career and job CRUD methods.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/career-schema.test.mjs`
Expected: FAIL (missing `src/types/career.ts`).

- [ ] **Step 3: Implement Schema, Types & DB Methods**
1. Create `src/types/career.ts` with complete type definitions.
2. Update `src/db/schema.sql` with table DDL, indexes, and RLS policies.
3. Implement career database operations in `src/lib/db.ts` and wire into `ensureSchema`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/career-schema.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/types/career.ts src/db/schema.sql src/lib/db.ts tests/career-schema.test.mjs`
`git commit -m "feat(career): add career_profiles and job_postings schema, types, and db data layer"`

---

### Task 2: Career Server Actions & Authorization Engine (Issue 02)

**Files:**
- Create: `web/src/actions/career.ts`
- Test: `web/tests/career-actions.test.mjs`

**Interfaces:**
- Consumes: `src/lib/db.ts`, `getSession` from `src/actions/session.ts`.
- Produces:
  - `createCareerProfileAction(formData)`
  - `updateCareerProfileAction(id, formData)`
  - `toggleCareerProfileVisibilityAction(id)`
  - `deleteCareerProfileAction(id)`
  - `getLiveCareerProfilesAction(filters)`
  - `getCareerProfileByIdAction(id)`
  - `createJobPostingAction(formData)`
  - `closeJobPostingAction(id)`
  - `applyForJobAction(jobId, coverNote)`

- [ ] **Step 1: Write the failing test**
Create `web/tests/career-actions.test.mjs` asserting:
1. Unauthenticated mutations return `{ success: false, error: "Unauthorized" }`.
2. Households with `status !== 'live'` cannot create career profiles or post jobs.
3. Returned profiles never contain raw `verifiedContact` or unmasked personal emails.
4. Calling `toggleCareerProfileVisibilityAction` flips status between `live` and `paused`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/career-actions.test.mjs`
Expected: FAIL (`src/actions/career.ts` does not exist).

- [ ] **Step 3: Implement Server Actions in `src/actions/career.ts`**
1. Validate active session and verify household is live.
2. Ensure one profile per member constraint.
3. Sanitize returned candidate and job posting records.
4. Enforce ownership verification on edits and deletions.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/career-actions.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/actions/career.ts tests/career-actions.test.mjs`
`git commit -m "feat(career): implement career server actions with strict authorization and PII masking"`

---

### Task 3: Public Career Showcase & Talent Directory (`/careers` & `/careers/[id]`) (Issue 03)

**Files:**
- Create: `web/src/app/careers/page.tsx`
- Create: `web/src/app/careers/[id]/page.tsx`
- Modify: `web/src/components/layout/MainHeader.tsx`
- Modify: `web/src/components/layout/MainFooter.tsx`
- Modify: `web/src/components/layout/TopNavBar.tsx`
- Test: `web/tests/career-pages.test.mjs`

**Interfaces:**
- Consumes: `getLiveCareerProfilesAction`, `getLiveJobPostingsAction`, `getCareerProfileByIdAction` from `src/actions/career.ts`.
- Produces: Public directory search, candidate filtering (by Domain, Seniority, Gotra, Location, Skills), and profile resume view.

- [ ] **Step 1: Write the failing test**
Create `web/tests/career-pages.test.mjs` asserting:
1. `src/app/careers/page.tsx` renders dual tabs: "Professionals & Talent" and "Job Openings".
2. `src/app/careers/[id]/page.tsx` renders verified community badge, Gotra, Native Place, Experience, and Skills.
3. Layout headers and footers contain `/careers` navigation links.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/career-pages.test.mjs`
Expected: FAIL (pages do not exist).

- [ ] **Step 3: Implement Directory & Showcase Pages**
1. Build `/careers/page.tsx` with Maharaja Agrasen Heritage design tokens, live search, domain pills, and Gotra dropdown.
2. Build `/careers/[id]/page.tsx` with professional resume timeline, skills list, and in-platform connection request CTA.
3. Add `/careers` navigation links into `MainHeader.tsx`, `MainFooter.tsx`, and `TopNavBar.tsx`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/career-pages.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/app/careers/page.tsx src/app/careers/[id]/page.tsx src/components/layout/ tests/career-pages.test.mjs`
`git commit -m "feat(career): create public talent directory and individual career profile showcase"`

---

### Task 4: Individual Career Profile Builder Wizard (`/careers/create`) (Issue 04)

**Files:**
- Create: `web/src/app/careers/create/page.tsx`
- Test: `web/tests/career-builder.test.mjs`

**Interfaces:**
- Consumes: `getSession` from `src/actions/session.ts`, `createCareerProfileAction` from `src/actions/career.ts`.
- Produces: 4-step responsive wizard:
  - Step 1: Member Selection & Basic Headline (Auto-select member, Domain, Seniority, Current Role)
  - Step 2: Experience & Educational Credentials (Degrees, University, Years of Exp)
  - Step 3: Skills & Resume Attachment (Skill tags, Resume PDF upload, Portfolio URL)
  - Step 4: Career Intent & Privacy Controls (Actively Looking / Open to Offers, Confidential Mode toggle, Mentorship toggle)

- [ ] **Step 1: Write the failing test**
Create `web/tests/career-builder.test.mjs` asserting:
1. Wizard renders 4 progress steps with Next/Back controls.
2. Step 1 requires headline, domain, and career level.
3. Submitting triggers `createCareerProfileAction` and redirects on success.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/career-builder.test.mjs`
Expected: FAIL (`/careers/create/page.tsx` does not exist).

- [ ] **Step 3: Implement 4-Step Wizard**
1. Build `/careers/create/page.tsx` with responsive layout and touch targets (`min-h-[38px]`).
2. Add client-side validation and auto-scroll to top on step transitions.
3. Connect form data submission to `createCareerProfileAction`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/career-builder.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/app/careers/create/page.tsx tests/career-builder.test.mjs`
`git commit -m "feat(career): add individual career profile builder wizard"`

---

### Task 5: Enterprise Job Postings & 1-Click Application (`/careers/jobs/[id]` & `/careers/jobs/create`) (Issue 05)

**Files:**
- Create: `web/src/app/careers/jobs/[id]/page.tsx`
- Create: `web/src/app/careers/jobs/create/page.tsx`
- Test: `web/tests/career-jobs.test.mjs`

**Interfaces:**
- Consumes: `getJobPostingByIdAction`, `applyForJobAction`, `createJobPostingAction` from `src/actions/career.ts`.
- Produces: Full job posting detail page with "Apply with Agarwal Profile" button, and enterprise job creation form.

- [ ] **Step 1: Write the failing test**
Create `web/tests/career-jobs.test.mjs` asserting:
1. Job detail page renders title, company, workplace mode, experience, and requirements.
2. Clicking "Apply" invokes `applyForJobAction` and displays confirmation toast.
3. Job creation page allows verified businesses to post vacancies.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/career-jobs.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement Job Detail & Job Posting Form**
1. Build `/careers/jobs/[id]/page.tsx` with clean description, verified enterprise link, and 1-click apply.
2. Build `/careers/jobs/create/page.tsx` for verified employers.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/career-jobs.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/app/careers/jobs/ tests/career-jobs.test.mjs`
`git commit -m "feat(career): implement enterprise job openings and 1-click candidate application"`

---

### Task 6: Household Dashboard, Admin Moderation & User Guide Integration (Issue 06)

**Files:**
- Modify: `web/src/app/dashboard/page.tsx`
- Modify: `web/src/app/admin/moderation/page.tsx`
- Modify: `web/src/app/guide/page.tsx`
- Modify: `web/src/components/home/SevenPillarsGrid.tsx`
- Test: `web/tests/career-integration.test.mjs`

**Interfaces:**
- Produces: "💼 Career & Jobs" tab on user dashboard.
- Produces: "💼 Career Moderation" tab in admin portal.
- Produces: Topic 9 in `/guide/page.tsx` explaining the Jobs & Careers Network.
- Produces: Pillar 4 updated to `LIVE` in `SevenPillarsGrid.tsx`.

- [ ] **Step 1: Write the failing test**
Create `web/tests/career-integration.test.mjs` asserting:
1. `dashboard/page.tsx` contains a Career tab for viewing and pausing profile visibility.
2. `admin/moderation/page.tsx` renders career moderation tab.
3. `guide/page.tsx` documents Topic 9: "Jobs & Careers Network".
4. `SevenPillarsGrid.tsx` renders Pillar 4 as `LIVE`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/career-integration.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement Integrations**
1. Surgically add Career tab to `dashboard/page.tsx`.
2. Add career queue review to `admin/moderation/page.tsx`.
3. Add Topic 9 to `guide/page.tsx`.
4. Update Pillar 4 status to `LIVE` with link `/careers` in `SevenPillarsGrid.tsx`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/career-integration.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/app/dashboard/page.tsx src/app/admin/moderation/page.tsx src/app/guide/page.tsx src/components/home/SevenPillarsGrid.tsx tests/career-integration.test.mjs`
`git commit -m "feat(career): integrate dashboard management, admin moderation, and user guide topic 9"`

---

### Task 7: Seam 25 Contract Verification & Full Regression Audit (Issue 07)

**Files:**
- Modify: `web/tests/seams.test.mjs`

**Interfaces:**
- Produces: Seam 25: "Global Agarwal Jobs & Careers Network adheres to all contracts and invariants".

- [ ] **Step 1: Add Seam 25 to `tests/seams.test.mjs`**
Assert:
1. `career_profiles`, `job_postings`, `job_applications` tables exist with RLS in `schema.sql` and `db.ts`.
2. All server actions in `src/actions/career.ts` require session and check live household status.
3. No raw phone or email fields exposed in candidate or job models.
4. Top navigation and footer link to `/careers`.
5. User guide Topic 9 is registered.

- [ ] **Step 2: Run full test suite**
Run: `npm test`
Expected: ALL 37 tests PASS.

- [ ] **Step 3: Run TypeScript compiler check**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Run production build**
Run: `npm run build`
Expected: 0 errors, all routes statically/dynamically generated.

- [ ] **Step 5: Commit**
`git add tests/seams.test.mjs`
`git commit -m "test(seams): add Seam 25 contract test for Global Agarwal Jobs & Careers Network"`
