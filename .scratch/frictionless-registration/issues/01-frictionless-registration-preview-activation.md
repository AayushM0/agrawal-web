# Issue 01: Frictionless Registration, Preview Dashboard & Progressive Activation

Status: ready-for-agent
Type: task
PRD: [PRD.md](../PRD.md)

## Summary
Implement frictionless 2-step onboarding:
1. Registration Step 1 collects Email and Mobile Phone Number only (no upfront OTP or password).
2. Registration submission creates `pending_review` household without a password and establishes an unactivated session.
3. User lands on `/dashboard` in read-only preview mode.
4. Gated actions (editing profiles, adding members, viewing directory) trigger an OTP verification + password creation modal.
5. Returning members log in with their newly set password at `/login`.

## Acceptance Criteria
- [ ] Registration Step 1 validates both email and mobile formats and checks for existing registration without dispatching OTP or requiring passwords.
- [ ] User advances directly from Step 1 to Step 2.
- [ ] `registerHousehold` accepts optional password and stores `password_hash = null` when omitted.
- [ ] User receives an unactivated preview session upon registration and can view `/dashboard` in read-only mode.
- [ ] Unactivated sessions are prevented from editing/adding members and accessing `/directory`.
- [ ] Gated actions on dashboard trigger the `ActivationModal` (OTP + password creation).
- [ ] `activateAccountWithOtp` verifies OTP, hashes password with bcrypt, and upgrades the session.
- [ ] Member can log in at `/login` using the new password.
- [ ] All untouched fields and forms (Steps 2–4, gotras, photos, location selectors, Aadhaar/PAN) remain 100% intact.
