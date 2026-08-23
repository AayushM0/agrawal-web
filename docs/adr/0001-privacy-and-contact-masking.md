# ADR-0001: Default Contact Masking & Dynamic Age Computation

## Status
Accepted

## Context
Previously, Step 4 of the registration wizard offered users choices between `members_only`, `public_to_members`, and `hidden` for their contact details. This added registration friction and introduced potential privacy exposure of personal phone numbers and emails on the directory. Furthermore, static age numbers risked becoming stale.

## Decision Drivers
- **Absolute Privacy**: Personal contact details of community members must not be harvestable or visible to unauthorized scrapers or general visitors.
- **Frictionless Onboarding**: Eliminating redundant privacy configuration steps shortens registration from 5 steps to 4.
- **Temporal Accuracy**: Age must be calculated dynamically from the verified Date of Birth rather than stored as a static integer.

## Decision
1. Remove Step 4 (Privacy Preferences) from the registration wizard.
2. Enforce permanent string masking on all phone numbers (`+91 ••••••3210`) and email addresses (`r•••••l@example.com`) in all directory search results, member profile pages, and dashboard cards.
3. Calculate age dynamically at render time using `dob`.

## Consequences
### Positive
- Zero risk of phone number or email scraping from public directory views.
- Streamlined 4-step registration wizard improves onboarding completion rates.
- Age displays accurately without manual profile updates.

### Negative / Trade-offs
- Members cannot share raw unmasked phone numbers directly in the public directory; communication happens through verified community channels.
