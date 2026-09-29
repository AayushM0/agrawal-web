# Detailed Findings

## Critical: Arbitrary session minting through exported `createSession`

`createSession` in `src/actions/auth.ts` re-exports the cookie-writing action from `src/actions/session.ts`. Because it is exported from a Server Action module and accepts caller-supplied `SessionData`, an unauthenticated caller can dispatch it directly and choose the user ID, role, contact, activation state, and household status. It writes a signed 30-day `auth_session` cookie. This defeats the application's role boundary, including admin access.

Remediation: make the session writer private (not exported from any Server Action module); have authentication flows call it only after their own proof checks; never accept role, user ID, contact, or activation state from a client-callable action.

## High: Account takeover through `loginWithVerifiedContact`

`loginWithVerifiedContact` in `src/actions/auth.ts` accepts a supplied email/phone, resolves the account, and creates a session without password, OTP, Turnstile, or a prior server-side verified challenge. A caller who knows a live user's contact can obtain that user's session and use their dashboard privileges.

Remediation: remove the exported action or require a server-side verified OTP challenge bound to the normalized contact before creating a session. Set activation state only from the authoritative account record.

## High: Stored XSS through business social links

Business creation and update accept arbitrary `socialLinks`, persist them unchanged, and the public business page renders them into raw `href` attributes. A business owner can store a `javascript:` URL; a visitor who clicks the public social link executes attacker-controlled JavaScript in the application origin.

Remediation: validate/canonicalize every social URL server-side to HTTPS URLs (and optionally the intended platform host), omit invalid URLs, and retain a rendering-time scheme allowlist as defense in depth.
