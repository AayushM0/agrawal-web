# Issue 046: Core Career Profile Data Layer & Individual Member Profile Builder

## What to build

Implement the foundational individual career profile vertical slice for the Global Agarwal Jobs & Careers Network. Enables verified community members of approved households to build an individual professional profile with their professional headline, primary industry domain, career seniority stage, education credentials, skill tags, resume PDF attachment, confidentiality toggle, and mentorship availability.

When a verified member accesses the profile builder, they complete a responsive 4-step wizard with validation, upload their CV securely, and publish their career profile with immediate database persistence and automatic community verification badging.

Context pointer for data model and wizard specification: `docs/superpowers/plans/2026-09-26-global-career-network.md` (Task 1 & Task 4).

## Acceptance criteria

- [ ] `career_profiles` table exists in PostgreSQL schema with foreign keys referencing `households(id)` and `members(id)` with RLS enabled.
- [ ] TypeScript interfaces `CareerProfile` and related filter/input types are exported from the types module.
- [ ] Server action `createCareerProfileAction` authenticates session, enforces household `status === 'live'`, and prevents duplicate profiles for the same member.
- [ ] 4-step responsive wizard renders at `/careers/create` with mobile-friendly controls (`min-h-[38px]`).
- [ ] Resume upload validates PDF MIME type (maximum 5MB limit).
- [ ] Confidential mode toggle allows masking current company from public display.
- [ ] Automated tests in `tests/career-builder.test.mjs` pass.

## Blocked by

None - can start immediately.
