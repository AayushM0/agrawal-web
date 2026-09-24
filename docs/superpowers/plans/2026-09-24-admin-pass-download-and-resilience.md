# Admin Pass Download, Serverless PDF Resilience, Error Visibility & Mobile Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix serverless PDF pass generation and email dispatch so passes and approval notifications are never dropped, add admin pass downloading (household dropdown + per-member buttons), expose real-time error diagnostics on the dashboard, and overhaul mobile responsiveness.

**Architecture:** Next.js Serverless file tracing ensures TTF fonts are bundled into Vercel Lambdas with remote CDN and standard Helvetica fallbacks. Moderation dispatch is decoupled from attachment counts so approval emails always deliver. The Admin Moderation Dashboard is upgraded with an action-level pass download dropdown, per-member download links, real-time warning indicators, an expanded Email Queue diagnostics column, and touch-scrolling responsive layout.

**Tech Stack:** Next.js 15.3.9, React 19, @react-pdf/renderer 4.7.0, PostgreSQL (pg / Supabase), Tailwind CSS.

## Global Constraints
- Strictly preserve all existing database tables, constraints, and untouched components (`/surgical-changes`).
- No dropped emails: Approval emails must be enqueued even if an individual PDF generation warning occurs.
- Zero `ENOENT` crashes in Serverless: Dynamic candidate font resolution with remote CDN and Helvetica fallback.
- Mobile viewport support down to 320px width without horizontal viewport clipping or overlapping elements.
- All code additions must pass TypeScript compilation and Next.js production build (`npm run build`).

---

### Task 1: Serverless PDF Font Tracing & Fallback Resilience (Issue 041)

**Files:**
- Modify: `web/next.config.ts`
- Modify: `web/src/components/PassPDF.tsx:1-40`
- Test: `web/tests/pass-pdf-resilience.test.mjs`

**Interfaces:**
- Produces: Resilient `PassPDF` component that generates PDFs in serverless lambdas without crashing or throwing `ENOENT`.

- [ ] **Step 1: Write the failing test**
Create `web/tests/pass-pdf-resilience.test.mjs` testing that PDF rendering succeeds even when the current working directory has no `public/fonts` directory (simulating Vercel `/var/task`).

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/pass-pdf-resilience.test.mjs`
Expected: FAIL with `ENOENT` on `public/fonts/NotoSansDevanagari-Regular.ttf`.

- [ ] **Step 3: Update `next.config.ts` and `PassPDF.tsx`**
Configure `outputFileTracingIncludes: { '/**/*': ['./public/fonts/**/*'] }` in `next.config.ts`.
In `PassPDF.tsx`:
1. Check candidate font paths using `path.join(process.cwd(), ...)` and `fs.existsSync`.
2. Fall back to CDN URL or Helvetica if the local file is not accessible.
3. Catch image errors on member photos with fallback placeholder.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/pass-pdf-resilience.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add next.config.ts src/components/PassPDF.tsx tests/pass-pdf-resilience.test.mjs`
`git commit -m "fix(pdf): serverless font tracing, CDN fallback, and resilient PDF generation"`

---

### Task 2: Non-Dropping Moderation Dispatch & Diagnostic Audit Logging (Issue 042)

**Files:**
- Modify: `web/src/actions/moderate.ts:70-170`
- Modify: `web/src/actions/moderate.ts:270-320`
- Test: `web/tests/moderation-dispatch-safety.test.mjs`

**Interfaces:**
- Produces: `notifyHouseholdMembers` returning `{ success, enqueuedCount, attachmentsCount, memberCount, errors }`.
- Produces: `resendHouseholdPassAction` returning truthful count feedback and logging `PASS_GENERATION_WARNING` to `admin_audit_logs`.

- [ ] **Step 1: Write the failing test**
Create `web/tests/moderation-dispatch-safety.test.mjs` verifying that when attachments array is empty, email enqueuing is NOT skipped, and audit warnings are recorded.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/moderation-dispatch-safety.test.mjs`
Expected: FAIL (empty attachments currently skips `enqueueEmail`).

- [ ] **Step 3: Implement non-dropping email logic in `src/actions/moderate.ts`**
Remove `allAttachments.length > 0` guard from primary email dispatch. Include a clear dashboard link fallback if no attachments could be generated.
Log structured `PASS_GENERATION_WARNING` to `admin_audit_logs` if any member PDF fails.
Return detailed metrics from `resendHouseholdPassAction`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/moderation-dispatch-safety.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/actions/moderate.ts tests/moderation-dispatch-safety.test.mjs`
`git commit -m "fix(moderate): ensure approval email dispatch never drops and log audit warnings"`

