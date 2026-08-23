# Comprehensive Platform Overhaul Specification (`changes.md`)

## Executive Summary
This document specifies the exact architecture, database schema changes, UI/UX workflows, security controls, and verification criteria for the Maharaja Agrasen Foundation Global Directory platform overhaul.

---

## 1. Contact Privacy & Age Display
### Problem & Context
Previously, Step 4 of the registration wizard allowed users to toggle contact visibility between `members_only`, `public_to_members`, and `hidden`. Publicly exposing or negotiating phone numbers and emails introduces privacy and security risks.

### Specifications
1. **Remove Step 4 (Privacy Preferences)**:
   - Eliminate Step 4 from `src/app/signup/page.tsx` entirely.
   - The wizard transitions directly from **Step 3 (Family Members & IDs)** to **Step 4 (Review & Final Submission)**.
2. **Permanent Masking Everywhere**:
   - Phone numbers must be permanently masked in all public and member-facing UI:
     - Example: `+91 9876543210` -> `+91 ••••••3210`
   - Email addresses must be permanently masked:
     - Example: `rahul.agarwal@example.com` -> `r•••••l@example.com`
   - Applies to:
     - Directory Search (`src/app/directory/page.tsx`)
     - Member Profile View (`src/app/directory/[id]/page.tsx`)
     - Household Dashboard Cards (`src/app/dashboard/page.tsx`)
3. **Dynamic Real-Time Age Calculation**:
   - Compute age dynamically from `dob` (Date of Birth) across all views:
     - Display badge: `[X] yrs • [Adult / Minor (<18)]`.

---

## 2. Cascading Address, Mandatory Fields & Profession Hierarchy
### Problem & Context
Location entry was previously unstructured, leading to incomplete addresses and missing postal codes. Additionally, professions lacked clarity and examples.

### Specifications
1. **Location Cascading Hierarchy (`src/components/LocationSelector.tsx`)**:
   - **Order of Selection**:
     1. **Country (देश)**: Dropdown of all world countries (defaults to India `IN`).
     2. **Postal / PIN Code (पिन कोड / पोस्टल कोड)**: Input with automated state & district prefill lookup where available.
     3. **State / Province (राज्य)**: Cascading select populated based on selected Country.
     4. **City / District / Area (शहर / ज़िला)**: Cascading select populated based on selected State.
     5. **Full Residential Address (पूरा पता)**: Explicit multi-line text input for House/Flat No, Building Name, Street, Landmark.
2. **Mandatory Profile Fields**:
   - The following fields are strictly required (`*`) for the Head of Household:
     - Profile Picture (`photoUrl`)
     - Full Name (`fullName`)
     - Father's / Husband's Name (`fatherName`)
     - Gender (`gender`)
     - Marital Status (`maritalStatus`)
     - Date of Birth (`dob`)
     - Ancestral Native Place (`nativePlace` / मूल निवास)
     - Country, Postal Code, State, City, and Full Address
3. **Structured Profession with In-Context Guidance**:
   - **Profession Title**: e.g., *Chartered Accountant*, *Software Architect*, *Business Owner / Industrialist*.
   - **1-Line Profession Description**: e.g., *Specializing in corporate tax advisory, GST audits, and cross-border structuring*.
   - **Helper Text / Example Banner**: Contextual hint placed directly beneath the input box showing real-world examples.

---

## 3. Global Dialing Codes & SMS Infrastructure
### Problem & Context
Members register from India, Singapore, UAE, USA, UK, Australia, etc. Fixed 10-digit validation fails for international formats.

### Specifications
1. **Dynamic Country Phone Prefixes**:
   - Bind country selection in Step 1 and Step 3 directly to international dialing prefixes:
     - India: `+91`
     - Singapore: `+65`
     - USA / Canada: `+1`
     - UAE: `+971`
     - UK: `+44`
   - Validate according to standard international E.164 phone formats.
2. **Native SMS Dispatch Engine**:
   - Twilio API messages dispatched via native `fetch` with Basic Auth supporting global E.164 destinations without third-party SDK dependencies.

---

## 4. Country-Specific Identity Verification
### Problem & Context
To ensure zero fraud in the community directory, registration requires authentic government identification differentiated by country of residence.

### Specifications
1. **Branching Identity Fields**:
   - **If Country is India (`country === "India"` / `IN`)**:
     - **Aadhaar Number**: 12 digits, formatted `XXXX-XXXX-XXXX`, validated with strict 12-digit numeric constraint.
     - **PAN Number**: 10 alphanumeric characters (format: `[A-Z]{5}[0-9]{4}[A-Z]{1}`).
   - **If Country is Outside India (`country !== "India"`)**:
     - **Passport Number**: Alphanumeric passport identifier.
     - **Government Issued National ID / Tax ID**: e.g., NRIC/FIN (Singapore), SSN/State ID (USA), Emirates ID (UAE).
2. **Database Storage & Access Control**:
   - Store encrypted / protected fields in `members` and `households` tables:
     - `aadhaar_number`, `pan_number`, `passport_number`, `govt_id_number`.
   - **Strict Privacy**: Government IDs are visible ONLY to Super Admins in `/admin/moderation` for approval audits, never exposed in public search APIs or directory JSON payloads.

