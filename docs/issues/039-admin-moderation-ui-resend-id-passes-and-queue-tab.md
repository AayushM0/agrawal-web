# Issue 039: Admin Moderation UI "Resend ID Passes" & Email Queue Health Tab

## What to build
Enhance `src/app/admin/moderation/page.tsx` with delivery feedback and management controls:
1. Render a **"✉️ Resend ID Passes"** action button on all `live` approved household cards.
2. Add an **"Email Queue"** tab displaying live pending, sent, and failed email counts, recent delivery logs, and a one-click "Retry Failed Emails" button.
3. Show progress indicator during bulk queue draining.

## Acceptance criteria
- [ ] Approved household cards in the moderation queue feature a working "Resend ID Passes" button with busy feedback.
- [ ] "Email Queue" tab shows accurate metrics (pending, sent, failed) and recent delivery attempts.
- [ ] Admins can click "Retry Failed Emails" to reset failed jobs back to pending.
- [ ] All 6 existing tabs, styling, filters, and modal interactions are strictly preserved.

## Blocked by
- Issue 038 (Moderation Approval Email Queue Integration & Admin Resend Action)
