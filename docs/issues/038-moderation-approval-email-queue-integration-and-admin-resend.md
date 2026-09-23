# Issue 038: Moderation Approval Email Queue Integration & Admin Resend Action

## What to build
Integrate the email queue into `src/actions/moderate.ts`, replacing unbounded `Promise.all` raw fetch calls with durable enqueuing. Implement hybrid serverless execution (awaiting up to 6s for single household approvals, enqueuing with chunk draining for bulk approvals). Expose `resendHouseholdPassAction(householdId)` allowing administrators to re-dispatch ID cards for any approved household at any time, and provide the `/api/admin/email-queue/drain` endpoint.

## Acceptance criteria
- [ ] `notifyHouseholdMembers` enqueues primary and individual family pass emails into `email_queue`.
- [ ] Single household approvals await immediate queue draining up to 6s so passes deliver before the serverless container terminates.
- [ ] Bulk approvals (`approveAllHouseholds`) enqueue all passes atomically without hitting Vercel timeouts or Resend 429 errors.
- [ ] `resendHouseholdPassAction(householdId)` allows admins to re-generate and re-enqueue passes for any live approved household.
- [ ] Endpoint `/api/admin/email-queue/drain` drains up to 5-10 items per invocation and reports remaining count.

## Blocked by
- Issue 037 (PostgreSQL Durable Email Queue Engine)
