# Security Audit Report

## Verdict

Three confirmed vulnerabilities were remediated after this audit. The generated Server Action manifest no longer contains the insecure session actions.

| Severity | Finding |
| --- | --- |
| Critical | Exported `createSession` Server Action could mint arbitrary signed sessions. Remediated by moving the writer to a non-action server helper. |
| High | `loginWithVerifiedContact` could sign in any known registered contact. Remediated by deleting the action. |
| High | Business social links could store `javascript:` URLs. Remediated with HTTPS validation on write and render. |

## Positive controls observed

- SQL query values are generally parameterized.
- Chat upload, Pusher authorization, and pass-PDF routes enforce relevant session and ownership checks.
- Identity documents remain write-only and protected by OTP confirmation.

## TDD audit

The focused repair suite passes, but it is source-string based rather than seam/behavior based. It does not prove UI confirmation, authorization, serial reuse, or dialog reachability at a public interface. Replace it with browser/server-action integration coverage after the security fixes.

## Ponytail audit

The repair diff is broadly minimal: native in-app dialogs replace brittle browser confirmations, the existing serial allocator is reused, and no dependencies were added. The global PostgreSQL advisory lock is appropriate for correctness but should carry a short comment documenting its global-throughput ceiling if retained.
