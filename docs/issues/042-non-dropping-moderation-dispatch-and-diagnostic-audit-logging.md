# Issue 042: Non-Dropping Moderation Dispatch & Diagnostic Audit Logging

## What to build
Harden `notifyHouseholdMembers` and `resendHouseholdPassAction` in `src/actions/moderate.ts` so approval emails are never dropped when attachments are empty, and exact dispatch metrics are returned to the caller. Catch individual member PDF rendering errors, log them as structured `PASS_GENERATION_WARNING` records in `admin_audit_logs`, and dispatch the approval email with assigned serial numbers and online dashboard pass links.

## Acceptance criteria
- [ ] `notifyHouseholdMembers` enqueues approval emails whenever `primaryEmail` exists, regardless of whether `allAttachments.length > 0`.
- [ ] In the event of a PDF generation warning, the email body informs the recipient that passes are accessible online at `/dashboard/pass`.
- [ ] Individual PDF rendering failures are captured with error messages and logged to `admin_audit_logs` under action `PASS_GENERATION_WARNING`.
- [ ] `resendHouseholdPassAction` returns accurate metrics: `{ success, enqueuedCount, attachmentsCount, memberCount, errors, message }`.
- [ ] If no emails could be enqueued (e.g. phone-only household), `resendHouseholdPassAction` returns clear explanatory feedback rather than false success.

## Blocked by
- Issue 041 (Serverless PDF Font Tracing & Fallback Resilience)
