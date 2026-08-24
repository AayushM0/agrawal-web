# 🚀 Global Agrawal Directory — Developer Onboarding Guide

Welcome to the **Global Agrawal Directory** (`agrawal-web`) codebase! This document provides everything you need to get up to speed: system architecture, data models, key file maps, 5-minute local setup, developer workflows, debugging guides, and contribution guidelines.

---

## 1. 🏗️ Architecture & System Overview

### System Diagram

```
[ Web Browser (Desktop / Mobile) ]
                │
                ▼
      [ Next.js 15 App Router (Vercel Serverless) ]
      ├── Edge Middleware (`src/middleware.ts` — HMAC Session Guard)
      │
      ├── Public / Authenticated UI Pages (`src/app/`)
      │   ├── `/` (Landing & Hero)
      │   ├── `/directory` & `/directory/[id]` (Search & Member Profiles)
      │   ├── `/signup` (4-Step Household Registration Wizard)
      │   ├── `/login` (Stateless OTP Phone/Email Auth)
      │   ├── `/dashboard` & `/dashboard/pass` (Household Dashboard & Passes)
      │   ├── `/claim` (Member Auto-Claim & Verification)
      │   └── `/admin/moderation` (Moderation Queue)
      │
      ├── Server Actions (`src/actions/`)
      │   ├── `register.ts` (Household + Member Validation & Creation)
      │   ├── `auth.ts` (HMAC Session Creation & Invalidation)
      │   ├── `otp.ts` (Stateless HMAC-Signed OTP Verification)
      │   ├── `search.ts` (Sanitized Directory Search & Member Profile)
      │   ├── `reveal.ts` (Rate-Limited Contact Reveal for Verified Members)
      │   ├── `claim.ts` (Individual Member Claim & Verification)
      │   ├── `moderate.ts` (Admin Approval/Rejection & Multi-Attachment Email)
      │   └── `profile.ts` / `dashboard.ts` (Profile & Origin Updates)
      │
      ├── API Route Handlers (`src/app/api/`)
      │   ├── `/api/pass/pdf` (Streaming ID Card PDF Generation via React-PDF)
      │   └── `/api/location/pincode` (India Post & Zippopotam Geocoding)
      │
      └── Core Libraries (`src/lib/`)
          ├── `db.ts` (PostgreSQL Connection Pool & Parameterized Queries)
          ├── `privacy.ts` (Pure Masking, Age Calculation & PII Sanitization)
          ├── `auth-tokens.ts` (HMAC-SHA256 Cookie Signing & Expiry)
          └── `phone.ts` (E.164 Canonical Phone Normalization)
                │
                ▼
   [ PostgreSQL + PostGIS (Supabase / AWS RDS) ]
   ├── `households` (Households, Gotra, Native Place, Address, Gov IDs, Status)
   └── `members` (Individuals, DOB, Relations, Coordinates, Visibility)

External Services:
   ├── [Resend API] — Welcome emails with generated PDF pass attachments
   ├── [Twilio SMS / Verify API] — Mobile OTP passcodes & approval notices
   └── [India Post / Zippopotam API] — Real-time postal PIN code geocoding
```

---

### Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 15.3.9 (App Router) | Server Components, Server Actions, Edge Middleware |
| **UI Library** | React 19 + TypeScript 5.7 | Modern component architecture, full strict type safety |
| **Styling** | Tailwind CSS v3.4 | Utility-first styling with custom Maharaja brand palette |
| **Database** | PostgreSQL 16+ with PostGIS | Relational data, full-text `tsvector` search, spatial queries |
| **Database Driver** | `pg` (node-postgres) | Connection pooling, parameterized queries, transactions |
| **PDF Generation** | `@react-pdf/renderer` | Real-time vector rendering of printable laminated passes |
| **Email Service** | Resend API | Transactional OTP and onboarding emails with attachments |
| **SMS Gateway** | Twilio SMS & Verify | Mobile verification and approval dispatch |

---

## 2. 🗺️ Key File Map

### Priority Files to Read First

