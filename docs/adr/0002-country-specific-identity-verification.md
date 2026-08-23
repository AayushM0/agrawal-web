# ADR-0002: Country-Specific Government Identity & Access Control

## Status
Accepted

## Context
Community members reside globally across India, Singapore, USA, UAE, UK, etc. Different jurisdictions issue distinct official identifiers. In India, Aadhaar and PAN are standard; for NRI/international members, Passports and national IDs (NRIC, SSN, Emirates ID) are standard.

## Decision Drivers
- **Authenticity & Anti-Fraud**: Registration must require genuine national identification to maintain high community trust.
- **Global Inclusivity**: The registration flow must adapt intelligently to the applicant’s country of residence.
- **Strict Data Confidentiality**: Government ID numbers are sensitive personal data and must never be exposed publicly.

## Decision
1. Dynamically render identity input fields based on the selected country:
   - India: Aadhaar Number (12 digits, formatted `XXXX-XXXX-XXXX`) and PAN Number (10 alphanumeric characters).
   - International: Passport Number and Government Issued National ID / Tax ID.
2. Store these credentials in protected database columns (`aadhaar_number`, `pan_number`, `passport_number`, `govt_id_number`).
3. Restrict visibility exclusively to authenticated administrators within `/admin/moderation`. Never return these columns in public search API payloads.

## Consequences
### Positive
- Accurate, fraud-resistant verification tailored to both domestic and international Agarwal families.
- Complies with data minimization and confidentiality best practices.
