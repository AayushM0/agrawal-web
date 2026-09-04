# Product Requirements Document (PRD): Email + Password Authentication & Account Recovery

## Problem Statement

The platform currently relies on mobile SMS OTP for member registration and authentication. This creates significant operational, financial, regulatory, and user experience blockers:

1. **Third-Party Telecom Gateways & Compliance Fragility:** Relying on global SMS gateways like Twilio results in unexpected automated account freezes and compliance flags due to Indian banking auto-recharge restrictions (RBI 3D-Secure rules).
2. **Indian Telecom Regulatory Hurdles (TRAI DLT):** Sending custom branded SMS in India via domestic gateways (such as MSG91) requires mandatory Distributed Ledger Technology (DLT) entity and template registration, costing ₹5,900 INR and 3–7 business days of regulatory delay.
3. **Ongoing Telecom Costs & Delivery Friction:** SMS delivery suffers from carrier-level filtering, Do-Not-Disturb (DND) routing delays, and recurring per-SMS fees.
4. **Inconvenient Member Experience:** Requiring an SMS code for every routine login is slow and frustrating. Returning members expect standard, instant email-and-password logins like mainstream digital platforms.

---

## Solution

Migrate the platform authentication model from mobile SMS OTP to **Email + Password Authentication**, retaining **Email OTP strictly for initial identity verification and secure password resets**:

- **Instant 1-Second Login:** Returning members log in immediately with their **Email Address + Password** without waiting for mobile carrier codes.
- **Zero-Cost, Fully Controlled Verification via Resend:** Identity verification at registration and password recovery codes are delivered via **Email OTP** using the foundation's verified domain (`verify@maharajaagrasenfoundation.com`).
- **Elimination of Third-Party Telecom Gateways:** Completely removes Twilio, MSG91, Indian DLT regulatory bottlenecks, and recurring SMS carrier charges.
- **OWASP Top 10 Security Hardening:** Comprehensive protection against credential stuffing, brute-force attacks, user enumeration, and cryptographic vulnerabilities.

---

## User Stories

### Registration & Onboarding
1. As a new household head, I want to create a secure password during registration, so that I can conveniently log into my family profile in the future without waiting for SMS codes.
2. As a new household head, I want a live password strength indicator, so that I know my password meets modern security standards.
3. As a new household head, I want a visibility toggle on the password field, so that I can verify what I typed before submitting.
4. As a new household head, I want to receive a 6-digit verification code at my primary email address, so that I can prove ownership of my email before my account is created.
5. As a new household head, I want clear feedback if my email verification code is incorrect or expired, so that I can request a new code without losing the form data I already entered.
6. As a family member claiming my individual profile, I want to set a personal password after verifying my email, so that I can independently manage my own member details.

### Authentication & Login
7. As a registered household head or member, I want to log in using my email address and password, so that I can access my dashboard in under two seconds.
8. As a community member who prefers phone numbers, I want the login form to accept either my registered email or my mobile phone number along with my password, so that I don't get stuck if I forget which email I used.
9. As a platform administrator, I want my dedicated admin login tab to remain intact with its master password protection and brute-force lockout, so that administrative moderation workflows are completely isolated from general member authentication.
10. As a logged-in member, I want my session to remain securely active across browser restarts via hardened HTTP-only cookies, so that I don't have to log in repeatedly on trusted personal devices.
11. As a logged-in member, I want a simple "Log Out" button that clears my authentication session completely across all tabs.

### Password Recovery & Account Management
12. As a member who forgot my password, I want a "Forgot Password?" link on the login page, so that I can quickly recover access without contacting an administrator.
13. As a member requesting a password reset, I want to receive a 6-digit reset code via email valid for 10 minutes, so that I can securely prove account ownership.
14. As a member resetting my password, I want to enter my 6-digit reset code and set a new password on a single clean screen, so that recovery is fast and friction-free.
15. As a security-conscious member, I want all active sessions on other devices to be invalidated when I change or reset my password, so that unauthorized sessions are terminated immediately.
16. As a logged-in member, I want an option in my dashboard settings to change my current password by verifying my old password, so that I can update my credentials periodically.

