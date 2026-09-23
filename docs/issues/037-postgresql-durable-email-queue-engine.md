# Issue 037: PostgreSQL Durable Email Queue Engine (`email_queue`)

## What to build
Implement the persistent `email_queue` table in Supabase PostgreSQL via `ensureSchema` in `src/lib/db.ts`. Provide concurrency-safe queue CRUD methods using `SELECT ... FOR UPDATE SKIP LOCKED` for atomic job claiming, exponential backoff retries for HTTP 429 and network failures, and terminal failure transitions for malformed HTTP 422 recipient addresses.

## Acceptance criteria
- [ ] Table `email_queue` created safely and idempotently via `ensureSchema` in `src/lib/db.ts` with compound index on `(status, scheduled_for, created_at)`.
- [ ] Method `db.enqueueEmail(job)` inserts jobs with `status = 'pending'`.
- [ ] Method `db.claimNextEmailJob()` claims the next ready job atomically using `FOR UPDATE SKIP LOCKED`.
- [ ] Method `db.markEmailSent(id, resendId)` updates status to `'sent'`.
- [ ] Method `db.markEmailFailed(id, error, retryDelaySec)` retries with exponential backoff on retryable errors, or marks `'failed'` immediately on terminal 422 errors.
- [ ] Method `db.getEmailQueueStats()` returns real-time counts of pending, sent, and failed items.

## Blocked by
- Issue 036 (Centralized Resend Dispatcher & IPv4 DNS Resolution)
