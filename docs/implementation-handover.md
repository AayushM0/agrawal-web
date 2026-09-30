# Implementation Handover

## Purpose

This document records the product decisions, implementation state, QA evidence, failures, fixes, and remaining validation for the profile-authority and business-certificate work. It is intended to let a new task continue from the exact current state without relying on chat history.

## Current repository state

Recent committed milestones:

| Commit | Outcome |
| --- | --- |
| `b647fd6` | Optional government IDs, protected profile changes, email OTP flows, and business verification foundations. |
| `06b5d1c` | Development-only ngrok Turnstile preview-host support. |
| `94ff12f` | Development CSP refresh compatibility. |
| `e23e004` | Dependent-removal authorization and dialog hardening. |
| `f064ddd` | Explicit business manager authority, handover, founder/leadership behavior, and manager-only editing. |

The business certificate lifecycle and its approval-query repair are implemented in the current working tree and are not committed yet.

## Product decisions that must remain stable

### Optional identity documents and profile control

- Aadhaar, PAN, passport, and government/tax IDs are optional worldwide. Supplying one validates its format only; no document authenticity or ownership verification is claimed.
- Sensitive ID changes are separate from ordinary profile edits and require registered-email OTP confirmation. Full values are not returned through ordinary profile APIs.
- The existing admin-issued verified-member badge is independent of optional identity documents and must remain unchanged.
- Phone changes stay unavailable until SMS verification exists. Email changes use a dedicated authenticated, replacement-email OTP flow with old-email notification.

### Business authority

- Each business has an immutable creator audit actor and exactly one current manager.
- Only the manager can edit, pause, delete, or hand over a business. Same-household membership, founder attribution, and primary-contact status do not grant management.
- A handover becomes effective only after the targeted activated member accepts. The previous manager loses access immediately.
- Founder and Director entries are public attribution only. A manual founder never gains account access merely from their listed details.
- Current-manager identity is private. Managers see "You manage this business"; authenticated non-managers see "Managed by another account"; public pages show neither.

### Business certificate lifecycle

- The ornate MAFL certificate design is the source of truth: crest/watermark, MAFL Singapore seal, formal registration text, business name, location, permanent `MAFLBUS-...` serial, and signatory treatment.
- A business has no public temporary number. Approval assigns its permanent `MAFLBUS` serial.
- Certificates are private and dynamic: the next authorized download reflects current live business data. Ordinary edits do not trigger re-moderation, a new email, or a visible certificate version.
- Approval and reapproval create internal issuance records. Approval email contains the PDF attachment and an authenticated dashboard link; delivery is deduplicated across business contact, primary director email, and current manager email.
- Certificate downloads are available only to the current manager or an admin while the business is live and verified. There is no public QR, lookup, download URL, issuance history, or delivery metadata.
- Paused and rejected businesses cannot be newly downloaded. Reapproval creates a fresh internal issuance and queues approval delivery.
- Existing live verified businesses receive additive issuance backfill with no email blast.

## Issue audit trail

### Issue 1: Business manager authority and handover

Implemented in `f064ddd`.

Successes verified in the browser:

- Manager-only controls and saves work.
- Existing businesses were backfilled with manager assignments.
- Non-managers, including founders, do not receive edit, pause, delete, or handover controls.
- Handover invitation, cancellation, acceptance, and immediate former-manager revocation passed.
- Founder attribution remains on the public profile after handover.
- Signed-out edit links redirect to login; stale authorization rendering was corrected.
- Private manager badge, pending-handover text, and inline handover errors were added.

Failures found and fixed during QA:

| Failure | Root cause | Resolution |
| --- | --- | --- |
| Hand Over did nothing | Client invitation handler was not surfacing server behavior correctly. | Dialog action and inline error handling were repaired. |
| Business create skipped Leadership | A step action submitted before the leadership stage. | Creation became a three-step flow; leadership is managed afterward in the manager-only edit page. |
| Invitation appeared silent | Server eligibility failure was not visible. | Inline error now explains that the target must have an activated profile. |
| Manager badge missing for under-review card | Badge lived in the action row, which could be visually constrained by listing state. | Moved badge into private card metadata. |

