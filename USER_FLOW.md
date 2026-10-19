# Maharaja Agrasen Foundation Limited Singapore (MAFL)
# End-to-End User Flow & Navigation Architecture

> **One Community • One Platform • One Global Family | एक समाज • एक मंच • एक परिवार**  
> *Corporate Registration: UEN 202551557G (Singapore)*

---

## 🧭 System Role Matrix

The platform is designed around 6 distinct actor personas with granular, defense-in-depth permission boundaries:

| Actor Role | Entry Points | Key Capabilities & Boundary Limits |
|---|---|---|
| **Public Visitor (Guest)** | `/`, `/about`, `/guide`, `/help`, `/businesses`, `/careers/jobs` | Can browse public landing pages, search job board, view verified business cards. **Cannot** access directory search, member phone/email contacts, or matrimonial listings without logging in. |
| **Applicant (Pending Review)** | `/signup`, `/pending-approval` | Can submit a 5-step registration, auto-save drafts, and monitor verification status. Access to member-gated features remains locked until approved. |
| **Verified Member** | `/directory`, `/matrimony`, `/dashboard/messages`, `/settings` | Can search the directory, reveal contact details within rate limits, send 1-to-1 messages, post/apply for jobs, and download their digital lanyard pass. |
| **Head of Household** | `/dashboard`, `/dashboard/pass` | Manages the household family unit, adds family members, manages visibility toggles, and issues encrypted self-claim tokens to family members. |
| **Business Manager** | `/businesses/create`, `/businesses/[id]/edit` | Exclusive authority to edit enterprise details, pause/resume listings, initiate manager handover, and download the official ornate MAFL certificate. |
| **Platform Administrator** | `/admin/moderation`, `/admin/audit` | Approves/rejects households, businesses, and job listings; requests member-authorized OTP support sessions; inspects the immutable platform audit trail. |

---

## 🗺️ High-Level Navigation & Flow Diagram

```mermaid
flowchart TD
    %% Entry
    Start([Visitor Lands on /]) --> Choice{Has Account?}
    
    %% Auth branch
    Choice -- No --> SignUp["/signup (5-Step Wizard)"]
    Choice -- Yes --> Login["/login (Password + Brute-force Guard)"]
    Login -- Forgot Password? --> ForgotPwd["/forgot-password (Email OTP Reset)"]
    ForgotPwd --> Login
    
    %% Post Signup
    SignUp --> Draft["Auto-saved Draft (JSONB / LocalStorage)"]
    Draft --> SubmitReg["Submit for Verification"]
    SubmitReg --> Pending["/pending-approval Queue"]
    
    %% Admin Moderation
    Pending --> AdminMod{"/admin/moderation Review"}
    AdminMod -- Rejected --> Resubmit["Resubmit with Corrections (Serial Recycled)"]
    Resubmit --> Pending
    AdminMod -- Approved --> Live["Account Activated & Serial Assigned"]
    
    %% Authenticated Hub
    Login --> Live
    Live --> Hub{"Member Navigation Hub"}
    
    %% Core Pillars
    Hub --> Directory["1. Global Directory (/directory)"]
    Hub --> Dashboard["2. Family Dashboard (/dashboard)"]
    Hub --> Businesses["3. Business Network (/businesses)"]
    Hub --> Careers["4. Careers & Talent (/careers)"]
    Hub --> Matrimony["5. Matrimonial Network (/matrimony)"]
    Hub --> Chat["6. Real-time Messages (/dashboard/messages)"]
    
    %% Admin Path
    Live -. Admin Master Key .-> AdminPortal["7. Admin Portal (/admin/moderation & /admin/audit)"]
```

---

## 🔄 Detailed User Journeys