### Security & Privacy (OWASP)
17. As a community member, I want my password to be cryptographically hashed using industry-standard bcrypt before saving to the database, so that no administrator or database compromise can reveal my actual password.
18. As a platform owner, I want login attempts to be rate-limited (5 failed attempts trigger a 15-minute temporary lockout), so that malicious bots cannot brute-force member passwords.
19. As a privacy-conscious user, I want error messages on login and password reset to be generic (e.g. *"Invalid credentials"*), so that attackers cannot enumerate whether an email belongs to a community member.
20. As a platform owner, I want password reset tokens to be single-use and strictly time-limited to 10 minutes, so that expired codes cannot be replayed.

---

## Implementation Decisions

### 1. Cryptographic Standard
- Adopt **`bcryptjs`** with a cost factor (salt rounds) of **12**.
- Plaintext passwords must never be logged, cached, or persisted in application logs or server action returns.

### 2. Database Schema & State Transitions
- Add `password_hash TEXT` column to the `households` table.
- Add `password_hash TEXT` column to the `members` table (for independently claimed member profiles).
- Add persistent `login_attempts` table to enforce serverless-resilient rate limiting and IP/Identifier lockouts.
- When an account is registered, `password_hash` is populated directly. Existing approved profiles without passwords can set one via the `/forgot-password` flow.

### 3. Server Actions & API Contract
- Replace `loginWithVerifiedContact` with `loginWithPassword({ identifier, password })`:
  - Validates inputs via Zod.
  - Queries `login_attempts` to check for active lockouts.
  - Performs constant-time comparison via `bcrypt.compare`.
  - On failure: logs failed attempt and returns generic error.
  - On success: logs success and issues signed `auth_session` cookie (`httpOnly`, `secure`, `sameSite: 'lax'`, 30-day expiry).
- Create `requestPasswordReset(email)` and `resetPasswordWithOtp({ email, otp, newPassword })`:
  - Dispatches branded email via Resend (`verify@maharajaagrasenfoundation.com`).
  - Verifies signed OTP challenge cookie or DB reset record.
  - Hashes new password and updates record.

### 4. User Interface Architecture
- **Signup Page (`/signup`):** Step 1 updated with Password & Confirm Password inputs, strength validation indicator, and visibility toggle.
- **Login Page (`/login`):** Household tab converted to standard Email/Phone + Password inputs with "Forgot Password?" link.
- **Password Reset Flow (`/forgot-password`):** Dedicated, distraction-free 2-step recovery screen.

---

## Testing Decisions

### What Makes a Good Test
- Tests must evaluate **observable external behavior** (e.g., successful login sets session cookie, 5 wrong passwords lock the account, weak passwords fail validation).
- Tests must **never assert on internal password hashes** or implementation details.

### Modules to Test
1. **Password Validation & Hashing:**
   - Verify complexity rules (reject passwords < 8 chars, without numbers, or without uppercase).
   - Verify `bcrypt` produces unique salts and matches correct passwords while rejecting incorrect ones.
2. **Brute-Force Lockout Defense:**
   - Simulate 5 consecutive failed login attempts; assert the 6th returns HTTP 429 / lockout status.
   - Assert lockout expires after the designated window.
3. **Password Reset Mechanics:**
   - Assert reset code expires after 10 minutes.
   - Assert reset code cannot be used twice.
   - Assert old password no longer authenticates after successful reset.

### Prior Art in Codebase
- Rate limiting pattern implemented in `otp_rate_limits` and `admin_login_attempts` in [`web/src/actions/auth.ts`](file:///d:/Projects/agrawalWeb/web/src/actions/auth.ts) and [`web/src/db/schema.sql`](file:///d:/Projects/agrawalWeb/web/src/db/schema.sql).
- Resend email delivery pattern in [`web/src/actions/otp.ts`](file:///d:/Projects/agrawalWeb/web/src/actions/otp.ts).

---

## Out of Scope

1. **SMS Gateway Re-integration:** No SMS dispatch for OTPs. All verification is strictly email-driven.
2. **Social Logins (OAuth / Google / Apple):** Not part of this migration; deferred to future iterations.
3. **Hardware 2FA / WebAuthn Passkeys:** Modern passwords with email verification are sufficient for community directory requirements.

---

## Further Notes

- Mobile numbers will still be recorded during registration for directory contact info and physical lanyard identity cards, but they will not be used as an authentication delivery channel.
- The migration is 100% backwards-compatible: existing records in the database will have `NULL` password hashes until set, and the admin moderation interface remains untouched.
