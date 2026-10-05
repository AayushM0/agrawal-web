# Maharaja Agrasen Foundation Limited Singapore (MAFL)
> **One Community • One Platform • One Global Family | एक समाज • एक मंच • एक परिवार**  
> *Official Global Digital Platform & Verified Community Registry*  
> Corporate Registration: **UEN 202551557G** (Singapore)

---

## 📖 Overview

The **Maharaja Agrasen Foundation Limited (MAFL)** platform is an enterprise-grade community management ecosystem, verified directory, and cultural heritage portal built for the global Agarwal community. 

Initiated under the patronage of **Sohan Lal Jindal ("Singapore Wale")**, the platform unifies family registration, global business networking, matrimonial discovery, career opportunities, real-time verified messaging, and high-security administrative support into a single, cohesive, privacy-centric web application.

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
│  - @react-pdf/renderer (Dynamic Lanyard Passes & Official Certificates)│
│  - DPDP Data Retention Cron (Automatic 90-day Message Pruning)         │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Technologies

| Layer | Technology | Rationale & Responsibility |
|---|---|---|
| **Framework** | **Next.js 15 (App Router)** | Hybrid SSG/SSR, Server Actions, Zero-bundle backend execution |
| **Frontend UI** | **React 19, Tailwind CSS** | Server & Client Components, 12px accessible type floor, Lucide SVG icons |
| **Language** | **TypeScript 5 (Strict)** | End-to-end type safety across schemas, actions, and UI forms |
| **Database** | **PostgreSQL (pg)** | ACID relational storage, custom sequence gap algorithms, RLS policies |
| **Security & Auth** | **bcryptjs, Web Crypto HMAC** | Salted passwords, secure httpOnly session cookies, cryptographic OTPs |
| **Real-Time** | **Pusher** | Instant 1-to-1 messaging, presence, and moderation alerts |
| **Document Engine**| **@react-pdf/renderer** | Native serverless PDF generation for lanyard cards & business certificates |
| **Anti-Abuse** | **Cloudflare Turnstile** | Non-intrusive CAPTCHA alternative safeguarding signups and logins |
| **Transactional Email** | **Resend / DB Queue** | Durable PostgreSQL email queue with retry mechanics and rate-limiting |

---

## 🏛️ Platform Feature Modules

### 1. Household & Member Registration (`/signup`)
- **5-Step Interactive Wizard**: Contact validation, household gotra/native place, member profiles, privacy preferences, and confirmation.
- **Serial Number Reclamation**: Algorithmic gap detection (`generateNextHouseholdNo`, `generateNextMemberSerialNo`) ensures cancelled or rejected applications immediately recycle serial numbers without burning permanent sequences.
- **RFC 5321 Email Input Hardening**: Shared client/server email normalization with real-time typo detection (e.g., `gmial.com` $\to$ `gmail.com`) and punycode support.
- **Draft Recovery**: Auto-saving registration drafts (`form_data` JSONB) with sensitive field redaction (passwords scrubbed before storage).

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
- **Native Job Postings (`/careers/post`)**: Live enterprise job postings with instant applicant tracking and moderation guards.

### 5. Matrimonial Directory (`/matrimony`)
- **Culturally Aligned Profiles**: Gotra compatibility, sub-caste rules, astrological details, educational qualifications, and lifestyle values.
- **Privacy Shields**: Optional photo sharing, protected contact requests, and admin moderation before profiles go live.

### 6. Real-Time Chat & Direct Inquiries (`/dashboard/messages`)
- **Pusher WebSockets**: Low-latency 1-to-1 chat between verified members and business inquiries.
- **Anti-Fraud & Content Moderation**: Real-time dictionary filtering flags malicious links or unapproved solicitations.
- **DPDP Right to Erasure & Auto-Pruning**: Cron endpoint (`/api/cron/prune-messages`) enforces 90-day chat retention limits in compliance with global data protection laws.

### 7. Member-Authorized Admin Support Sessions (`/admin/moderation` • Issue 052)
- **Zero Trust Support Access**: Admins cannot unilaterally modify personal member records. A support session requires a member-authorized 6-digit cryptographic OTP challenge sent to the member's registered email.
- **Enforced Security Bounds**: 24-hour time-to-live (TTL), digital `HH:MM:SS` countdown timer, 3-attempt lockout defense, and two-step in-modal session revocation.
- **Atomic Diff Audit Logs**: Every modification records precise before/after snapshots (`admin_support_audit_logs`) and enforces PostgreSQL OID 1082 DATE parsing to eliminate timezone day-drift.

---

## 📁 Repository Structure

```
src/
├── actions/                  # Next.js Server Actions (Auth, Careers, Register, Support, etc.)
├── app/                      # App Router routes (Directory, Signup, Admin, Careers, etc.)
├── components/               # React UI Components (Layout, Forms, Modals, Admin tables)
├── db/
│   └── schema.sql            # Master PostgreSQL DDL, Triggers, Views & Functions
├── lib/                      # Core utilities (db.ts, email-validation.ts, pass.ts, privacy.ts)
└── types/                    # TypeScript interfaces and domain unions
public/                       # Static images, seals, logos, and fonts
scripts/                      # DB migration, inspection, and verification scripts
tests/                        # 89 automated unit, seam, and regression tests
.env.example                  # Environment configuration template
package.json                  # Scripts and dependencies
```

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL**: Local Docker instance or remote database

### 1. Install Dependencies
```bash
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

# Master administrative password for /admin/moderation
ADMIN_MASTER_PASSWORD="your_admin_master_password"

# Optional: Transactional email (falls back to mock/queue in dev if empty)
RESEND_API_KEY=""

# Optional: Real-time messaging (Pusher credentials)
PUSHER_APP_ID=""
NEXT_PUBLIC_PUSHER_APP_KEY=""
PUSHER_SECRET=""
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

### 3. Initialize Database
The database initialization script runs automatically on the first connection, executing `src/db/schema.sql` idempotently.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing & Verification

The repository maintains strict verification standards with an automated test suite using Node.js's native test runner (`node:test`).

```bash
# Run the complete test suite (89 passing tests)
npm test -- --run

# Run TypeScript type verification
npx tsc --noEmit

# Run Next.js production build (validates all 44 routes)
npm run build
```

### Architectural Seams
The test suite enforces 37 distinct **Architectural Seams** in `tests/seams.test.mjs`, ensuring:
- Zero plaintext password leaks or hardcoded cryptographic fallbacks.
- Strict gap recovery on rejected registration serial numbers.
- Immutability of business certificate serial numbers across reapproval.
- Idempotent schema migrations and dual in-memory fallback behavior during headless runs.

---

## 🗺️ Upcoming Roadmap

- [ ] **Unified Platform Audit Trail (AWB-16+)**: Centralizing all administrative, moderation, and support events into an immutable, SHA-256 tamper-evident PostgreSQL view with a dedicated `/admin/audit` faceted explorer.
- [ ] **Production Resend Email Dispatch**: Configuring production domain authentication and API keys for the durable email queue.

---

## 📜 Legal & Intellectual Property

© 2026 Maharaja Agrasen Foundation Limited Singapore. All rights reserved.  
Registration: **UEN 202551557G**.