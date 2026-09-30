# Issue 051: Registration Email Input Hardening and Mistake Prevention

## What to build

Harden every email field in the household registration journey so obvious mistakes are stopped before submission without pretending to prove mailbox ownership or adding a new email-provider integration.

Normalize emails consistently for comparison and duplicate checks (trim surrounding whitespace; use a canonical lower-case comparison form), reject malformed or unsafe input on both client and server, and give a clear confirmation prompt for likely consumer-domain typos such as `gmial.com`. Suggestions must never silently rewrite the address. Keep the existing email confirmation/OTP flow as the only mechanism that activates an account or proves inbox access.

Apply the same validation contract to the Head's verified-contact email and every member email collected during registration. Support internationalized domain names safely; do not impose a simplistic regex that rejects valid international addresses. Do not add SMTP mailbox probing, third-party email-verification services, or a new OTP channel.

## Acceptance criteria

- [ ] Registration email inputs trim surrounding whitespace and reject empty values, control characters, display-name syntax, multiple `@` signs, malformed domains, and values exceeding standard email length limits on both client and server.
- [ ] Duplicate-contact checks use the same canonical email comparison form as registration validation.
- [ ] Likely common domain typos present a clear, accessible confirmation/suggestion before the user advances; accepting a suggestion is explicit and declining it preserves the entered address.
- [ ] Valid internationalized email domains remain supported after safe normalization.
- [ ] The UI makes no claim that syntax or domain checks prove an inbox exists; account activation remains bound to the existing registered-email confirmation.
- [ ] Focused regression tests cover malformed input, whitespace/case normalization, duplicate variants, typo-confirm/decline behavior, and valid internationalized addresses.
- [ ] TypeScript and production build pass.

## Blocked by

None - can start immediately.

## Triage Metadata

- **Category**: `security` / `enhancement`
- **State**: `ready-for-agent`
- **Scope boundary**: Does not change the planned admin-authorized correction or account-recovery workflow.
