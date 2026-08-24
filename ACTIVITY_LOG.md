# 📜 Global Agrawal Directory — System Activity & Change Log

> **Note**: This document is updated in real time whenever changes, bug fixes, enhancements, or architectural updates occur in the project.

---

## 📌 Project Overview
- **Repository**: `https://github.com/AayushM0/agrawal-web.git`
- **Primary Tech Stack**: Next.js 15 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS v3.4, PostgreSQL / Supabase, PostGIS, Resend Email, Twilio WhatsApp Sandbox.
- **Production Host**: Vercel

---

## 🕒 Chronological Activity Log

### [2026-08-24 23:05:00] — Member-to-Member Messaging & Trust & Safety System (Issues 013, 014, 015)
- **Status**: ✅ Implemented & Verified (47/47 Tests Passing, Clean Next.js 15 Production Build)
- **Changes**:
  - **Database Schema & Data Layer (Issue 013)**: Added `conversations`, `messages`, and `message_reports` tables to `src/db/schema.sql` and data access methods in `src/lib/db.ts` including 90-day pruning routine for DPDP compliance.
  - **Server Actions & Anti-Fraud Engine (Issue 014)**: Created `src/actions/chat.ts` with `sendMessage`, `getConversations`, `getMessages`, `respondToRequest`, and `reportConversation`. Built in-stream heuristics scanner in `src/lib/anti-fraud.ts` flagging unsolicited UPI IDs, bank details, and financial scam triggers. Added velocity bounds (max 10 new chats/day).
  - **Responsive Messaging UI & Moderation (Issue 015)**: Created `/dashboard/messages` with split-view layout, active SWR polling, Trust & Safety headers, in-stream anti-fraud alerts, and 1-click reporting modal with cryptographic thread snapshots. Added "💬 Message Member" CTA button on directory profiles and Messages link in `TopNavBar`. Added Message Reports review tab in Admin Moderation Portal.

---
- **Status**: ✅ Implemented & Tested (`ca8bfd6`, `ca2239a`, `be62be7`)
- **Changes**:
  - **Centralized Privacy Module (Issue 010)**: Created `src/lib/privacy.ts` consolidating `maskPhone`, `maskEmail`, `maskGovtId`, `maskContact`, `calculateAge`, and `sanitizeMemberProfile`. Removed duplicated utility functions across `signup`, `directory`, `directory/[id]`, and `dashboard` pages.
  - **Admin Moderation Data Guard (Issue 011 / VULN-001)**: Enforced strict admin session verification on `getModerationHouseholds()` in `src/actions/moderate.ts`.
  - **Server-Side PII Leakage Remediation (Issue 011 / VULN-002)**: Wire-level sanitization on `getMemberProfile()` in `src/actions/search.ts` stripping sensitive government IDs and private contacts for non-owner viewers.
  - **PDF Pass IDOR Ownership Verification (Issue 012 / VULN-003)**: Added authorization checks to `/api/pass/pdf` allowing only profile owners, household heads, and admins to generate ID card PDFs.
  - **Edge Secret Hardening (Issue 012 / VULN-004)**: Removed static fallback secret in `middleware.ts`, failing closed if `AUTH_SECRET` is unset.
  - **Pincode Geocoding Validation (Issue 012 / VULN-005)**: Added 2-letter ISO regex validation on `country` query parameter in `/api/location/pincode`.

---
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
