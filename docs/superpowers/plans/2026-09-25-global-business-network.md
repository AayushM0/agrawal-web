# Global Agarwal Business Network (Pillar 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Global Agarwal Business Network (Strategic Pillar 2) providing a verified commercial enterprise directory, showcase profiles, leadership linking to `/directory/[id]`, administrative moderation with verified enterprise badges, and exclusive in-website commercial chat with zero raw contact exposure.

**Architecture:** Extends the Next.js App Router and PostgreSQL architecture. Adds `business_profiles` with RLS, server actions in `src/actions/business.ts` with household live status gating, public directory search `/businesses` and showcase `/businesses/[id]` adhering to Maharaja Agrasen Heritage design tokens, `/businesses/create` 4-step wizard, dashboard management under `/dashboard`, `/moderation` review queue, Topic 8 in `/guide/page.tsx`, and Seam 24 contract tests in `web/tests/seams.test.mjs`.

**Tech Stack:** Next.js 15.3.9, React 19, TypeScript, PostgreSQL (Supabase / pg), Pusher Server & Pusher JS, Tailwind CSS, node:test.

## Global Constraints
- Strictly adhere to ADR-0001 (contact masking) and ADR-0004 (in-website chat exclusively, no raw phone/email in public HTML/JSON payloads).
- Only authenticated members of households with `status === 'live'` can create businesses.
- Zero breaking changes to existing directory, matrimony, or chat functions (`/surgical-changes`).
- All code additions must pass TypeScript compilation (`npm run type-check`) and Next.js production build (`npm run build`).

---

### Task 1: Database Schema, TypeScript Types & Data Layer (Issue 01)

**Files:**
- Create: `web/src/types/business.ts`
- Modify: `web/src/db/schema.sql`
- Modify: `web/src/lib/db.ts`
- Test: `web/tests/business-schema.test.mjs`

**Interfaces:**
- Produces: `LinkedDirector`, `BusinessCustomField`, and `BusinessProfile` types in `web/src/types/business.ts`.
- Produces: `business_profiles` table with RLS enabled in `schema.sql` and `db.ts`.
- Produces: Data access methods in `db.ts`: `createBusinessProfile`, `getBusinessProfileById`, `getLiveBusinessProfiles`, `getBusinessProfilesByHouseholdId`, `updateBusinessProfile`, `setBusinessProfileStatus`, `deleteBusinessProfile`.

- [ ] **Step 1: Write the failing test**
Create `web/tests/business-schema.test.mjs` verifying that:
1. `schema.sql` contains `CREATE TABLE IF NOT EXISTS business_profiles` with foreign keys and RLS enabled.
2. `src/types/business.ts` exports `BusinessProfile`, `LinkedDirector`, and `BusinessCustomField`.
3. `src/lib/db.ts` implements required CRUD methods.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/business-schema.test.mjs`
Expected: FAIL (missing `src/types/business.ts` and `business_profiles` table definition).

- [ ] **Step 3: Implement Schema, Types & DB Methods**
1. Create `web/src/types/business.ts` with all field definitions.
2. Update `web/src/db/schema.sql` with table DDL, indexes, and `ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;`.
3. Add data access methods to `web/src/lib/db.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/business-schema.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/types/business.ts src/db/schema.sql src/lib/db.ts tests/business-schema.test.mjs`
`git commit -m "feat(business): add business_profiles schema, types, and db data layer"`

---

### Task 2: Business Server Actions & Authorization Engine (Issue 02)

**Files:**
- Create: `web/src/actions/business.ts`
- Test: `web/tests/business-actions.test.mjs`

**Interfaces:**
- Consumes: `db` methods from `web/src/lib/db.ts`, `getSession` from `web/src/actions/auth.ts`.
- Produces: `createBusinessProfile`, `updateBusinessProfile`, `toggleBusinessVisibility`, `deleteBusinessProfile`, `getLiveBusinessProfiles`, `getBusinessProfileById`.

- [ ] **Step 1: Write the failing test**
Create `web/tests/business-actions.test.mjs` verifying that:
1. Calling mutation actions without an active session returns an unauthorized error.
2. Households with `status !== 'live'` cannot create a business profile.
3. `getLiveBusinessProfiles` returns only sanitized records with no raw phone or email fields.
4. Visibility toggle rejects unauthorized callers and toggles between `live` and `paused`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/business-actions.test.mjs`
Expected: FAIL (`src/actions/business.ts` does not exist).

