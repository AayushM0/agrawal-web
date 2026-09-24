# Issue 044: Admin Dashboard Error Column & Real-Time Diagnostics

## What to build
Add first-class error visibility to the Admin Moderation Dashboard so that failures in PDF generation, email queue delivery, or SMS dispatch are immediately visible to administrators without requiring database or server log inspection. Display dispatch warning/error badges directly on household cards if any issue occurred, expand the Email Queue table with a dedicated "Error Diagnostics" column showing full actionable errors, and provide a "⚠️ Failed Only" filter button in the queue tab.

## Acceptance criteria
- [ ] Household cards in the moderation queue display a prominent warning banner/badge if a pass dispatch or PDF generation warning occurred.
- [ ] The Email Queue table features a dedicated "Error Diagnostics" column with full error details (not truncated).
- [ ] A "⚠️ Failed Only" filter button in the Email Queue tab allows instant isolation of delivery failures.
- [ ] An action to copy error details or view full technical traces is provided for swift reporting and resolution.
- [ ] Errors logged to `admin_audit_logs` are accessible and rendered in real-time in the admin UI.

## Blocked by
- Issue 042 (Non-Dropping Moderation Dispatch & Diagnostic Audit Logging)
