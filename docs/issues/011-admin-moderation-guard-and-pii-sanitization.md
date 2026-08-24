## What to build

Remediate Critical (VULN-001) and High (VULN-002) security vulnerabilities by enforcing strict admin authorization on moderation queue data retrieval and sanitizing public member profiles at the server action response boundary.

- In `src/actions/moderate.ts`:
  - Protect `getModerationHouseholds()` with `const session = await getSession(); if (session?.role !== "admin") return [];`
- In `src/actions/search.ts`:
  - Update `getMemberProfile(memberId)` to retrieve the current session via `getSession()` and pass the raw member record through `sanitizeMemberProfile(member, session)`.
  - For unauthenticated users and third-party members, strip unmasked `phone`, `email`, `aadhaarNumber`, `panNumber`, `passportNumber`, `govtIdNumber`, and `fullAddress` from the returned wire payload.
  - Return full unmasked details ONLY when the session user is an Admin, the member themselves, or the Head of Household for that member.

## Acceptance criteria

- [ ] `getModerationHouseholds()` returns an empty list `[]` when called by unauthenticated callers or non-admin users
- [ ] `getMemberProfile()` strips sensitive government IDs and private contact information from server action response payloads for unauthenticated/unauthorized users
- [ ] Profile owners and Administrators can view their own unmasked information
- [ ] Contact reveal workflow via `revealContact` remains the exclusive authorized method for verified members to view other members' contacts

## Blocked by

- docs/issues/010-centralized-privacy-and-shared-utilities.md
