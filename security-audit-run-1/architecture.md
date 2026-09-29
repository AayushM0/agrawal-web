# Security Audit Architecture Summary

The target is a Next.js App Router community platform with Server Actions, PostgreSQL, Supabase storage, Pusher, Twilio, Resend, and Turnstile. It supports public signup, password/OTP login, household management, member claims, admin moderation, businesses, careers, matrimony, support, and private chat.

The primary trust boundary is browser input into Server Actions and API routes. Authentication relies on a signed `auth_session` cookie; authorization is enforced mainly in action-layer session, household, ownership, activation, and role checks. Sensitive entry points include `src/actions/auth.ts`, `src/actions/session.ts`, `src/actions/profile.ts`, `src/actions/business.ts`, `src/actions/account.ts`, `src/actions/chat.ts`, and `src/app/api/**/route.ts`.

The audit found strong controls in parameterized database queries, private chat upload checks, Pusher/PDF authorization, and public-data sanitization. It also found exported session-establishment actions that lack their own authorization checks, plus an unvalidated stored social-link URL rendered to public visitors.

No prior security-audit artifact directory was found. Coverage should be repeated after remediation because this source review does not validate production proxy, secret, or CDN configuration.