---

### Task 3: Admin Pass Direct Download & Member Selection (Issue 043)

**Files:**
- Modify: `web/src/app/admin/moderation/page.tsx:760-840`

**Interfaces:**
- Consumes: `/api/pass/pdf?memberId={id}` (existing authenticated API route).
- Produces: "📥 Download Pass" dropdown button beside "Resend ID Passes" + per-member direct download buttons.

- [ ] **Step 1: Add member dropdown state and download triggers in `page.tsx`**
Add state: `const [downloadingHouseholdId, setDownloadingHouseholdId] = useState<string | null>(null);`
Add household-level "📥 Download Pass ▾" button with interactive member selection popover for families.
Add per-member "📥 Pass" link button on each member breakdown card.

- [ ] **Step 2: Verify in browser / build**
Run: `npm run build` to verify JSX, types, and styling compile cleanly.

- [ ] **Step 3: Commit**
`git add src/app/admin/moderation/page.tsx`
`git commit -m "feat(admin): add direct pass download button and family member selector"`

---

### Task 4: Admin Dashboard Error Diagnostics & Warning Indicators (Issue 044)

**Files:**
- Modify: `web/src/app/admin/moderation/page.tsx`
- Modify: `web/src/actions/moderate.ts`

**Interfaces:**
- Produces: Real-time error warning badges on household cards.
- Produces: Expanded "Error Diagnostics" column in Email Queue table with "⚠️ Failed Only" filter.

- [ ] **Step 1: Update moderation state and data loaders**
Expose dispatch warning/error history in `getModerationHouseholds()` or via audit log lookups.
Add "⚠️ Failed Only" toggle filter to Email Queue view.

- [ ] **Step 2: Render error badges on household rows**
Show red/amber alert box on household card if dispatch warnings occurred, showing error message, timestamp, and a direct "Retry Dispatch" button.
In the Email Queue table, expand error display with full message and copyable details.

- [ ] **Step 3: Verify build**
Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 4: Commit**
`git add src/app/admin/moderation/page.tsx src/actions/moderate.ts`
`git commit -m "feat(admin): add real-time dispatch error badges and email queue diagnostics"`

---

### Task 5: Admin Moderation Dashboard Mobile Responsiveness Overhaul (Issue 045)

**Files:**
- Modify: `web/src/app/admin/moderation/page.tsx`

**Interfaces:**
- Produces: 100% fluid, responsive layout across all viewports (320px to 4K).

- [ ] **Step 1: Overhaul header and tab navigation**
Wrap filter tabs in `overflow-x-auto no-scrollbar min-w-max pb-1` container so all 7 tabs scroll horizontally without viewport clipping.

- [ ] **Step 2: Overhaul table containers**
Add responsive minimum column widths (`min-w-[120px]`, `min-w-[150px]`) and horizontal scroll wrappers to Incomplete Signups and Email Queue tables.

- [ ] **Step 3: Overhaul household cards and action buttons**
Ensure action buttons wrap responsively (`flex flex-wrap items-center gap-2 w-full sm:w-auto`) with touch-friendly tap targets (`min-h-[38px]`).
Make family member cards stack on mobile (`grid-cols-1 md:grid-cols-2`).
Make Rejection Modal touch-friendly and scrollable (`max-h-[90vh] overflow-y-auto`).

- [ ] **Step 4: Verify build**
Run: `npm run build`
Expected: Exit code 0.

- [ ] **Step 5: Commit**
`git add src/app/admin/moderation/page.tsx`
`git commit -m "style(admin): overhaul moderation dashboard mobile responsiveness and touch layouts"`

---

### Task 6: End-to-End Verification & Verification Suite

- [ ] **Step 1: Run all test suites**
Run: `npm test`
Run: `node --test tests/pass-pdf-resilience.test.mjs tests/moderation-dispatch-safety.test.mjs`

- [ ] **Step 2: Run Next.js production build**
Run: `npm run build`
Ensure all pages generate cleanly with 0 TypeScript or lint errors.
