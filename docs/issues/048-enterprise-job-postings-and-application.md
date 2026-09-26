# Issue 048: Enterprise Job Postings & 1-Click Application

## What to build

Implement the enterprise job posting and candidate application vertical slice for the Global Agarwal Jobs & Careers Network. Enables verified enterprises from the Global Business Network (Pillar 2) to post job vacancies and internships with verified enterprise badging, and allows verified community members to apply in 1 click using their existing career profile.

The system connects employers and community candidates through high-trust community references, eliminating third-party recruiter spam and resume fraud.

Context pointer: `docs/superpowers/plans/2026-09-26-global-career-network.md` (Task 5).

## Acceptance criteria

- [ ] `job_postings` and `job_applications` tables exist in PostgreSQL schema with RLS and foreign keys.
- [ ] Verified businesses can post job openings at `/careers/jobs/create` specifying title, domain, workplace mode (Remote/Hybrid/Onsite), location, and requirements.
- [ ] Job detail page at `/careers/jobs/[id]` displays role details, company badge, and a 1-click "Apply with Agarwal Profile" button for authenticated members.
- [ ] Candidate application records candidate ID and optional cover note without duplicate applications for the same role.
- [ ] Public job listings appear in the "Job Openings" tab on `/careers`.
- [ ] Automated tests in `tests/career-jobs.test.mjs` pass.

## Blocked by

- `docs/issues/046-core-career-profile-schema-and-builder.md`
