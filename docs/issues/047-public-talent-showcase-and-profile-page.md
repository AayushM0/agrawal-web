# Issue 047: Public Talent Showcase & Profile Page

## What to build

Implement the public talent directory and professional candidate showcase vertical slice for the Global Agarwal Jobs & Careers Network. Enables community recruiters, business owners, and members to search, filter, and view verified Agarwal professionals across all 18 Gotras and industries with zero raw contact exposure.

The talent directory displays candidate cards with verified community pedigree, headline, experience, and skill tags. The individual profile page renders a rich professional resume timeline with verified family ties and an in-platform connection request CTA that preserves privacy (strictly enforcing ADR-0001 and ADR-0004).

Context pointer: `docs/superpowers/plans/2026-09-26-global-career-network.md` (Task 3).

## Acceptance criteria

- [ ] `/careers` renders a responsive talent directory with live search, industry domain pills, Gotra quick-filter, and seniority filters.
- [ ] Returned candidate models are strictly sanitized: personal phone numbers and unmasked emails are never rendered in public HTML or JSON payloads.
- [ ] If a candidate has enabled Confidential Mode, their current employer is masked as "Confidential Enterprise".
- [ ] Candidate profile page `/careers/[id]` displays verified community badge (#SerialNo), native place, gotra, experience timeline, skills, and resume download link.
- [ ] Candidate profile provides an in-platform "Request Connection / Message" action.
- [ ] Automated tests in `tests/career-pages.test.mjs` pass.

## Blocked by

- `docs/issues/046-core-career-profile-schema-and-builder.md`