### 1. Visitor Discovery & Registration Flow (`/signup`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Visitor / Head of Household
    participant Client as Web Browser
    participant Server as Next.js Server Actions
    participant DB as PostgreSQL Database

    User->>Client: Navigates to /signup
    Client->>Client: Checks localStorage for existing draft
    Note over Client: Step 1: Contact Details & Email Typo Check
    User->>Client: Enters mobile and email (e.g. user@gmial.com)
    Client->>Client: suggestDomainCorrection flags "gmail.com" suggestion
    User->>Client: Confirms email and enters password
    Client->>Server: checkContactRegistration(phone, email)
    Server->>DB: Query existing active households
    Server-->>Client: Contact Available

    Note over Client: Step 2: Head of Household & Heritage
    User->>Client: Selects Gotra (18 Gotras), Native Place, Address, Photo (optional)

    Note over Client: Step 3: Additional Family Members
    User->>Client: Adds spouse, children, or elders (Relation, DOB, Occupation)

    Note over Client: Step 4: Privacy & Visibility Defaults
    User->>Client: Sets phone/email visibility (members_only / hidden)

    Note over Client: Step 5: Review & Consent Submission
    User->>Client: Confirms DPDP consent checkbox and submits
    Client->>Server: registerHouseholdAction(payload)
    Server->>DB: generateNextHouseholdNo (recycling gaps) & store household
    Server-->>Client: Household created with status 'pending_review'
    Client->>Client: Clears localStorage registration draft
    Client->>User: Redirects to /pending-approval
```

- **Serial Gap Reclamation**: If an application is rejected or cancelled, its temporary sequence is immediately reclaimed by `generateNextHouseholdNo` to eliminate permanent sequence drift.
- **Draft Recovery**: Changes are automatically synced to client `localStorage` and optionally to PostgreSQL JSONB drafts, ensuring users never lose registration progress upon accidental tab closures.

---

### 2. Authentication, Login & Password Recovery (`/login`, `/forgot-password`, `/claim`)

```mermaid
flowchart LR
    A["/login"] --> B{"Authentication Type"}
    B -- Password Login --> C["bcrypt.compare + Timing-Safe Check"]
    C -- Success --> D["HMAC Signed httpOnly Session Cookie"]
    C -- 5 Failed Attempts --> E["Temporary Lockout (Brute-Force Guard)"]
    
    B -- Forgot Password? --> F["/forgot-password"]
    F --> G["Enter Registered Email"]
    G --> H["Cryptographic 6-Digit OTP Sent via Email Queue"]
    H --> I["Verify OTP (10 min TTL)"]
    I --> J["Set New Password (bcrypt hashed)"]
    J --> A

    B -- Member Claim Token --> K["/claim?token=XYZ"]
    K --> L["Verify Encrypted Invite Token"]
    L --> M["Set Own Password & Verify Email"]
    M --> N["Mark Profile 'verifiedBySelf' & Unlink Head Edit Access"]
```

---

### 3. Family Dashboard & Member Management (`/dashboard`)

```mermaid
flowchart TD
    D["/dashboard (Head of Household View)"]
    D --> V1["View Household Metadata (#AGR-2026-XXX, Gotra, Native Place)"]
    D --> V2["Add Family Member Modal (Name, Relation, DOB, Occupation)"]
    D --> V3["Generate Encrypted Self-Claim Invite Link"]
    D --> V4["Configure Field-Level Privacy Toggles"]
    D --> V5["Download Digital Lanyard Pass (/dashboard/pass)"]
    
    V5 --> PDF["/api/pass/pdf (React-PDF Serverless Renderer)"]
    PDF --> LanyardCard["A6 Lanyard Card with QR & MAFL Verification Badge"]
