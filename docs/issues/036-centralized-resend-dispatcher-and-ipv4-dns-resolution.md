# Issue 036: Centralized Resend Dispatcher & IPv4 DNS Resolution

## What to build
Enforce module-level `ipv4first` DNS resolution in Node.js Undici fetch and provide a unified, resilient Resend API dispatch client with rate-limit pacing ($\ge 600\text{ms}$ throttle), request timeout AbortController (15s), and retry classification. Preserves the exact export and contract of `sendMessageRequestNotificationEmail` in `src/lib/email.ts` to satisfy Seam 14.

## Acceptance criteria
- [ ] Enforces `dns.setDefaultResultOrder("ipv4first")` at the module level.
- [ ] Direct `fetch("https://api.resend.com/emails")` succeeds in $<300\text{ms}$ over IPv4 without `UND_ERR_CONNECT_TIMEOUT`.
- [ ] Outbound requests enforce a minimum interval of $600\text{ms}$ between calls.
- [ ] `sendMessageRequestNotificationEmail` in `src/lib/email.ts` remains intact, functional, and passes existing Seam 14 tests.

## Blocked by
None - can start immediately