- [ ] **Step 3: Implement Server Actions in `src/actions/business.ts`**
1. Implement auth validation against `getSession()`.
2. Check household `status === 'live'`.
3. Sanitize public payload (omit raw contact phone and personal emails).
4. Implement tenant ownership check for updates and deletions.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/business-actions.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/actions/business.ts tests/business-actions.test.mjs`
`git commit -m "feat(business): implement business server actions with strict authorization and PII masking"`

---

### Task 3: Public Directory & Enterprise Showcase Pages (Issue 03)

**Files:**
- Create: `web/src/app/businesses/page.tsx`
- Create: `web/src/app/businesses/[id]/page.tsx`
- Test: `web/tests/business-pages.test.mjs`

**Interfaces:**
- Consumes: `getLiveBusinessProfiles`, `getBusinessProfileById` from `src/actions/business.ts`.
- Produces: Public search & faceted filter UI on `/businesses` and responsive enterprise showcase on `/businesses/[id]`.

- [ ] **Step 1: Write the failing test**
Create `web/tests/business-pages.test.mjs` checking that:
1. `/businesses` page file exists and renders search input, sector filter chips, and verified toggle.
2. `/businesses/[id]` page file exists and renders brand hero, gallery, about section, specifications, and leadership cards.
3. Personal directory profile links are gated behind authentication.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/business-pages.test.mjs`
Expected: FAIL (page files missing).

- [ ] **Step 3: Implement `/businesses` and `/businesses/[id]`**
1. Build `web/src/app/businesses/page.tsx` with search state, sector pills, type checkboxes, location selector, and enterprise card grid.
2. Build `web/src/app/businesses/[id]/page.tsx` with brand hero, photo gallery (1-3 photos), about copy, specifications grid, linked director cards, and "💬 Connect / Chat with Business" button.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/business-pages.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/app/businesses/page.tsx src/app/businesses/[id]/page.tsx tests/business-pages.test.mjs`
`git commit -m "feat(business): create public directory search and enterprise showcase pages"`

---

### Task 4: Profile Builder & Dashboard Enterprise Management (Issue 04)

**Files:**
- Create: `web/src/app/businesses/create/page.tsx`
- Modify: `web/src/app/dashboard/page.tsx`
- Test: `web/tests/business-builder.test.mjs`

**Interfaces:**
- Consumes: `createBusinessProfile`, `updateBusinessProfile`, `toggleBusinessVisibility`, `deleteBusinessProfile` from `src/actions/business.ts`.
- Produces: 4-step enterprise registration wizard on `/businesses/create` and "My Businesses" management tab on `/dashboard`.

- [ ] **Step 1: Write the failing test**
Create `web/tests/business-builder.test.mjs` verifying that:
1. `/businesses/create` page file exists, implements 4-step wizard, and validates mandatory fields.
2. `dashboard/page.tsx` contains "My Businesses" tab rendering active status chips, edit link, pause toggle, and delete button.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/business-builder.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement Builder & Dashboard Tab**
1. Implement `web/src/app/businesses/create/page.tsx` (Step 1: Info, Step 2: About & Offerings, Step 3: Media & GSTIN, Step 4: Leadership Linking with `isPrimaryContact`).
2. Add "My Businesses" (व्यापार प्रतिष्ठान) tab to `web/src/app/dashboard/page.tsx` with live status badges (`Under Review`, `Live`, `Paused`, `Needs Revision`), pause toggle, and delete modal.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/business-builder.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/app/businesses/create/page.tsx src/app/dashboard/page.tsx tests/business-builder.test.mjs`
`git commit -m "feat(business): add enterprise profile builder wizard and household dashboard management tab"`

---

### Task 5: In-Website Commercial Chat Routing & Anti-Fraud Privacy (Issue 05)

**Files:**
- Modify: `web/src/actions/business.ts`
- Modify: `web/src/app/businesses/[id]/page.tsx`
- Test: `web/tests/business-chat.test.mjs`

**Interfaces:**
- Consumes: `sendMessage` from `src/actions/chat.ts`, `scanForFraud` from `src/lib/anti-fraud.ts`.
- Produces: `initiateBusinessChat(businessId)` server action in `src/actions/business.ts`.