Known validation limitation:

- Browser expiry testing required a forced-expiry fixture and was not completed from the original QA account. The server expiry guard remains part of the handover contract.

### Issue 2: Private business certificates

Implemented in the current working tree.

Added components and behavior:

- `BusinessCertificatePDF` React-PDF rendering.
- `business_certificate_issuances` and `business_certificate_deliveries` tables with idempotent live-business backfill.
- Approval-time serial/issuance transaction, post-commit PDF generation, durable email queue delivery, and delivery audit rows.
- Protected `/api/businesses/[id]/certificate` route.
- Private manager dashboard/detail download controls.
- Admin approved-business download and resend controls.
- Focused certificate lifecycle regression test included in `npm test`.

Certificate QA before the approval repair:

- Signed-out certificate route returned JSON authorization failure and no PDF. This passed.
- A disposable `QA Cert Flow` business was created in pending review with a contact email matching the manager email, intentionally exercising recipient deduplication after approval.
- Approval could not complete, blocking the rest of certificate QA.

Approval failure and repair:

| Failure | Root cause | Resolution |
| --- | --- | --- |
| `inconsistent types deduced for parameter $1` during approval | The certificate issuance SQL used `$1` as UUID in `VALUES (business_id)` and as text in `business_id::text = $1`. PostgreSQL cannot infer both types for one parameter. | Changed the subquery to `business_id = $1`, keeping `$1` UUID-only. Added a regression assertion that failed before the correction and passes after it. |

## Verification evidence

| Check | Result |
| --- | --- |
| Business authority focused and seam tests | Passed before certificate work. |
| Certificate focused regression | Passed after the UUID parameter repair. |
| Full test suite | `npm test` passed, 50 of 50 tests. |
| TypeScript | `npx tsc --noEmit` passed. |
| Production build | `npm run build` passed with the new certificate route present. |
| Direct Docker database verification | Not completed in the final repair session because Docker Desktop reported itself paused. The running app/build still connected to local PostgreSQL during build. |

## Remaining certificate break testing

Resume with `QA Cert Flow` in pending review:

1. Approve once, then deliberately retry/double-click. Confirm one active issuance, permanent serial assignment, and a single deduplicated email queue recipient when contact equals manager email.
2. Test certificate URL as signed out, unrelated member, same-household non-manager/founder, former manager after handover, current manager, and admin.
3. Change business name/location/contact while live. Download again and confirm current details render without moderation status change or automatic email queue entry.
4. Pause and reject the business. Confirm dashboard/detail UI hides download and direct URL fails. Reapprove and verify a fresh internal issuance plus approval delivery.
5. Test no-recipient and malformed-recipient behavior. Approval must remain successful while delivery failure is recorded.
6. Test resend repeatedly. Each explicit resend may create a new delivery attempt, but recipients must be deduplicated within each attempt.
7. Restart schema initialization twice. Confirm live-business backfill remains idempotent and sends no mail.

## Certificate QA run after approval repair

QA used the disposable business `QA Cert Flow`, later renamed `QA Cert Flow Edited`. It remains live under Ananya's management; no unrelated data was changed.

| Scenario | Result | Evidence |
| --- | --- | --- |
| Approval once | Passed | Listing became live/verified with `MAFLBUS-000-000-001`; manager and admin controls appeared. |
| Approval delivery deduplication before handover | Passed | One queue entry when business contact and manager were Vikram's same email. |
| Manager/admin PDF download | Passed | Both returned real, byte-identical 5091-byte PDFs with expected business name, location, serial, MAFL Singapore header, and signatory text. |
| Dynamic certificate data | Passed | Editing name and location while live did not re-moderate or queue mail; next PDF contained the new details and same serial. |
| Handover authorization | Passed | Former manager received 403 immediately; accepted manager could download; public founder attribution remained unchanged. |
| Pause boundary | Passed | Download controls disappeared and direct route denied download; resume restored access. |
| Signed-out and non-manager route access | Passed | Signed-out received 401; non-manager received 403; neither received a PDF. |
| Resend after handover | Passed, expectation corrected | It queued two recipients: current business contact (Vikram) and current manager (Ananya). This is correct because addresses diverged; deduplication is per normalized address, not per business. |

