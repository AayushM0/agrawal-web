# Responsive UI & Mobile Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate mobile viewport overflow, fix button squashing, and ensure pixel-perfect responsive layouts across all screen sizes (320px to 1440px+).

**Architecture:** Tailwind CSS utility adjustments leveraging flexible max-width bounds (`max-w-[340px] w-full`), CSS grid column auto-wrapping, `min-w-0` overflow prevention on flex/grid items, and touch-target padding.

**Tech Stack:** Next.js App Router (React 19), Tailwind CSS, TypeScript.

---

### Task 1: Responsive Lanyard Pass Card

**Files:**
- Modify: `src/app/dashboard/pass/LanyardPassClient.tsx:60-120`

- [ ] **Step 1: Update card width and top navigation bar**
Replace fixed `w-[340px]` on `#lanyard-card` with `w-full max-w-[340px] min-w-0`. Make top controls bar responsive with `flex-wrap gap-2 justify-between`.

- [ ] **Step 2: Verify no horizontal overflow on small screens**
Run `npm run build` to ensure valid compilation.

- [ ] **Step 3: Commit**
```bash
git add src/app/dashboard/pass/LanyardPassClient.tsx
git commit -m "fix(ui): make lanyard pass card fully responsive on mobile"
```

---

### Task 2: Responsive Directory Search Bar & Mobile Filter Grid

**Files:**
- Modify: `src/app/directory/page.tsx:70-130`

- [ ] **Step 1: Update search input and filter buttons layout**
Update the search bar row so the search input takes full width on mobile, and the "?? Filters" and "Near Me" buttons form a balanced 2-column grid (`grid grid-cols-2 sm:flex gap-2`).

- [ ] **Step 2: Verify compilation and tests**
Run `node tests/seams.test.mjs` and `npm run build`.

- [ ] **Step 3: Commit**
```bash
git add src/app/directory/page.tsx
git commit -m "fix(ui): improve directory search and filter bar mobile layout"
```

---

### Task 3: Registration Wizard Step 3 Grid & Form Polish

**Files:**
- Modify: `src/app/signup/page.tsx:780-1070`

- [ ] **Step 1: Add min-w-0 and responsive photo upload stacking**
Add `min-w-0` to all grid cells in Step 3 member inputs to prevent iOS Safari date picker and dropdown overflow. Ensure photo upload button rows stack nicely on extra-small viewports.

- [ ] **Step 2: Verify compilation**
Run `npm run build`.

- [ ] **Step 3: Commit**
```bash
git add src/app/signup/page.tsx
git commit -m "fix(ui): polish signup wizard member form responsiveness"
```

---

### Task 4: Main Navigation Header & Dashboard Action Buttons

**Files:**
- Modify: `src/components/layout/MainHeader.tsx:38-65`
- Modify: `src/app/dashboard/page.tsx:340-405`

- [ ] **Step 1: Adjust brand typography and dashboard card buttons**
Ensure header title and slogans scale gracefully on <380px screens without clipping hamburger menu or CTA buttons. Make member card action buttons in Dashboard wrap into full-width touch buttons on mobile.

- [ ] **Step 2: Verify full build and test suite**
Run `node tests/seams.test.mjs` and `npm run build`.

- [ ] **Step 3: Commit**
```bash
git add src/components/layout/MainHeader.tsx src/app/dashboard/page.tsx
git commit -m "fix(ui): optimize header and dashboard action buttons for mobile"
```

