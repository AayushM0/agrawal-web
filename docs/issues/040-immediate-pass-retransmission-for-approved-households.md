# Issue 040: Immediate Pass Retransmission for Approved Households

## What to build
Provide a standalone, reliable execution script `scripts/dispatch-approved-passes.mjs` that loads the 3 households approved today (Yashwant Kisandas Agarwal, Sunil Kumar, Umesh Kumar Gupta), generates binary ID pass PDFs for all registered members, and dispatches them via the resilient email queue/dispatcher with live Resend verification.

## Acceptance criteria
- [ ] Retransmits official ID passes with attached PDFs to:
  - `ykagarwal72@gmail.com` (Yashwant Kisandas Agarwal, 4 members)
  - `kumarsunil71831@gmail.com` (Sunil Kumar, 1 member)
  - `umesh.gupta1358@gmail.com` (Umesh Kumar Gupta, 2 members)
- [ ] Confirms Resend API returns HTTP 200 with non-empty Message IDs for each email.
- [ ] Logs confirmation details with message IDs and timestamps.

## Blocked by
- Issue 038 (Moderation Approval Email Queue Integration & Admin Resend Action)
