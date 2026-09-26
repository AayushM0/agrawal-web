# Issue 049: Household Dashboard Management & In-Platform Career Communication

## What to build

Implement the dashboard management and in-platform career communication vertical slice for the Global Agarwal Jobs & Careers Network. Enables candidates to manage profile visibility (toggle live/paused), update resumes, and monitor application statuses from their household dashboard. Employers can view incoming candidate applications and initiate in-platform interviews or chats.

Also enables senior executives to activate mentor availability and receive mentorship guidance requests from community youth.

Context pointer: `docs/superpowers/plans/2026-09-26-global-career-network.md` (Task 6).

## Acceptance criteria

- [ ] `/dashboard` includes a "💼 Career & Jobs" tab allowing candidate profile editing, CV updates, and pausing visibility.
- [ ] Candidates can view submitted job applications and status (Submitted, Reviewed, Shortlisted, Declined).
- [ ] Employers can review applicant lists and view candidate profiles directly from the dashboard.
- [ ] In-platform chat and toast notifications route career inquiries via Pusher without exposing private phone numbers or emails.
- [ ] Automated tests in `tests/career-dashboard.test.mjs` pass.

## Blocked by

- `docs/issues/046-core-career-profile-schema-and-builder.md`
- `docs/issues/048-enterprise-job-postings-and-application.md`