---

## 5. Flexible Family Member Authentication & Claim Links
### Problem & Context
Dependents (children, non-tech elderly members) may not have personal phones/emails, but working adults require independent account access.

### Specifications
1. **Optional Contact for Secondary Members**:
   - Phone and email are strictly optional for non-head family members.
2. **Branching Authentication Model**:
   - **Case A: Family Member has a Phone Number**:
     - Store member's phone number.
     - Generate a cryptographically secure `claim_token`.
     - Provide shareable WhatsApp/SMS claim link: `https://[domain]/claim?token=[claim_token]`.
     - Once claimed, member can log in independently using their own phone number.
   - **Case B: Family Member has NO Phone Number**:
     - The member is linked to the Household Head.
     - The family member's details and ID pass can be accessed and managed by logging in with the Head's verified phone number.

---

## 6. High-DPI Logo Sharpness Optimization
### Problem & Context
The header logo `/images/logo-transparent.png` appears blurry on high-pixel-density mobile and Retina displays due to raster scaling.

### Specifications
1. **Resolution & Rendering Fix**:
   - Optimize Next.js `<Image>` component with explicit dimensions, `sizes="(max-width: 768px) 48px, 64px"`, and `quality={95}`.
   - Apply CSS hardware-accelerated crisp rendering:
     - `image-rendering: -webkit-optimize-contrast;`
     - `image-rendering: crisp-edges;`
   - Provide high-resolution master PNG asset (minimum 512x512px) to avoid upscaling artifacts.

---

## 7. Registration Wizard UI Flow & Reordering
### Problem & Context
The "+ Add Family Member" button was placed above existing member forms, causing visual disconnect before completing the Head's details.

### Specifications
1. **Natural Bottom Flow**:
   - Move the "+ Add Another Family Member" button to the bottom of the member list in Step 3.
   - Position it immediately above the "Save & Proceed to Final Review" action bar.

---

## 8. Transactional PDF ID Generation & Download Reliability
### Problem & Context
Certain mobile browsers (iOS Safari standalone mode) struggle with dynamic blob downloads or missing content headers.

### Specifications
1. **Streaming PDF Endpoint (`/api/pass/pdf`)**:
   - Set robust response headers:
     - `Content-Type: application/pdf`
     - `Content-Disposition: attachment; filename="ID_Card_[Full_Name].pdf"`
     - `Cache-Control: private, no-cache, no-transform`
2. **CR80 Lanyard Pass Alignment**:
   - Vector SVG badges, Times-Bold royal typography, and high-contrast gold accents.
   - Displays the standardized Serial Number (`MAFL-000-000-000`).

---

## 9. Standardized Serial Number Hierarchy (`MAFL-000-000-000`)
### Problem & Context
Previously, random alphanumeric codes (e.g., `AGR-2026-X8K9`) were generated. The Foundation requires a unified 9-digit hierarchical serial format.

### Specifications
1. **Serial Number Structure**:
   - **Format: `MAFL-XXX-XXX-XXX`** (e.g., `MAFL-001-000-042`).
2. **Database Alignment**:
   - Add `serial_no VARCHAR(32) UNIQUE` to `households` table.
   - Maintain sequential/hierarchical generation logic in `src/actions/register.ts` and `src/lib/db.ts`.
3. **Presentation Contract**:
   - All user-facing interfaces (Lanyard Card, PDF pass, directory card, admin moderation queue, SMS/email alerts) display exclusively the `MAFL-000-000-000` serial format.

---

## 10. Database Schema Delta (`src/db/schema.sql`)

```sql
-- Schema Migration Delta for Platform Overhaul
ALTER TABLE households 
  ADD COLUMN IF NOT EXISTS serial_no VARCHAR(32) UNIQUE,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS full_address TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_number TEXT,
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS govt_id_number TEXT;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS profession_title TEXT,
  ADD COLUMN IF NOT EXISTS profession_description TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_number TEXT,
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS govt_id_number TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS full_address TEXT;

CREATE INDEX IF NOT EXISTS idx_households_serial_no ON households(serial_no);
```

---

## 11. Verification & Quality Gates
1. **Automated Seam Tests**: `node tests/seams.test.mjs` must execute and pass all 9/9 architectural contracts.
2. **Next.js Production Build**: `npm run build` must compile cleanly with 0 TypeScript and 0 ESLint errors.
3. **Manual Validation Checklist**:
   - [ ] Wizard runs with 4 clean steps (Contact -> Gotra -> Members & IDs -> Review & Submit).
   - [ ] Country = India prompts for Aadhaar & PAN; Country = Singapore/USA prompts for Passport & Govt ID.
   - [ ] Serial number `MAFL-XXX-XXX-XXX` is issued and rendered on ID cards and PDFs.
   - [ ] Phone and email are permanently masked on public directory and search results.
   - [ ] Responsive UI verified on mobile (320px - 430px) and desktop (1440px).
