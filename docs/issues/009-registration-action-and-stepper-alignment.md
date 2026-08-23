## What to build

Align the Registration Server Action (`registerHousehold`), Review Step 4, Stepper navigation, and test suite to support the restructured 4-step wizard with optional additional members and smart prefilling.

- Update `WizardProgressBar.tsx` step labels:
  1. Contact Verification
  2. Head & Family Details
  3. Additional Members (Optional)
  4. Review & Submission
- Ensure `registerHousehold` in `src/actions/register.ts` accepts households with only the Head member without erroring.
- Update Review summary in Step 4 to clearly demarcate the Head of Household profile vs additional family members.
- Update `tests/issues-overhaul.test.mjs` to verify new step definitions and optional member flow.

## Acceptance criteria

- [ ] `WizardProgressBar.tsx` displays updated step titles
- [ ] Step 4 Review summary displays complete Head card + optional family member list with masked contacts
- [ ] `registerHousehold` server action validates and inserts single-member (Head-only) households and multi-member households seamlessly
- [ ] `tests/issues-overhaul.test.mjs` and `tests/seams.test.mjs` run 100% green
- [ ] Production build (`npm run build`) succeeds with zero errors

## Blocked by

- docs/issues/007-consolidate-head-and-family-details-step-2.md
- docs/issues/008-optional-additional-members-with-prefilling-step-3.md