- [ ] **Step 1: Write the failing test**
Create `web/tests/business-chat.test.mjs` verifying that:
1. `initiateBusinessChat` requires an authenticated session.
2. Resolves the primary contact director from `linked_directors`.
3. Disallows self-messaging if caller is the primary contact director.
4. Initializes conversation with contextual inquiry tag (`[Business Inquiry: ...]`).

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/business-chat.test.mjs`
Expected: FAIL (`initiateBusinessChat` not yet implemented).

- [ ] **Step 3: Implement `initiateBusinessChat` and Wire UI**
1. Add `initiateBusinessChat` in `src/actions/business.ts` routing to the primary contact director.
2. Wire the "💬 Connect / Chat with Business" button in `src/app/businesses/[id]/page.tsx` to call `initiateBusinessChat` and redirect to `/messages?conversationId=...`.
3. Prompt unauthenticated visitors with login modal redirecting back to the business page.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/business-chat.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/actions/business.ts src/app/businesses/[id]/page.tsx tests/business-chat.test.mjs`
`git commit -m "feat(business): wire in-website commercial chat routing with anti-fraud protection"`

---

### Task 6: Admin Moderation Portal & Verified Badge Workflow (Issue 06)

**Files:**
- Modify: `web/src/actions/moderate.ts` (or `web/src/actions/business.ts`)
- Modify: `web/src/app/moderation/page.tsx`
- Test: `web/tests/business-moderation.test.mjs`

**Interfaces:**
- Produces: `approveBusinessProfileAction`, `rejectBusinessProfileAction` server actions.
- Produces: "Business Directory" tab in `/moderation` with credential review, verified badge award toggle, and rejection modal.

- [ ] **Step 1: Write the failing test**
Create `web/tests/business-moderation.test.mjs` verifying that:
1. Moderation server actions enforce admin session.
2. Approving transitions status to `live` and awards `is_verified_badge`.
3. Rejecting transitions status to `rejected`, stores `rejection_reason`, and triggers email.
4. `/moderation` page renders the Business Directory tab.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/business-moderation.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement Admin Moderation Tab & Actions**
1. Add `approveBusinessProfileAction` and `rejectBusinessProfileAction`.
2. Add "Business Directory (व्यापार प्रतिष्ठान समीक्षा)" tab in `web/src/app/moderation/page.tsx`.
3. Include GSTIN/CIN inspection and "Award Verified Enterprise Badge" checkbox.
4. Record audit log entry in `admin_audit_logs`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/business-moderation.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/actions/moderate.ts src/app/moderation/page.tsx tests/business-moderation.test.mjs`
`git commit -m "feat(business): implement admin moderation portal queue and verified enterprise badge workflow"`

---

### Task 7: Navigation Integration, Bilingual User Guide & Seam 24 Contract Suite (Issue 07)

**Files:**
- Modify: `web/src/components/layout/TopNavBar.tsx`
- Modify: `web/src/components/layout/MainHeader.tsx`
- Modify: `web/src/components/layout/MainFooter.tsx`
- Modify: `web/src/app/guide/page.tsx`
- Modify: `web/tests/seams.test.mjs`

**Interfaces:**
- Produces: Navigation links to `/businesses` in Header, Nav, and Footer.
- Produces: Topic 8 in `src/app/guide/page.tsx` with English/Hindi copy, 4-step flowchart, and FAQs.
- Produces: **Seam 24** in `web/tests/seams.test.mjs` asserting all contract invariants.

- [ ] **Step 1: Write the failing test**
Add **Seam 24** to `web/tests/seams.test.mjs` asserting:
1. Schema & RLS enablement for `business_profiles`.
2. Server actions authorization contracts in `src/actions/business.ts`.
3. Navigation links to `/businesses` in `TopNavBar.tsx`, `MainHeader.tsx`, and `MainFooter.tsx`.
4. Topic 8 presence in `src/app/guide/page.tsx`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/seams.test.mjs`
Expected: FAIL on Seam 24 assertions.

- [ ] **Step 3: Implement Navigation & User Guide Topic 8**
1. Add "Business Network" links in `TopNavBar.tsx`, `MainHeader.tsx`, and `MainFooter.tsx`.
2. Add Topic 8: Global Business Network (अग्रवाल व्यापार एवं उद्योग मंच) to `web/src/app/guide/page.tsx`.

- [ ] **Step 4: Run full verification suite**
Run: `node --test tests/seams.test.mjs`
Expected: PASS (all 24 seams pass).
Run: `npm run type-check`
Expected: 0 errors.
Run: `npm run build`
Expected: Clean build.

- [ ] **Step 5: Commit**
`git add src/components/layout/TopNavBar.tsx src/components/layout/MainHeader.tsx src/components/layout/MainFooter.tsx src/app/guide/page.tsx tests/seams.test.mjs`
`git commit -m "feat(business): add site-wide navigation links, Topic 8 bilingual user guide, and Seam 24 contract tests"`
