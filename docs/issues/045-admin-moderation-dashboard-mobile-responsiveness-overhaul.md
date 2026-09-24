# Issue 045: Admin Moderation Dashboard Mobile Responsiveness Overhaul

## What to build
Overhaul the layout and responsiveness of `src/app/admin/moderation/page.tsx` so the entire admin portal renders fluidly on all viewport widths (from 320px mobile to wide desktop screens). Implement horizontal touch scrolling on the 7-tab filter bar so buttons do not wrap awkwardly or clip off-screen. Apply responsive min-widths and word-breaking to table columns across Incomplete Signups and Email Queue views, ensure household card action buttons wrap cleanly, and make the Rejection Modal touch-friendly and scrollable on small screens.

## Acceptance criteria
- [ ] Top filter tabs container has horizontal smooth scrolling (`overflow-x-auto min-w-max no-scrollbar`) on mobile/tablet viewports so all 7 tabs are accessible without clipping.
- [ ] Tables in Incomplete Signups and Email Queue use appropriate column min-widths (`min-w-[120px]`, `min-w-[150px]`) and horizontal scrolling containers to prevent column crushing on screens < 768px.
- [ ] Household card action buttons (`Approve`, `Reject`, `Resend ID Passes`, `Download Pass`) wrap gracefully with touch-friendly tap targets (`min-h-[38px]`).
- [ ] Member breakdown cards inside family rows render responsively in single-column on mobile and dual-column on tablet/desktop.
- [ ] Rejection modal is centered, responsive (`max-w-md w-full max-h-[90vh] overflow-y-auto`), and fully functional on 320px-375px viewports.

## Blocked by
- None
