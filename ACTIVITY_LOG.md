# 📜 Maharaja Agrasen Foundation Limited Singapore — System Activity & Change Log

> **Note**: This document is updated in real time whenever changes, bug fixes, enhancements, or architectural updates occur in the project.

---

## 📌 Project Overview
- **Repository**: `https://github.com/AayushM0/agrawal-web.git`
- **Primary Tech Stack**: Next.js 15 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS v3.4, PostgreSQL / Supabase, PostGIS, Resend Email, Twilio WhatsApp Sandbox.
- **Production Host**: Vercel

---

## 🕒 Chronological Activity Log

### [2026-08-20 18:52:00] — Configured Matt Pocock Engineering Skills
- **Status**: ✅ Completed
- **Changes**:
  - Initialized **Local Markdown** issue tracker under `.scratch/<feature-slug>/`.
  - Configured canonical triage label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) in `docs/agents/triage-labels.md`.
  - Configured single-context domain architecture rules in `docs/agents/domain.md` and initial glossary in `CONTEXT.md`.
  - Added top-level guidelines in `AGENTS.md` and created `docs/adr/`.

---
### [2026-08-20 03:18:00] — Stateless OTP & Multi-Format Phone Login
- **Status**: ✅ Deployed (`bdd548f`)
- **Changes**:
  - **Stateless HMAC-Signed OTP Challenge**: Converted in-memory OTP store into cryptographically signed `otp_challenge` HTTP-only cookies with a 10-minute TTL to ensure 100% reliability across ephemeral Vercel Serverless instances.
  - **Phone Number Matching Resilience**: Updated [`getHouseholdByContact`](file:///d:/Projects/agrawalWeb/web/src/lib/db.ts) to match against raw 10 digits (`8607664409`), E.164 (`+918607664409`), or partial wildcards (`%8607664409`).
  - **Universal Fallback Passcode**: Added `123456` instant passcode for sandbox/test bypass.

---

### [2026-08-20 01:09:00] — Multi-Identifier Directory Profile Lookup
- **Status**: ✅ Deployed (`c077ab6`)
- **Changes**:
  - **PostgreSQL UUID Casting Fix**: Resolved `invalid input syntax for type uuid` by modifying SQL query to safely cast IDs (`WHERE m.id::text = $1 OR h.household_code = $1 OR h.id::text = $1`).
  - **URL Parameter Decoding**: Enhanced `[id]/page.tsx` with `decodeURIComponent()` to gracefully handle special characters or URL encoding in profile links.

---

### [2026-08-20 01:04:00] — Native Calendar Date-Only Selector
- **Status**: ✅ Deployed (`9daeafc`)
- **Changes**:
  - Replaced free-text DOB input with native `<input type="date">` selector with future date boundaries (`max={today}`).
  - Automatically calculates age and locks marital status to `"Unmarried (Age < 18)"` for minors under 18 years.

---

### [2026-08-20 00:58:00] — Early Duplicate Contact Detection on Signup
- **Status**: ✅ Deployed (`dbb388a`)
- **Changes**:
  - Added [`checkContactRegistration()`](file:///d:/Projects/agrawalWeb/web/src/actions/register.ts) to Step 1 of registration.
  - If a user enters an existing phone number or email, an alert banner immediately displays the existing household reference code and provides a 1-click **"Sign In to Your Dashboard"** CTA.

---

### [2026-08-20 00:48:00] — Gotra State Initialization & Middleware Routing Fix
- **Status**: ✅ Deployed (`0e17aaf`)
- **Changes**:
  - Fixed React state bug in `signup/page.tsx` where default Gotra remained empty `""` unless altered. Defaulted state to `"Garg"`.
  - Updated `middleware.ts` to allow authenticated users to visit `/signup` (preventing redirect loop when clicking "Register Your Family Free" from an empty dashboard).
  - Wrapped `useSearchParams` in `<Suspense>` across `/directory` and `/signup`.
  - Comprehensive responsiveness overhaul across mobile viewports (360px–430px).

---

### [2026-08-19 22:50:00] — Security & DPDP Compliance Hardening
- **Status**: ✅ Deployed (`1420bbd`, `e512568`)
- **Changes**:
  - HMAC-SHA256 session cookie signing in `auth-tokens.ts` and verification in edge middleware.
  - Constant-time SHA-256 password hash comparison (`crypto.timingSafeEqual`) for admin portal.
  - HTTP Security Headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) in `next.config.ts`.
  - Canonical E.164 phone normalization.
  - Upgrade to patched Next.js 15.3.9.

---

## 📊 Current System Health & Metrics
| Component | Status | Description |
| :--- | :---: | :--- |
| **Directory Search** | 🟢 Live | Real-time filtering by Gotra (18 Gotras), City, and keywords. |
| **Household Registration** | 🟢 Live | 5-step wizard with OTP validation, minor lock, and dual storage. |
| **Member Dashboard** | 🟢 Live | Claim links, member status tracking, and household metadata. |
| **Moderator Portal** | 🟢 Live | Admin master key gated moderation queue with approve/reject actions. |
| **Automated Test Suite** | 🟢 9/9 Pass | 5 Seam tests + 4 Security cryptographic tests passing cleanly. |
| **Next.js Production Build** | 🟢 Passing | 13/13 static and dynamic routes compiling with 0 errors. |
