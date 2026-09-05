# Issue 01: Frictionless Registration to Moderation Queue

Status: ready-for-agent

## Parent

[PRD.md](../PRD.md)

## What to build

A frictionless initial registration experience that allows new community members to begin registration without upfront OTP verification or password creation:
- Step 1 collects Primary Email and Mobile Phone Number (with international dial code) and performs real-time format validation and duplicate checks against existing records.
- Advancing from Step 1 transitions directly into Step 2 (Head of Household details), auto-populating the verified contact fields.
- Steps 2 through 4 allow the applicant to provide family origin, Gotra, photographs, identification details, and additional family members.
- Submitting the application saves the household in the moderation queue with status `pending_review` and an unactivated credential state (`password_hash = null`).
- The user is assigned an official Serial Number (`HHN-...` / `MAFL-...`), issued an unactivated preview session cookie, and redirected to their household dashboard.

## Acceptance criteria

- [ ] Step 1 validates both email and mobile formats with live feedback.
- [ ] Attempting to register with an already-registered email or mobile shows a warning and provides a direct path to log in.
- [ ] Advancing past Step 1 does not dispatch an OTP and does not prompt for a password.
- [ ] Head of Household details in Step 2 receive the validated email and phone from Step 1.
- [ ] Household submission succeeds without providing a password.
- [ ] Database stores the household with `status = 'pending_review'` and `password_hash = null`.
- [ ] User receives an unactivated session (`isActivated: false, hasPassword: false`) and lands on `/dashboard`.
- [ ] All untouched fields and forms (Gotra selection, photos, location selectors, Aadhaar/PAN) remain 100% intact.

## Blocked by

None - can start immediately