```

- **Claim Isolation**: Once an invited family member accepts their claim token at `/claim`, their record becomes `ownerLocked`. The Head of Household retains view permissions, while update rights transfer exclusively to the claimed individual.

---

### 4. Global Directory & Privacy-Gated Search (`/directory`)

```mermaid
flowchart LR
    Dir["/directory (Auth Required)"] --> Filters["Faceted Search Filters"]
    Filters --> F1["18 Gotras Canonical Dropdown"]
    Filters --> F2["Native Place / Ancestral Town"]
    Filters --> F3["Current City / State / Country"]
    Filters --> F4["Keyword (Name, Profession)"]
    
    Filters --> Results["Directory Results List"]
    Results --> Card["Member Preview Card (Masked Phone: +91 98*** ***10)"]
    Card --> Detail["/directory/[id] Detailed Profile"]
    Detail --> Reveal{"Reveal Contact Button"}
    Reveal -- Authenticated & Rate-Limited --> Unmasked["Full Phone & Email Displayed"]
    Reveal -- Rate Limit Exceeded --> Warn["Temporary Backoff Warning"]
```

- **DPDP Act Compliance**: Government IDs (Aadhaar, PAN, Passport) are strictly masked or redacted from public payloads at the database query layer (`privacy.ts`).

---

### 5. Verified Global Business Network (`/businesses`)

```mermaid
sequenceDiagram
    autonumber
    actor Mgr as Business Founder / Manager
    actor Admin as Platform Admin
    participant App as Web App (/businesses)
    participant DB as PostgreSQL
    participant PDF as React-PDF Engine

    Mgr->>App: Creates Enterprise Profile (/businesses/create)
    App->>DB: Stores business with status 'pending_review' and assign creator as current_manager
    Admin->>App: Reviews credentials (GSTIN / MSME / CIN) on /admin/moderation
    Admin->>DB: Approves Business & Assigns Permanent 'MAFLBUS-XXX-XXX-XXX'
    DB->>DB: Creates immutable record in business_certificate_issuances
    Admin-->>Mgr: Automated Approval Email with Certificate Attached

    Note over Mgr,App: Manager Operations (/businesses/[id]/edit)
    Mgr->>App: Downloads Official Certificate (/api/businesses/[id]/certificate)
    App->>PDF: Generates A4 Landscape Vector Certificate with Official Singapore Seal
    PDF-->>Mgr: Delivers PDF directly to manager browser
    
    Note over Mgr,App: Handover Lifecycle
    Mgr->>App: Initiates Handover to another verified member
    App->>DB: Creates pending handover invitation
    Note over App: Target member accepts handover
    DB->>DB: Updates current_manager; former manager access revoked immediately
```

---

### 6. Matrimonial Directory & Playwright Biodata Generation (`/matrimony`)

```mermaid
flowchart TD
    M["/matrimony (Auth Required)"] --> List["Browse Candidates (Age, Height, Gotra, City)"]
    M --> Create["Create Candidate Profile (/matrimony/create)"]
    Create --> Gotra4["Enter 4 Gotras (Self, Mother/Nanihal, Dadi, Nani)"]
    Create --> Astro["Enter Astrology / Kundali Details (Manglik, Rashi, Nakshatra)"]
    Create --> BioSubmit["Submit Matrimonial Profile"]
    
    List --> View["/matrimony/[id] Candidate Detail"]
    View --> DownloadBio["Download Official Biodata PDF Button"]
    DownloadBio --> Route["/api/matrimony/[id]/biodata/pdf"]
    Route --> Sec{"IDOR & Access Check (canAccessMatrimonialBiodata)"}
    Sec -- Denied --> Err403["403 Forbidden"]
    Sec -- Approved --> Pool["ChromiumRenderPool (Bounded Semaphore Concurrency)"]
    Pool --> HTML["compileBiodataHtml (Embedded Base64 Fonts & SVG Crests)"]
    HTML --> Chrome["Headless Playwright Chromium Page Render"]
    Chrome --> PDF["Crisp A4 Devanagari Vector PDF Delivered in ~1s"]
