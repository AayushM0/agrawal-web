# Product Requirements Document (PRD): Maharaja Agrasen Foundation Platform Overhaul

## Problem Statement
The Maharaja Agrasen Foundation Global Directory platform currently presents several friction points and privacy risks for global community members:
1. Contact details (phone and email) can potentially be exposed or configured in confusing ways, creating data harvesting concerns.
2. Location and residential address capture is unstructured, resulting in missing postal codes, unclear district lines, and incomplete street addresses.
3. Domestic (India) and international (Singapore, USA, UAE, etc.) community members have differing national identity frameworks, but the platform does not branch identity verification accordingly.
4. Dependent family members without personal mobile phones cannot be easily onboarded, while members who do have mobile numbers lack a frictionless self-claim mechanism.
5. The issued household tracking numbers are unstructured rather than adhering to the official institutional 9-digit hierarchical serial format (`MAFL-000-000-000`).
6. Visual assets such as the brand logo suffer from high-DPI raster blurriness, and the registration wizard layout features disjointed button positioning.

## Solution
An end-to-end platform overhaul that:
1. Enforces permanent masking on all public and member-facing contact fields (`+91 ••••••3210`, `r•••••l@example.com`) while computing dynamic age from Date of Birth.
2. Introduces a structured 5-tier cascading location selector (Country -> Postal Code -> State -> City -> Full Address) with dynamic international dialing codes.
3. Dynamically branches government identity verification (Aadhaar & PAN for India; Passport & National ID for international residents), encrypted with admin-only audit access.
4. Provides dual-track dependent representation: independent self-claim link for members with phone numbers, and direct Household Head authentication for members without phones.
5. Standardizes all issued identity codes to the institutional `MAFL-000-000-000` serial format across the database, dashboard, and downloadable PDF passes.
6. Fixes visual rendering quality on high-DPI displays and streamlines the registration wizard into a 4-step top-to-bottom flow.

## User Stories

1. As a community member, I want my phone number and email address to remain permanently masked on public search and member directory pages, so that my personal contact details are protected from scraping and spam.
2. As a directory user, I want to see an automatically computed age (e.g., "28 yrs • Adult") next to each member's profile, so that I have accurate age context without relying on manual updates.
3. As an applicant, I want to select my country first so that the form automatically adapts with the correct state, city, postal code format, and international phone code.
4. As an applicant entering my postal/PIN code, I want the system to help prefill or filter the applicable state and city, so that I can complete my location quickly without spelling errors.
5. As an applicant, I want a dedicated multi-line text field for my complete residential address (street, building/flat, landmark), so that my household's physical records are complete.
6. As a professional, I want to provide a 1-line description of my specialization alongside my profession title, with helpful examples shown beneath the input, so that fellow community members understand my expertise.
7. As an Indian resident registering my family, I want to provide my Aadhaar and PAN numbers securely, so that my community membership is authentically verified against domestic standards.
8. As an international/NRI member registering from abroad (e.g. Singapore, USA, UAE), I want to provide my Passport and local National/Tax ID, so that I can be verified without needing Indian-specific documents.
9. As a verified administrator, I want to inspect submitted government ID numbers and full residential addresses within the moderation queue, so that I can make informed approval decisions while keeping sensitive data hidden from regular visitors.
10. As a household head registering children or non-tech elderly parents, I want phone numbers and emails to be optional for secondary members, so that missing devices do not block our family registration.
11. As a working family member whose phone number is registered, I want to receive an individual claim link via WhatsApp or SMS, so that I can verify and manage my own profile independently.
12. As a dependent family member without a mobile phone, I want my identity pass and records to be accessible via the household head's verified phone login, so that our family records stay unified.
13. As an applicant on the member details form, I want the "+ Add Another Family Member" button to be located at the bottom of the page right above the continue button, so that the workflow follows a natural top-to-bottom reading order.
14. As an approved member, I want my downloadable lanyard ID pass and PDF to feature the official `MAFL-000-000-000` serial number format, so that my community credentials have an official institutional appearance.
15. As a mobile website visitor, I want the Maharaja Agrasen Foundation logo to appear crisp and sharp on high-DPI Retina screens without pixelation, so that the platform maintains high visual prestige.

## Implementation Decisions

1. **Wizard Step Reduction**: Step 4 (Privacy Preferences) is removed entirely from the registration workflow. The wizard now executes in 4 focused steps:
   - Step 1: Contact OTP Authentication (International Mobile / Email).
   - Step 2: 18 Gotras Selection & Ancestral Native Place (मूल निवास).
   - Step 3: Household Head & Family Members Profile, Cascading Location, Profession, and Country-Specific Government IDs.
   - Step 4: Summary Review, Community Consent Agreement & Final Submission.

2. **Permanent Data Masking Contract**:
   - In all public directory and search responses, raw phone and email strings are masked before presentation (`+91 ••••••[last4]`, `[first1]•••••[last1]@[domain]`).
   - Government ID numbers (Aadhaar, PAN, Passport, Govt ID) are strictly excluded from public directory endpoints and returned only to authenticated admin sessions in the moderation queue.

3. **Cascading Location & Dialing Architecture**:
   - Component state cascades from `Country` -> `Postal Code` -> `State` -> `City` -> `Full Address`.
   - International dialing codes (`+91`, `+65`, `+1`, `+971`, `+44`, etc.) bind dynamically to the selected country ISO code.

4. **Hierarchical Serial Number Model**:
   - Standardized format: `MAFL-XXX-XXX-XXX` (9-digit hierarchical serial, e.g., `MAFL-001-000-042`).
   - Backed by `serial_no VARCHAR(32) UNIQUE` in PostgreSQL.

5. **Database Schema Enhancements**:
   - Added `serial_no`, `country`, `postal_code`, `state`, `city`, `full_address`, `aadhaar_number`, `pan_number`, `passport_number`, and `govt_id_number` columns to `households` and `members` tables with non-breaking defaults.

6. **High-DPI Asset & Contrast Optimization**:
   - Configured Next.js image scaling with `quality={95}` and CSS `-webkit-optimize-contrast` hardware acceleration to eliminate raster blur.

## Testing Decisions

1. **Behavioral Architectural Seams**:
   - The test suite (`tests/seams.test.mjs`) validates high-level architectural contracts without testing ephemeral implementation details:
     - Seam 1: Navigation and header overflow containment.
     - Seam 2: Database DDL schema columns (`serial_no`, address, and identity fields).
     - Seam 3: Complete 18 Gotras dataset integrity.
     - Seam 4: Privacy masking contracts and server action validation rules.
     - Seam 5: OTP generation, cryptographic hashing, and rate limiting.
     - Seam 6: Explicit error propagation in database connection layers.
     - Seam 7: Cryptographic salt/secret safety (no insecure fallbacks).
     - Seam 8: Native fetch dispatch for global messaging without bloated SDKs.
     - Seam 9: Next.js root error boundaries.

2. **Full Production Compilation**:
   - Zero-tolerance rule for TypeScript or ESLint compiler errors via `npm run build`.

## Out of Scope

1. Biometric verification integrations (e.g. direct UIDAI Aadhaar OTP gateway). Government IDs are verified manually by administrators in the moderation queue.
2. Real-time courier tracking for physical plastic card deliveries.
3. Multi-language UI translations beyond English and Hindi script terms.

## Further Notes
All modifications respect existing Architecture Decision Records ([ADR-0001](adr/0001-privacy-and-contact-masking.md), [ADR-0002](adr/0002-country-specific-identity-verification.md), and [ADR-0003](adr/0003-hierarchical-serial-number-and-claim-auth.md)).
