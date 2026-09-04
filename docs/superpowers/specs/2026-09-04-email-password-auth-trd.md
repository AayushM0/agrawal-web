# Technical Requirements Document (TRD): Email + Password Authentication & Recovery Engine

## 1. System Architecture Overview

The system transitions from an ephemeral OTP authentication model to a persistent credential model utilizing **bcrypt password hashing** and **serverless-resilient rate limiting**, while delegating identity verification and password recovery to **Resend transactional email**.

```
[ Client Browser ]
        │
        ├── (1) POST /actions/register (email, password, family data)
        ├── (2) POST /actions/auth (identifier, password)
        └── (3) POST /actions/otp (requestPasswordReset, resetPasswordWithOtp)
        │
        ▼
[ Next.js Server Actions (Edge / Node.js Runtime) ]
        │
        ├── [ OWASP Rate Limiter & Lockout Guard ] ◄──► PostgreSQL (login_attempts table)
        ├── [ bcryptjs Hash / Compare Engine (Cost 12) ]
        ├── [ Resend Transactional Email API ] ───────► Sends 6-digit OTP to User Inbox
        └── [ Session Cookie Issuer (HMAC SHA-256) ]
        │
        ▼
[ Supabase PostgreSQL Cluster ]
        ├── households (password_hash TEXT)
        ├── members (password_hash TEXT)
        ├── login_attempts (brute-force prevention)
        └── otp_rate_limits (abuse throttling)
```

---

## 2. Database Schema & Data Models

### 2.1 Schema Additions (PostgreSQL / Supabase DDL)

```sql
-- 1. Extend households table for password authentication
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Extend members table for individual claimed accounts
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Create persistent login attempts table for OWASP brute-force defense
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rapid lockout lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup 
ON login_attempts (identifier, ip_address, created_at DESC);

-- Enable RLS (Service role access only)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny direct public access to login attempts"
    ON login_attempts FOR ALL
    USING (false);
```

### 2.2 TypeScript Data Contracts

```typescript
// Extended Household Entity
export interface Household {
  id: string;
  householdCode: string;
  serialNo: number;
  headName: string;
  verifiedContact: string;
  passwordHash?: string | null;
  status: "pending_review" | "live" | "rejected";
  // ... existing fields
}

// Login Payload Contract
export interface LoginWithPasswordPayload {
  identifier: string; // Email or Normalized Phone
  password: string;
}

// Password Reset Payload Contracts
export interface RequestPasswordResetPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}
```

---

## 3. Cryptographic & Security Engineering (OWASP Top 10)

### 3.1 Password Hashing Specification
* **Library:** `bcryptjs` (Pure JS implementation to ensure 100% compatibility across Windows development, Linux CI/CD, and Vercel edge/serverless runtimes without node-gyp native compilation risks).
* **Cost Factor (Salt Rounds):** `12`
  * Provides approximately ~250–350ms computation time on standard serverless hardware.
  * Sufficiently slow to thwart offline GPU brute-force cracking while maintaining low latency for legitimate user logins.
* **Storage Format:** Standard Modular Crypt Format: `$2a$12$[22-char-salt][31-char-hash]`.

### 3.2 Brute-Force & Lockout Algorithm
* **Threshold:** 5 consecutive failed attempts within a 15-minute rolling window.
* **Scope:** Tracked jointly on `(identifier, ip_address)`.
* **Lockout Duration:** 15 minutes from the 5th failed attempt.
* **Reset Condition:** Any successful authentication immediately flushes the failed attempt counter for that `(identifier, ip_address)`.

```typescript
export async function checkLoginLockout(
  identifier: string, 
  ip: string
): Promise<{ locked: boolean; remainingSeconds?: number }> {
  const windowMinutes = 15;
  const maxAttempts = 5;

  const result = await db.query(
    `SELECT COUNT(*) as failed_count, MAX(created_at) as last_attempt
     FROM login_attempts
     WHERE (identifier = $1 OR ip_address = $2)
       AND success = false
       AND created_at > NOW() - INTERVAL '15 minutes'`,
    [identifier.toLowerCase().trim(), ip]
  );

  const count = parseInt(result.rows[0].failed_count, 10);
  if (count >= maxAttempts) {
    const lastAttemptTime = new Date(result.rows[0].last_attempt).getTime();
    const unlockTime = lastAttemptTime + 15 * 60 * 1000;
    const remainingSeconds = Math.max(0, Math.ceil((unlockTime - Date.now()) / 1000));
    if (remainingSeconds > 0) {
      return { locked: true, remainingSeconds };
    }
  }
  return { locked: false };
}
```

### 3.3 Password Policy & Zod Validation
* **Minimum Length:** 8 characters.
* **Maximum Length:** 72 characters (preventing DoS attacks against bcrypt).
* **Entropy Constraints:** At least one lowercase letter, one uppercase letter, and one digit.

```typescript
import { z } from "zod";

export const PasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters long.")
  .max(72, "Password cannot exceed 72 characters.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");
```

