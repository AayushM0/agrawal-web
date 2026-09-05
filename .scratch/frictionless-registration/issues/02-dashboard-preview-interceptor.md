# Issue 02: Dashboard Read-Only Preview & Gated Action Interceptor

Status: resolved

## Parent

[PRD.md](../PRD.md)

## What to build

A read-only dashboard preview experience for newly registered households, combined with an authorization interceptor on modifying actions:
- When a user with an unactivated session visits `/dashboard`, recognize `isActivated === false`.
- Render an informational banner informing the user that their registration is under moderator review, their account is in preview mode, and they can activate by setting a password.
- Display all submitted family details, member cards, and official serial numbers in read-only mode.
- Intercept modifying actions (Edit Profile, Edit Family Origin, Add Member, Invite to Claim) on the client side: if unactivated, prevent opening the editing forms and prepare to trigger activation.
- Protect server-side mutation actions (`saveMemberProfile`, `saveHouseholdInfo`, `addHouseholdMember`) by rejecting requests from unactivated sessions.
- Enforce directory route protection: unactivated sessions attempting to access `/directory` are redirected to `/dashboard` or prompted to activate.

## Acceptance criteria

- [x] Unactivated session displays a prominent gold review banner on `/dashboard`.
- [x] User can view their household card, members, and serial number in preview mode.
- [x] Clicking "Edit Profile" on an unactivated account triggers an activation prompt rather than opening the edit form directly.
- [x] Clicking "Edit Family Origin" or "Add Member" on an unactivated account triggers an activation prompt.
- [x] Server actions for profile modification reject unactivated sessions with an explicit error.
- [x] Directory access is restricted to fully activated members.

## Blocked by

- [01-frictionless-registration-moderation.md](./01-frictionless-registration-moderation.md)