```

---

### 7. Careers & Enterprise Opportunities (`/careers`)

```mermaid
flowchart LR
    C["/careers Hub"] --> Talent["Talent Directory (/careers)"]
    C --> Jobs["Job Opportunities Board (/careers/jobs)"]
    
    Talent --> MyTalent["Create / Edit Talent Profile (/careers/create)"]
    MyTalent --> Showcase["Showcase Skills, Experience, Portfolio & Open-To-Work Status"]
    
    Jobs --> PostJob["Post Enterprise Job Opening (/careers/post)"]
    PostJob --> JobPending["Admin Review Queue"]
    JobPending --> JobLive["Live Job Listing (/careers/jobs/[id])"]
    JobLive --> Apply["Member 1-Click Apply & In-App Direct Routing"]
```

---

### 8. Real-Time Chat & Commercial Inquiries (`/dashboard/messages`)

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Member / Inquiring Buyer
    actor Receiver as Household Head / Business Manager
    participant App as /dashboard/messages
    participant Pusher as Pusher Channels WebSocket
    participant DB as PostgreSQL
    participant Cron as DPDP Retention Cron (/api/cron/prune-messages)

    Sender->>App: Sends text inquiry or attachment
    App->>App: Anti-fraud dictionary filter scans message content
    App->>DB: Persists encrypted message record in chat_messages
    App->>Pusher: Triggers 'new-message' event on private channel
    Pusher-->>Receiver: Instant low-latency in-app message & notification toast
    
    Note over Cron,DB: 90-Day DPDP Data Retention Rule
    Cron->>DB: Nightly cron identifies messages older than 90 days
    DB->>DB: Hard deletes expired messages to comply with Right to Erasure
```

---

### 9. Admin Moderation, Support Sessions & Unified Audit Trail (`/admin`)

```mermaid
flowchart TD
    Admin["/admin/moderation (Protected Master Key Guard)"]
    
    %% Moderation Tabs
    Admin --> Tab1["1. Households Queue (Approve / Reject with feedback)"]
    Admin --> Tab2["2. Business Queue (Verify Corporate Credentials & Issue MAFLBUS)"]
    Admin --> Tab3["3. Jobs Queue (Enterprise Employment Verification)"]
    Admin --> Tab4["4. Member-Authorized Support Sessions (Issue 052)"]
    
    %% Support Session Workflow
    Tab4 --> SessReq["Admin Requests Support Session for Member"]
    SessReq --> OTPMail["Cryptographic 6-Digit OTP sent to member's email"]
    OTPMail --> OTPVerify["Member provides OTP -> Admin Enters Code"]
    OTPVerify --> ActiveSess["Active Session (24h TTL, Digital HH:MM:SS Timer, 3 Strikes Lockout)"]
    ActiveSess --> Correction["Admin Corrects Typo / Personal Details"]
    Correction --> DiffSnap["Atomic Diff Snapshot Stored: { field: { old, new } }"]
    
    %% Unified Audit Explorer
    Admin --> AuditLink["Unified Audit Explorer (/admin/audit)"]
    DiffSnap --> AuditLink
    AuditLink --> AuditUI["Faceted Filters, Search Debounce, Diff Inspector Modal & CSV Export"]
```

---

## 🔒 Security & Defensive Guarantees

1. **Zero-Trust Support Sessions**: Platform administrators cannot unilaterally alter personal member records. A valid cryptographic challenge OTP sent directly to the member's email address is mandatory before access is temporarily unlocked.
2. **CWE-1236 Neutralization**: All platform CSV exports safely sanitize fields starting with `=`, `+`, `-`, `@`, `\t`, or `\r` to prevent spreadsheet formula execution exploits.
3. **IDOR Prevention**: All PDF download endpoints (`/api/pass/pdf`, `/api/businesses/[id]/certificate`, `/api/matrimony/[id]/biodata/pdf`) verify requester ownership, manager permissions, or explicit view access prior to invoking PDF rendering engines.
4. **Cold-Start Resilience**: The database layer bypasses redundant DDL checks on serverless cold boots, featuring a lazy auto-healing fallback that transparently self-migrates on runtime column/table misses.