---

## 4. Server Action Specifications

### 4.1 `loginWithPassword(payload: LoginWithPasswordPayload)`
1. **Input Validation:** Validate `identifier` and `password` with Zod.
2. **IP Extraction:** Resolve client IP from `headers().get('x-forwarded-for')` or `x-real-ip`.
3. **Lockout Check:** Call `checkLoginLockout(identifier, ip)`. If locked, return `{ success: false, error: "Too many failed attempts. Try again in X minutes." }`.
4. **Account Lookup:**
   - Search `members` where `email = $1 OR phone = $1`.
   - If not found, search `households` where `verified_contact = $1`.
5. **Verification:**
   - If account not found OR `password_hash` is null: Perform a dummy bcrypt comparison (avoids timing attacks) and record failure in `login_attempts`. Return generic error: *"Invalid email or password"*.
   - If account found: execute `bcrypt.compare(password, account.password_hash)`.
   - On mismatch: record failure in `login_attempts`. Return *"Invalid email or password"*.
6. **Session Issuance:**
   - Record success in `login_attempts`.
   - Generate HMAC SHA-256 session token signed with `process.env.AUTH_SECRET`.
   - Set cookie `auth_session` (`httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `maxAge: 30 * 86400`).
   - Return `{ success: true, redirectUrl: "/dashboard" }`.

### 4.2 `requestPasswordReset(payload: RequestPasswordResetPayload)`
1. **Rate Limit:** Enforce max 3 reset requests per email per 15 minutes.
2. **Account Query:** Check if email exists in `households` or `members`.
3. **Token Generation:**
   - Generate 6-digit cryptographically secure random token (`crypto.randomInt(100000, 999999)`).
   - Sign HMAC challenge token with 10-minute expiry timestamp.
   - Store in encrypted/signed HTTP-only cookie `pwd_reset_challenge`.
4. **Email Dispatch:**
   - Send branded HTML email via Resend API from `Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>`.
5. **Response:** Always return `{ success: true, message: "If an account exists, a 6-digit reset code has been sent." }` (OWASP anti-enumeration).

### 4.3 `resetPasswordWithOtp(payload: ResetPasswordPayload)`
1. **Challenge Verification:** Read `pwd_reset_challenge` cookie and verify HMAC signature and expiration timestamp.
2. **OTP Match:** Verify entered 6-digit code matches challenge code.
3. **Password Validation:** Enforce `PasswordSchema`.
4. **Hash & Update:**
   - Compute `newHash = await bcrypt.hash(newPassword, 12)`.
   - Update `password_hash = newHash` for the matching email in `households` and `members`.
5. **Cleanup:** Delete `pwd_reset_challenge` cookie.
6. **Auto-Login:** Issue new `auth_session` cookie and return success.

---

## 5. User Interface Specifications

### 5.1 Signup Step 1 (`/signup`)
* Add password input with dynamic strength meter:
  * Strength bar: Weak (Red) ➔ Fair (Orange) ➔ Strong (Emerald Green).
  * Requirements checklist: 8+ chars, uppercase, lowercase, number.
* "Send Email Verification Code" button dispatches Resend OTP to primary email.
* Form persists entered password in state while user enters 6-digit email OTP.

### 5.2 Login Page (`/login`)
* Default tab: **"Member Login"**
  * Input 1: Email Address or Mobile Number.
  * Input 2: Password (with eye toggle icon).
  * Row: Remember me checkbox + "Forgot Password?" hyperlink.
  * Primary Button: "Log In".
* Tab 2: **"Admin Login"** (Preserves existing moderator master password flow).

### 5.3 Password Recovery Wizard (`/forgot-password`)
* Clean two-step card layout:
  * **Step 1:** Enter email address ➔ "Send Reset Code".
  * **Step 2:** Enter 6-digit code received via email + enter & confirm new password ➔ "Update Password & Log In".

---

## 6. Verification & Test Plan

| Test Case ID | Test Description | Expected Result |
| :--- | :--- | :--- |
| **TC-AUTH-01** | Register new household with valid password | Password stored as `$2a$12$...` in database; never in plaintext. |
| **TC-AUTH-02** | Attempt signup with weak password (`test12`) | Zod validation rejects with descriptive error. |
| **TC-AUTH-03** | Login with valid email and password | Authenticates in < 500ms; redirects to `/dashboard`. |
| **TC-AUTH-04** | Login with incorrect password | Returns generic *"Invalid email or password"*; attempt logged. |
| **TC-AUTH-05** | 5 consecutive failed logins from same IP | 6th attempt blocked with 15-minute lockout notice. |
| **TC-AUTH-06** | Request password reset for existing email | Resend dispatches 6-digit OTP to inbox. |
| **TC-AUTH-07** | Request password reset for non-existent email | Returns identical success message (anti-enumeration). |
| **TC-AUTH-08** | Reset password with valid code & new password | Password updated in DB; old password fails; new password logs in. |
