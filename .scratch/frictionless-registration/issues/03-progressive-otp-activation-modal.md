# Issue 03: Progressive OTP Verification & Password Activation Modal

Status: ready-for-agent

## Parent

[PRD.md](../PRD.md)

## What to build

An inline account activation workflow on the dashboard that converts unactivated preview sessions into fully authenticated accounts:
- Triggered whenever an unactivated user clicks "Verify & Set Password" on the dashboard banner, or when any gated action interceptor fires.
- Presents an inline `ActivationModal` with a two-step flow:
  - Step 1: Dispatches a 6-digit OTP to the applicant's registered contact channel (email/mobile) via the existing secure OTP engine.
  - Step 2: Collects the 6-digit OTP code, New Password, and Confirm Password with live password complexity indicators (min 8 chars, uppercase, lowercase, number).
- Implements the `activateAccountWithOtp` server action:
  - Verifies the OTP challenge.
  - Validates password complexity.
  - Generates a bcrypt hash (cost factor 12) and persists it to the database for the household and head member.
  - Upgrades the user's session cookie to `isActivated: true, hasPassword: true`.
- Upon successful activation, dismisses the modal, updates the dashboard state in-place, and automatically resumes the intercepted action (e.g. opens the requested "Edit Profile" modal).

## Acceptance criteria

- [ ] Activation modal opens cleanly upon clicking any gated action or the activation banner.
- [ ] OTP dispatch succeeds with rate limiting and security checks intact.
- [ ] Passwords must satisfy complexity requirements (8+ chars, upper, lower, number).
- [ ] Verifying the correct OTP updates `password_hash` in the database with a 12-round bcrypt hash.
- [ ] Session cookie is upgraded to `isActivated: true, hasPassword: true`.
- [ ] The pending action that originally triggered the modal executes automatically upon activation.

## Blocked by

- [02-dashboard-preview-interceptor.md](./02-dashboard-preview-interceptor.md)
