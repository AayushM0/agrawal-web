# Task List: Comprehensive Platform Overhaul

## Phase 1: Foundation (Database & Types)
- [ ] **Task 1: Database Schema, Types & ORM Layer**
  - **Description:** Update `src/db/schema.sql`, `src/types/household.ts`, and `src/lib/db.ts` to add `serial_no`, `country`, `postal_code`, `state`, `city`, `full_address`, `profession_title`, `profession_description`, `aadhaar_number`, `pan_number`, `passport_number`, `govt_id_number`.
  - **Acceptance Criteria:**
    - Schema contains new columns with non-breaking defaults.
    - `db.createHousehold` generates structured serial number `MAFL-000-000-000`.
    - Type definitions align with frontend and server actions.
  - **Files:** `src/db/schema.sql`, `src/types/household.ts`, `src/lib/db.ts`.

## Phase 2: Location & Dialing Components
- [ ] **Task 2: Cascading LocationSelector & International Phone Input**
  - **Description:** Upgrade `src/components/LocationSelector.tsx` to handle Country -> Postal/PIN Code -> State -> City -> Full Address, and provide dynamic dialing codes (`+91`, `+65`, `+1`, `+971`, etc.).
  - **Acceptance Criteria:**
    - Country selection cascades into State and City.
    - Postal code input and Full Address multi-line textarea included.
    - International phone code updates automatically with country choice.
  - **Files:** `src/components/LocationSelector.tsx`, `src/lib/phone.ts`.

## Phase 3: Registration Wizard
- [ ] **Task 3: Registration Wizard & Server Action Overhaul**
  - **Description:** Refactor `src/app/signup/page.tsx` and `src/actions/register.ts`.
  - **Acceptance Criteria:**
    - Wizard reduced from 5 steps to 4 (Step 4 Privacy configuration removed).
    - "+ Add Family Member" button moved to the bottom of the member form.
    - Mandatory validation on Profile Picture, Name, Father Name, Gender, Marital Status, DOB, Native Place, Full Address.
    - Country = India renders Aadhaar & PAN fields; Country != India renders Passport & Govt ID fields.
    - Profession section includes 1-line description and placeholder example.
    - Optional phone for family members with claim link generation or Head-login fallback.
  - **Files:** `src/app/signup/page.tsx`, `src/actions/register.ts`.

## Checkpoint: Core Registration (Tasks 1-3)
- [ ] Registration flow creates household and members with all new fields in DB.

## Phase 4: Privacy Masking, Age & Logo
- [ ] **Task 4: Universal Contact Masking, Dynamic Age & Logo Sharpness**
  - **Description:** Mask contact details in `src/app/directory/page.tsx`, `src/app/directory/[id]/page.tsx`, and `src/app/dashboard/page.tsx`. Calculate dynamic age from `dob`. Optimize `<Image>` in `MainHeader.tsx` and `RoyalFooter.tsx`.
  - **Acceptance Criteria:**
    - Contacts display masked (`+91 ••••••3210`, `r•••••l@example.com`).
    - Age rendered dynamically as `[X] yrs`.
    - Logo rendered with high-DPI quality and sharp contrast styling.
  - **Files:** `src/app/directory/page.tsx`, `src/app/directory/[id]/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/layout/MainHeader.tsx`, `src/components/layout/RoyalFooter.tsx`.

## Phase 5: PDF ID Pass & Admin Moderation
- [ ] **Task 5: Serial Number PDF ID Card & Moderation Queue**
  - **Description:** Update `src/components/PassPDF.tsx`, `src/app/api/pass/pdf/route.ts`, and `src/app/admin/moderation/page.tsx`.
  - **Acceptance Criteria:**
    - PDF ID card renders `MAFL-000-000-000` serial format with vector SVG elements.
    - Admin moderation queue displays full address and government IDs for verification audits.
  - **Files:** `src/components/PassPDF.tsx`, `src/app/api/pass/pdf/route.ts`, `src/app/admin/moderation/page.tsx`, `src/app/dashboard/pass/LanyardPassClient.tsx`.

## Final Checkpoint & Verification
- [ ] `node tests/seams.test.mjs` passes 9/9 seams.
- [ ] `npm run build` compiles with 0 errors.
