## What to build

Remediate High (VULN-003) and Medium (VULN-004, VULN-005) security vulnerabilities, and establish automated regression tests for the entire security hardening suite.

- In `src/app/api/pass/pdf/route.ts`:
  - Enforce ownership check: verify that the requesting session is an Admin, or belongs to the same household as the requested `memberId` (`household.headUserId === session.userId` or `member.phone === session.contact` / `member.email === session.contact`). Return 403 Forbidden for unauthorized download attempts.
- In `src/middleware.ts`:
  - Remove hardcoded default secret fallback: fail closed if `process.env.AUTH_SECRET` is unset.
- In `src/app/api/location/pincode/route.ts`:
  - Validate `country` parameter against `/^[A-Za-z]{2}$/` regex before interpolating into upstream URL to prevent SSRF / parameter traversal.
- In `tests/security-remediation.test.mjs`:
  - Add comprehensive automated test suite verifying all 5 security fixes and authorization barriers.

## Acceptance criteria

- [ ] `/api/pass/pdf` returns `403 Forbidden` when an authenticated user attempts to download an ID pass for a member from a different household
- [ ] `/api/location/pincode` rejects malformed or non-alpha2 country parameters with 400 Bad Request
- [ ] `middleware.ts` contains zero hardcoded fallback secrets
- [ ] Automated security test suite (`tests/security-remediation.test.mjs`) and seam tests (`tests/seams.test.mjs`) pass 100%
- [ ] Production build (`npm run build`) compiles cleanly

## Blocked by

- docs/issues/011-admin-moderation-guard-and-pii-sanitization.md
