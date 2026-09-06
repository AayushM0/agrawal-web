# Issue 04: Persistent Password Authentication & Login Fallback

Status: resolved

## Parent

[PRD.md](../PRD.md)

## What to build

Standard persistent password authentication for returning members, combined with seamless fallback for unactivated accounts visiting the login page:
- Returning members log in at `/login` using their registered email or phone number plus their password.
- When an unactivated account (where `password_hash == null`) attempts to log in or enters their contact, the system detects this state (`needsActivation: true`) and presents an inline OTP verification and password creation view directly on the login page.
- Once the password is created, the user is authenticated and redirected to `/dashboard`.
- For all subsequent logins, the member authenticates immediately with their password in under 2 seconds.

## Acceptance criteria

- [x] Returning members can authenticate at `/login` using their newly created password.
- [x] Attempting to log in with an unactivated account triggers the activation view rather than a confusing generic error.
- [x] Completing activation on `/login` sets the password and establishes an active session.
- [x] All existing login features (remember contact, password visibility toggle, admin login tab) remain fully operational.

## Blocked by

- [03-progressive-otp-activation-modal.md](./03-progressive-otp-activation-modal.md)
