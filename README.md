# Maharaja Agrasen Foundation Limited Singapore (MAFL)
> **One Community • One Platform • One Global Family | एक समाज • एक मंच • एक परिवार**  
> *Official Global Digital Platform & Verified Community Registry*  
> Corporate Registration: **UEN 202551557G** (Singapore)

---

## 📖 Overview

The **Maharaja Agrasen Foundation Limited (MAFL)** platform is an enterprise-grade community management ecosystem, verified directory, and cultural heritage portal built for the global Agarwal community. 

Initiated under the patronage of **Sohan Lal Jindal ("Singapore Wale")**, the platform unifies family registration, global business networking, matrimonial discovery, career opportunities, real-time verified messaging, and high-security administrative support into a single, cohesive, privacy-centric web application.

---

## 🔗 Repository & Git Architecture

> [!NOTE]
> **Git Repository Location**: This directory (`web/`) is the root of the Git repository connected to [`https://github.com/AayushM0/agrawal-web.git`](https://github.com/AayushM0/agrawal-web.git).
> All `git` commands (`status`, `commit`, `pull`, `push`) must be executed from inside `web/` to preserve Vercel deployment parity.

For a comprehensive walkthrough of the application's user flows, state transitions, role permissions, and sequence diagrams, refer to:
👉 **[User Flow & Navigation Architecture Guide (USER_FLOW.md)](./USER_FLOW.md)**

---

## 🏗️ Architecture & Technology Stack

The platform is engineered as a modern, serverless-ready full-stack application with strict data integrity, defense-in-depth privacy guards, and verifiable audit trails.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Web & Mobile Browser Clients                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / HTTP/2
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Next.js 15 App Router (React 19)                   │
│  - Middleware: HMAC Session Token Authentication & Route Guards        │
│  - Server Components: Pre-rendered layouts & SEO-optimized pages       │
│  - Server Actions: Type-safe mutations, CSRF defense, Turnstile checks │
└──────────┬────────────────────────┬────────────────────────┬───────────┘
           │                        │                        │
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  PostgreSQL Database │ │   Pusher Channels    │ │  Cloudflare / S3 CDN │
│  - 18 Gotras Registry│ │  - Real-time Websocket│ │  - ID Card Assets   │
│  - Serial Sequences  │ │  - Encrypted Chat    │ │  - Profile Images   │
│  - Row-Level Security│ │  - In-app Toasts     │ │  - Turnstile Shield │
│  - Email Queue       │ └──────────────────────┘ └──────────────────────┘
│  - Support Sessions  │
│  - Audit Logs        │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Outbound Service Layer                          │
│  - Resend API (Transactional Email Queue with IPv4 DNS Fallback)       │
│  - Playwright Chromium (Vector A4 Marriage Biodata PDFs)               │
│  - @react-pdf/renderer (Dynamic Lanyard Passes & Business Certificates)│
│  - DPDP Data Retention Cron (Automatic 90-day Message Pruning)         │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Technologies

| Layer | Technology | Rationale & Responsibility |
|---|---|---|
| **Framework** | **Next.js 15 (App Router)** | Hybrid SSG/SSR, Server Actions, Zero-bundle backend execution |
| **Frontend UI** | **React 19, Tailwind CSS** | Server & Client Components, 12px accessible type floor, Lucide SVG icons |
| **Language** | **TypeScript 5 (Strict)** | End-to-end type safety across schemas, actions, and UI forms (0 type errors) |
| **Database** | **PostgreSQL (pg)** | ACID relational storage, custom sequence gap algorithms, RLS policies |
| **Cold-Start Engine** | **Lazy Auto-Healing** | Zero DDL table locking on serverless boots; automatic runtime schema healing |
| **Security & Auth** | **bcryptjs, Web Crypto HMAC** | Salted passwords, secure httpOnly session cookies, cryptographic OTPs |
| **Real-Time** | **Pusher Channels** | Instant 1-to-1 messaging, presence, and moderation alerts |
| **Document Engines**| **Playwright & React-PDF** | Headless Chromium for Devanagari biodatas; React-PDF for passes & certificates |
| **Anti-Abuse** | **Cloudflare Turnstile** | Non-intrusive CAPTCHA alternative safeguarding signups and logins |
| **Transactional Email** | **Resend / DB Queue** | Durable PostgreSQL email queue with retry mechanics and rate-limiting |

---

## 🏛️ Platform Feature Modules

### 1. Household & Member Registration (`/signup`)
- **5-Step Interactive Wizard**: Contact validation, household gotra/native place, member profiles, privacy preferences, and confirmation.
- **Serial Number Reclamation**: Algorithmic gap detection (`generateNextHouseholdNo`, `generateNextMemberSerialNo`) ensures cancelled or rejected applications immediately recycle serial numbers without burning permanent sequences.
- **RFC 5321 Email Input Hardening**: Shared client/server email normalization with real-time typo detection (e.g., `gmial.com` $\to$ `gmail.com`) and punycode support.
- **Draft Recovery**: Auto-saving registration drafts (`form_data` JSONB & `localStorage`) with sensitive field redaction.

### 2. Login-Gated Global Community Directory (`/directory`)
- **Faceted Search**: Search members across full text (name, profession, native place, gotra) and geographical location.
- **Privacy Enforcement**: Granular field-level toggles (phone, email, age/DOB) respect member preferences; sensitive IDs (Aadhaar, PAN, Passport) are masked or omitted in public views.
- **Digital Lanyard Pass (`/dashboard/pass`, `/api/pass/pdf`)**: Real-time PDF lanyard pass generation featuring verified member badges and QR credentials.

### 3. Verified Global Business Network (`/businesses`)
- **Single-Manager Authority**: Strict separation of ownership; only the verified manager can edit, pause, delete, or initiate a handover.
- **Cryptographic Certificate Issuance**: Approved businesses receive an ornate, official MAFL certificate with a permanent `MAFLBUS-XXX-XXX-XXX` registration code and authentic MAFL Singapore seal asset (`UEN 202551557G`).
- **Dynamic Live PDF**: Certificates are rendered dynamically from current verified business data via `/api/businesses/[id]/certificate`.

### 4. Careers & Job Opportunities Network (`/careers`)
- **Talent Directory & Profiles**: Agarwal professionals can showcase portfolios, skills, experience, and open-to-work statuses.
- **Native Job Postings (`/careers/jobs`, `/careers/post`)**: Live enterprise job postings with instant applicant tracking and moderation guards.

### 5. Matrimonial Directory & Biodata Engine (`/matrimony`)
- **Culturally Aligned Profiles**: Gotra compatibility, 4-Gotra heritage matrix (Self, Mother/Nanihal, Dadi, Nani), astrological details, and educational qualifications.
- **Playwright Vector PDF Generator (`/api/matrimony/[id]/biodata/pdf`)**: High-resolution, zero-dependency A4 vector PDF biodata downloads powered by headless Chromium with strict IDOR access checks and bounded semaphore concurrency.

### 6. Real-Time Chat & Direct Inquiries (`/dashboard/messages`)
- **Pusher WebSockets**: Low-latency 1-to-1 chat between verified members and business inquiries.
- **Anti-Fraud & Content Moderation**: Real-time dictionary filtering flags malicious links or unapproved solicitations.
- **DPDP Right to Erasure & Auto-Pruning**: Cron endpoint (`/api/cron/prune-messages`) enforces 90-day chat retention limits in compliance with global data protection laws.

### 7. Member-Authorized Admin Support Sessions (`/admin/moderation` • Issue 052)
- **Zero-Trust Support Access**: Admins cannot unilaterally modify personal member records. A support session requires a member-authorized 6-digit cryptographic OTP challenge sent to the member's registered email.
- **Enforced Security Bounds**: 24-hour time-to-live (TTL), digital `HH:MM:SS` countdown timer, 3-attempt lockout defense, and two-step in-modal session revocation.
- **Atomic Diff Audit Logs**: Every modification records precise before/after snapshots (`admin_support_audit_logs`) and enforces PostgreSQL OID 1082 DATE parsing to eliminate timezone day-drift.

### 8. Unified Platform Audit Trail (`/admin/audit` • AWB-16 to AWB-22)
- **Centralized Tamper-Evident Explorer**: Immutable audit ledger tracking all administrative decisions, moderation actions, and member profile corrections.
- **Security Hardened**: Full protection against CSV formula injection (CWE-1236) on exports, query limit capping, search debounce, and interactive diff viewer modals.

---

## 📁 Repository Structure

```
web/
├── src/
│   ├── actions/                  # Next.js Server Actions (Auth, Careers, Register, Support, etc.)
│   ├── app/                      # App Router routes (Directory, Signup, Admin, Careers, etc.)
│   ├── components/               # React UI Components (Layout, Forms, Modals, Admin tables)
│   ├── db/
│   │   └── schema.sql            # Master PostgreSQL DDL, Triggers, Views & Functions
│   ├── lib/                      # Core utilities (db.ts, privacy.ts, email-validation.ts, matrimony-pdf.ts)
│   └── types/                    # TypeScript interfaces and domain unions
├── public/                       # Static images, official seals, logos, and fonts
├── scripts/                      # DB migration, inspection, and verification scripts
├── tests/                        # 127 automated unit, seam, and regression tests
├── USER_FLOW.md                  # Comprehensive user journey & navigation documentation
├── .env.example                  # Environment configuration template
└── package.json                  # Scripts and dependencies
```

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose**: For local PostgreSQL (or access to an external PostgreSQL instance)

### 1. Clone & Install
```bash
cd web
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Key environment variables to configure:
```ini
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/agrawal_dev"

# Cryptographic secret for session signing & OTP generation (min 32 chars)
AUTH_SECRET="your_secure_random_32_character_hex_or_base64_secret"

# Master administrative password for /admin/moderation and /admin/audit
ADMIN_MASTER_PASSWORD="your_admin_master_password"

# Optional: Transactional email (falls back to mock/queue in dev if empty)
RESEND_API_KEY=""

# Optional: Real-time messaging (Pusher credentials)
PUSHER_APP_ID=""
NEXT_PUBLIC_PUSHER_APP_KEY=""
PUSHER_SECRET=""
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

### 3. Start Local Database
If using Docker, start the PostgreSQL container from the project root:
```bash
docker compose up -d
```
The database initialization script runs automatically on the first connection, executing [`src/db/schema.sql`](file:///d:/Projects/agrawalWeb/web/src/db/schema.sql) idempotently.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing & Verification

The repository maintains strict verification standards with an automated test suite using Node.js's native test runner (`node:test`).

```bash
# Run the complete test suite (127 passing tests)
npm test

# On Windows with restricted PowerShell execution policies:
npm.cmd test

# Run TypeScript type verification (0 errors)
npx tsc --noEmit

# Run Next.js production build (validates all 45 routes)
npm run build
```

### Architectural Seams
The test suite enforces 38 distinct **Architectural Seams** in [`tests/seams.test.mjs`](file:///d:/Projects/agrawalWeb/web/tests/seams.test.mjs), ensuring:
- Zero plaintext password leaks or hardcoded cryptographic fallbacks.
- Strict gap recovery on rejected registration serial numbers.
- Immutability of business certificate serial numbers across reapproval.
- Idempotent schema migrations and dual in-memory fallback behavior during headless runs.
- IDOR access boundaries on matrimonial biodata vector PDFs and lanyard cards.
- Tamper-evident formatting and CSV formula injection neutralization in the platform audit trail.

---

## 📜 Legal & Intellectual Property

© 2026 Maharaja Agrasen Foundation Limited Singapore. All rights reserved.  
Registration: **UEN 202551557G**.