Blocked validation, not feature failures:

- The admin UI removes the Approve control after approval, so browser QA could not deliberately replay/double-submit approval. Add a server/integration concurrency test for this invariant.
- The admin UI exposes Reject only for pending businesses. QA therefore could not reject an approved listing, reapprove it, or confirm serial behavior after rejection.
- `RESEND_API_KEY` is absent in local development. Queue records were verified, but actual email dispatch remains pending with zero attempts.

Clarifications:

- Manager resend is intentionally unavailable; only admins can resend certificates.
- The ornate PDF's textual content was verified. Its seal and watermark are vector content and still need visual render inspection if pixel-level design approval is required.

## Certificate lifecycle closure update — 30 September 2026

The outstanding certificate implementation gaps are closed:

| Item | Resolution | Verification |
| --- | --- | --- |
| Permanent serial on rejection/reapproval | Rejection now deactivates the issuance and removes the badge without clearing `business_serial_no`; reapproval retains the same `MAFLBUS` value and creates the next internal issuance. | Focused regression test and browser QA passed. |
| Admin reapproval | Rejected businesses remain in an admin-only list with **Reapprove & Restore Certificate**. An owner edit is no longer required. | Production build passed. |
| Certificate visual fidelity | Approved DSK layout restored with crest, supplied metallic verified-business badge, MAFLBUS panel, official website footer, and a seal positioned above the signature line. | Browser PDF QA approved all visual elements except a final seal-centering adjustment. |
| Seal centering | The official seal is centered over the 250-point signature block (`left: 95`) rather than offset to the left. | Focused certificate tests and production build passed; one fresh browser download remains the final visual sign-off. |
| Official MAFL seal asset | Replaced the makeshift CSS circle placeholder with the official MAFL Singapore red ink seal asset (`UEN 202551557G`) with transparency on cream background. | Extracted high-res alpha transparent seal, placed in `public/images/mafl-official-seal.png`, updated renderer, regression tests, and verified downloaded PDF rendering. |
| Obsolete renderer | Removed the unused generic certificate component so the approved renderer is the only dispatch target. | Import search confirmed no remaining reference. |

The remaining operational check is real email delivery after configuring `RESEND_API_KEY`; the application has already been verified to create the correct queue and delivery records.

## Follow-up issue: registration email input hardening

[`Issue 051: Registration Email Input Hardening and Mistake Prevention`](issues/051-registration-email-input-hardening.md) is now part of this implementation audit. It is intentionally separate from certificate delivery and from the future admin-authorized correction/recovery workflow.

- Shared client/server validation will stop malformed, unsafe, and obviously mistyped registration addresses.
- Canonical email comparison will make whitespace/case duplicate variants behave consistently.
- Common-domain suggestions require an explicit user choice and never silently rewrite an address.
- Existing email confirmation remains the only proof that an inbox is controlled by the registrant; syntax/domain checks do not claim otherwise.

## Operational cautions

- Do not manually edit `profile_manager_assignments` to restore access. Use handover acceptance so creator history and manager authority remain correct.
- Do not expose certificate route IDs through public pages or add public verification lookups without a separate product/security design.
- Do not make certificate delivery failure roll back the approved business transaction.
- Do not treat a certificate or optional government ID as member identity verification. The admin verified-member badge remains the only existing member-verification workflow.
- Before merging/deploying the certificate work, rerun the remaining browser break tests above and commit the working-tree changes as one certificate-focused commit.