| Priority | Path | What It Does | Why It Matters |
| :---: | :--- | :--- | :--- |
| **1** | [`src/db/schema.sql`](file:///d:/Projects/agrawalWeb/web/src/db/schema.sql) | DDL for `households` and `members` tables, indexes, and triggers | Single source of truth for the entire database architecture. |
| **2** | [`src/lib/privacy.ts`](file:///d:/Projects/agrawalWeb/web/src/lib/privacy.ts) | Pure functions for masking, dynamic age, and server profile sanitation | Central security utility preventing PII leakage across views. |
| **3** | [`src/lib/db.ts`](file:///d:/Projects/agrawalWeb/web/src/lib/db.ts) | PostgreSQL connection pool and data access methods | All database read/write queries and transactions live here. |
| **4** | [`src/actions/register.ts`](file:///d:/Projects/agrawalWeb/web/src/actions/register.ts) | Household registration validation, ID branching, and creation | Core onboarding workflow with country-specific checks. |
| **5** | [`src/actions/moderate.ts`](file:///d:/Projects/agrawalWeb/web/src/actions/moderate.ts) | Moderation queue actions and multi-attachment email dispatch | Handles admin approval, rejection, and member notification. |
| **6** | [`src/actions/otp.ts`](file:///d:/Projects/agrawalWeb/web/src/actions/otp.ts) | Stateless HMAC OTP challenge issuance and verification | Zero-database authentication protocol for passwordless login. |
| **7** | [`src/middleware.ts`](file:///d:/Projects/agrawalWeb/web/src/middleware.ts) | Edge runtime routing protection and session verification | Enforces RBAC and guards admin/dashboard routes. |
| **8** | [`src/data/gotras.ts`](file:///d:/Projects/agrawalWeb/web/src/data/gotras.ts) | Canonical list of all 18 established Agrawal Gotras | Used for validation and filtering throughout the application. |

---

### High-Risk Files (Coordinate Before Modifying)

| Path | Risk | Precautions |
| :--- | :--- | :--- |
| `src/middleware.ts` | Runs on every edge request | Always ensure fail-closed behavior; verify session TTL. |
| `src/lib/auth-tokens.ts` | Session cookie signing & verification | Uses constant-time `crypto.timingSafeEqual`; never use loose string comparisons. |
| `src/actions/register.ts` | 5-step validation and database insertion | Must maintain contact uniqueness across households and members. |
| `src/app/api/pass/pdf/route.ts` | Official ID card PDF rendering | Must maintain IDOR ownership checks preventing unauthorized downloads. |

---

## 3. ⚡ Local Development Setup (Under 5 Minutes)

### Prerequisites

- **Node.js**: `v20.x` or `v22.x`
- **Package Manager**: `npm` (included with Node)
- **PostgreSQL**: PostgreSQL 15+ (with PostGIS extension) or Supabase instance

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AayushM0/agrawal-web.git
   cd agrawal-web/web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Configure the following critical variables:
   ```env
   # PostgreSQL Connection (Supabase / Local Postgres)
   DATABASE_URL="postgresql://postgres:password@localhost:5432/agrawal_directory?sslmode=disable"

   # Cryptographic Authentication Secret (Required - 32+ characters)
   AUTH_SECRET="your_secure_32_character_random_hex_secret_here"

   # Admin Master Password for Moderation Portal
   ADMIN_MASTER_PASSWORD="YourSecureAdminPasswordHere"

   # Third-Party Service Keys (Optional for local development)
   RESEND_API_KEY="re_..."
   TWILIO_ACCOUNT_SID="AC..."
   TWILIO_AUTH_TOKEN="..."
   TWILIO_PHONE_NUMBER="+1..."
   ```

4. **Initialize Database Schema**:
   Run the schema SQL against your PostgreSQL database:
   ```bash
   psql -d agrawal_directory -f src/db/schema.sql
   ```

5. **Run the Automated Test Suite**:
   ```bash
   npm test
   # Or run all test files:
   node --test tests/*.test.mjs
   ```

6. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. 🛠️ Common Developer Runbooks

### Runbook 1: Running & Adding Tests

- **Run all tests**:
  ```bash
  node --test tests/*.test.mjs
  ```
- **Run a specific test suite**:
  ```bash
  node tests/security-remediation.test.mjs
  ```
- **Adding a new test**:
  Create a new `tests/<feature>.test.mjs` file using standard Node.js native test runner (`node:test` and `node:assert/strict`).

---

### Runbook 2: Adding a New Server Action

1. Create or open the relevant file in `src/actions/`.
2. Ensure `'use server';` is at the top of the file.
3. Use `getSession()` from `@/actions/auth` for authorization.
4. Always sanitize user inputs and mask PII using `@/lib/privacy`.
5. Use parameterized queries via `src/lib/db.ts` (never string concatenation).

---

### Runbook 3: Building for Production

```bash
npm run build
```
Verify that all 16 static and dynamic routes compile cleanly with zero TypeScript errors.

---

## 5. 🔍 Debugging & Troubleshooting Guide

| Symptom / Error | Cause | Fix |
| :--- | :--- | :--- |
| `Missing AUTH_SECRET environment variable` | `AUTH_SECRET` is not defined in `.env.local` | Add a random 32-character string to `AUTH_SECRET` in `.env.local`. |
| `Database not connected` / Pool timeout | `DATABASE_URL` is unreachable or Postgres is down | Check database connectivity and credentials in `.env.local`. |
| `Invalid input syntax for type uuid` | Query parameter passed directly to UUID column | Ensure ID queries cast IDs safely (`id::text = $1 OR household_code = $1`). |
| OTP verification fails in development | Gateway credentials unconfigured | In development, check server logs for `[OTP DEV FALLBACK]` or use test passcode `123456`. |
| PDF download returns `403 Forbidden` | IDOR check blocked cross-household download | Ensure your session belongs to the same household as the requested member. |

---

## 6. 🤝 Contribution & Security Standards

- **Strict TDD**: Always write a failing test before introducing new behavior or bugfixes.
- **OWASP Compliance**: Parameterize all SQL queries, sanitize public server action responses, and never expose raw government IDs or phone numbers to unauthenticated viewers.
- **Ponytail Discipline**: Prefer standard library and native functions over heavy dependencies; avoid duplicate helper definitions across pages.
- **Activity Log**: Update `ACTIVITY_LOG.md` when delivering major architectural changes, security fixes, or new features.
