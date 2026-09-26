# Issue 050: Platform Navigation, User Guide Topic 9, Admin Moderation & Seam 25 Contract Verification

## What to build

Implement platform-wide navigation, educational user guide documentation, admin moderation oversight, and Seam 25 end-to-end contract verification for the Global Agarwal Jobs & Careers Network.

Integrates `/careers` into all site navigation headers and footers, documents community career policies in `/guide`, provides administrative moderation tools for reviewing flagged postings, and guarantees zero regressions across all 24 existing seams.

Context pointer: `docs/superpowers/plans/2026-09-26-global-career-network.md` (Task 6 & Task 7).

## Acceptance criteria

- [ ] Top navigation bar (`MainHeader.tsx`, `TopNavBar.tsx`) and footer (`MainFooter.tsx`) link directly to `/careers`.
- [ ] Homepage Seven Pillars grid (`SevenPillarsGrid.tsx`) marks Pillar 4 ("Jobs & Careers") as `LIVE` linking to `/careers`.
- [ ] `/guide` includes Topic 9: "Jobs & Careers Network (रोजगार व करियर)" in English and Hindi.
- [ ] `/admin/moderation` provides a career review tab for flagged job postings or candidate profiles.
- [ ] Seam 25 contract test is added to `tests/seams.test.mjs` verifying all Pillar 4 invariants.
- [ ] Full regression suite passes: `npm test` runs 37+ tests with 0 failures, `npx tsc --noEmit` exits clean, and `npm run build` succeeds.

## Blocked by

- `docs/issues/046-core-career-profile-schema-and-builder.md`
- `docs/issues/047-public-talent-showcase-and-profile-page.md`
- `docs/issues/048-enterprise-job-postings-and-application.md`
- `docs/issues/049-household-dashboard-and-career-communication.md`
