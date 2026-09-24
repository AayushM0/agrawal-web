# Issue 043: Admin Pass Direct Download & Member Selection

## What to build
Provide a direct **"📥 Download Pass"** button directly beside the **"✉️ Resend ID Passes"** button on approved household cards in the admin moderation dashboard. For single-member households, clicking it immediately downloads the official PDF pass. For multi-member families, provide an intuitive dropdown menu allowing the admin to select and download any family member's pass individually. In addition, place a quick `📥 Pass` download button on each individual member card in the family breakdown.

## Acceptance criteria
- [ ] Approved ("Live") household cards display a **"📥 Download Pass"** button beside **"✉️ Resend ID Passes"**.
- [ ] For single-member households, clicking initiates direct download of `/api/pass/pdf?memberId={memberId}`.
- [ ] For multi-member households, clicking toggles an accessible dropdown listing each family member with relation and download action.
- [ ] Each family member card in the member breakdown includes an individual `📥 Pass` download button.
- [ ] Proper `download` attributes and standard `Content-Disposition: attachment` headers are used for native browser saving.

## Blocked by
- Issue 041 (Serverless PDF Font Tracing & Fallback Resilience)
