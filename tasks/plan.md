# Implementation Plan: Comprehensive Platform Overhaul

## Overview
This implementation plan outlines the architecture, data models, vertical task slices, and verification checkpoints for implementing all 9 requirements from `changes.md`.

## Architecture Decisions
- [ADR-0001: Default Contact Masking & Dynamic Age Computation](../docs/adr/0001-privacy-and-contact-masking.md)
- [ADR-0002: Country-Specific Government Identity & Access Control](../docs/adr/0002-country-specific-identity-verification.md)
- [ADR-0003: Hierarchical Serial Number Format & Dependent Auth](../docs/adr/0003-hierarchical-serial-number-and-claim-auth.md)

## Task List & Phasing

### Phase 1: Database Schema & Data Access Layer
- [ ] **Task 1**: Update PostgreSQL schema (`src/db/schema.sql`) and `src/lib/db.ts` to support `serial_no` (`MAFL-000-000-000`), address fields, and government IDs (Aadhaar, PAN, Passport, Govt ID).

### Phase 2: Cascading Address Selector & International Dialing
- [ ] **Task 2**: Enhance `src/components/LocationSelector.tsx` with Country -> Postal Code -> State -> City -> Full Address cascade and international dialing prefixes.

### Phase 3: Registration Wizard & Server Action Overhaul
- [ ] **Task 3**: Overhaul `src/app/signup/page.tsx` and `src/actions/register.ts` (4-step wizard, bottom add-member button, country-branching government IDs, 1-line profession description, and optional dependent phone claim auth).

### Checkpoint: Registration Flow
- [ ] Household registration completes cleanly; serial number `MAFL-XXX-XXX-XXX` issued; address and IDs persisted in PostgreSQL.

### Phase 4: Privacy Masking, Dynamic Age & Logo Crispness
- [ ] **Task 4**: Implement universal phone/email masking and dynamic age calculation across directory and dashboard, and optimize header/footer logo rendering.

### Phase 5: ID Pass PDF, Downloads & Admin Moderation
- [ ] **Task 5**: Update `src/components/PassPDF.tsx`, `/api/pass/pdf`, and `src/app/admin/moderation/page.tsx` with the new serial number, address, and admin-only government ID inspection.

### Checkpoint: Verification & Build
- [ ] Seams tests pass (`node tests/seams.test.mjs`), production build compiles cleanly (`npm run build`).

## Risks and Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Postal code lookup failure for obscure regions | Low | Provide flexible fallback to manual state/city selection |
| Government ID data exposure | High | Never expose Aadhaar/Passport fields in public search APIs or JSON payloads |
| Existing database records missing new columns | Medium | Use `ADD COLUMN IF NOT EXISTS` with safe defaults |
