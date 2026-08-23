# ADR-0003: Hierarchical Serial Number Format & Dependent Auth

## Status
Accepted

## Context
The platform initially generated unstructured random codes (e.g. `AGR-2026-X8K9`). The Foundation requires a unified 9-digit hierarchical serial numbering standard (`MAFL-000-000-000`). Additionally, dependent family members (children, elderly) often do not have personal phone numbers.

## Decision Drivers
- **Institutional Branding**: A structured serial number format (`MAFL-XXX-XXX-XXX`) provides consistent official identification across ID cards, PDF certificates, and moderation records.
- **Flexible Family Representation**: Households must be able to register children and elderly relatives without requiring fake or duplicate phone numbers.

## Decision
1. Standardize all issued household codes to `MAFL-000-000-000` (e.g., `MAFL-001-000-042`).
2. Add `serial_no VARCHAR(32) UNIQUE` to the PostgreSQL `households` schema.
3. Dual-track family member authentication:
   - **With Phone**: Issue a unique claim token and shareable WhatsApp/SMS claim link for independent login.
   - **Without Phone**: Dependents are linked to the Head of Household and authenticated via the Head’s verified credentials.

## Consequences
### Positive
- Clean, official serial numbers on all physical and digital passes.
- Dependents are fully included without blocking registration on missing phone numbers.
