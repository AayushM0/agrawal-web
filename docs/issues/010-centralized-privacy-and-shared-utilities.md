## What to build

Consolidate all contact masking, government ID masking, age calculation, and server-side profile sanitation logic into a centralized `src/lib/privacy.ts` module, and eliminate duplicated utility code across frontend pages.

- Create `src/lib/privacy.ts` exporting:
  - `calculateAge(dob?: string): number | null`
  - `maskPhone(phone?: string): string`
  - `maskEmail(email?: string): string`
  - `maskGovtId(id?: string): string`
  - `maskContact(contact?: string): string`
  - `sanitizeMemberProfile(member: any, session: SessionData | null): any`
- Replace duplicated local function declarations in:
  - `src/app/signup/page.tsx`
  - `src/app/directory/page.tsx`
  - `src/app/directory/[id]/page.tsx`
  - `src/app/dashboard/page.tsx`
- Ensure zero breaking changes or regressions across all views.

## Acceptance criteria

- [ ] `src/lib/privacy.ts` is created with complete TypeScript types and unit tests
- [ ] Duplicated masking and age helper functions are removed from `signup`, `directory`, `directory/[id]`, and `dashboard` pages
- [ ] Age calculation and contact masking behave identically across all pages
- [ ] Next.js build (`npm run build`) passes with zero TypeScript errors

## Blocked by

None - can start immediately
