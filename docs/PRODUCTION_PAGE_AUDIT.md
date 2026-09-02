# Production Page Audit

| Category | Page or state | Status | Evidence | Applicability reason | Required action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Legal | Privacy Policy | EXISTS_AND_ADEQUATE | `web/src/app/privacy/page.tsx` | App handles user data. | Expanded with Singapore jurisdiction, PII processing details, and RLS safeguards. |
| Legal | Terms of Service | EXISTS_AND_ADEQUATE | `web/src/app/terms/page.tsx` | Public service/community directory. | Replaced placeholder duplicated layout with a proper user agreement under Singapore law. |
| Legal | Cookie Policy | EXISTS_AND_ADEQUATE | `web/src/app/cookie-policy/page.tsx` | App uses functional cookies. | Created cookie policy documenting auth session and OTP challenge cookies. |
| Legal | Cookie Preferences | EXISTS_AND_ADEQUATE | `web/src/components/layout/CookieBanner.tsx` | Required to inform users. | Created functional cookie consent banner for essential cookies. |
| Legal | Refund Policy | NOT_APPLICABLE | - | No purchases are made on this platform. | - |
| Legal | Cancellation Policy | NOT_APPLICABLE | - | No subscriptions are configured. | - |
| Legal | Shipping Policy | NOT_APPLICABLE | - | No physical products are shipped. | - |
| Legal | Return / Exchange Policy | NOT_APPLICABLE | - | No physical products are traded. | - |
| Legal | Disclaimer | EXISTS_AND_ADEQUATE | `web/src/app/terms/page.tsx` | Standard legal safeguard. | Included in the terms of service. |
| Legal | Accessibility Statement | EXISTS_AND_ADEQUATE | `web/src/app/accessibility/page.tsx` | Public service directory accessibility. | Created accessibility statement detailing keyboard focus, semantic HTML, and WCAG AA goals. |
| Legal | Data Processing Agreement | NOT_APPLICABLE | - | This is a community directory, not a B2B SaaS platform. | - |
| Legal | Acceptable Use Policy | EXISTS_AND_ADEQUATE | `web/src/app/acceptable-use/page.tsx` | Directory abuse protection. | Created policy prohibiting bulk scraping, data harvesting, and chat spamming. |
| Legal | Security Policy | EXISTS_AND_ADEQUATE | `web/src/app/security-policy/page.tsx` | Outlining data safeguards. | Created document highlighting Row Level Security, secret rotation, and secure OTP verification. |
| Legal | Responsible Disclosure | EXISTS_AND_ADEQUATE | `web/src/app/responsible-disclosure/page.tsx` | Safe harbor for security researchers. | Created policy specifying report inbox (security@agrasenfoundation.org). |
| Legal | Community Guidelines | EXISTS_AND_ADEQUATE | `web/src/app/community-guidelines/page.tsx` | Governing chat & directory etiquette. | Created guidelines for member behavior, messaging safety, and trust. |
| Customer lifecycle | Login | EXISTS_AND_ADEQUATE | `web/src/app/login/page.tsx` | Standard entry. | - |
| Customer lifecycle | Register | EXISTS_AND_ADEQUATE | `web/src/app/signup/page.tsx` | Wizard signup. | - |
| Customer lifecycle | Email Verification | EXISTS_AND_ADEQUATE | `web/src/app/signup/page.tsx` | OTP verification. | Fully handled during step 1 of registration/login. |
| Customer lifecycle | Forgot Password | NOT_APPLICABLE | - | Standard user logins do not use passwords. | Authentications are strictly OTP-based. |
| Customer lifecycle | Reset Password | NOT_APPLICABLE | - | Standard user logins do not use passwords. | Authentications are strictly OTP-based. |
| Customer lifecycle | Onboarding | EXISTS_AND_ADEQUATE | `web/src/app/claim/page.tsx` | User profile setup. | Wizard registration handles onboarding. Claim flow manages self-claim verification. |
| Customer lifecycle | Account Settings | EXISTS_AND_ADEQUATE | `web/src/app/settings/page.tsx` | Manage account data. | Created Settings page with export utility (JSON download) and permanent deletion (OTP challenge validation). |
| Customer lifecycle | Billing | NOT_APPLICABLE | - | No billing found. | Free community platform. |
| Customer lifecycle | Upgrade | NOT_APPLICABLE | - | No billing found. | Free community platform. |
| Customer lifecycle | Downgrade | NOT_APPLICABLE | - | No billing found. | Free community platform. |
| Customer lifecycle | Cancel Subscription | NOT_APPLICABLE | - | No billing found. | Free community platform. |
| Customer lifecycle | Payment Success | NOT_APPLICABLE | - | No billing found. | Free community platform. |
| Customer lifecycle | Payment Failed | NOT_APPLICABLE | - | No billing found. | Free community platform. |
| Customer lifecycle | Payment Pending | NOT_APPLICABLE | - | No billing found. | Free community platform. |
| Customer lifecycle | Support | EXISTS_AND_ADEQUATE | `web/src/app/support/page.tsx` | Direct feedback channel. | Created Support page with helpline details (+91 98765 43210) and interactive ticket form. |
| Customer lifecycle | Help Center | EXISTS_AND_ADEQUATE | `web/src/app/help/page.tsx` | FAQs. | Created Help Center with categorized accordions answering registration, moderation, and visibility questions. |
| UX states | 404 | EXISTS_AND_ADEQUATE | `web/src/app/not-found.tsx` | Missing pathways. | Created custom heritage-themed 404 page. |
| UX states | 403 | EXISTS_AND_ADEQUATE | `web/src/app/403/page.tsx` | Permissions. | Created permission denied notification interface highlighting database safety / RLS. |
| UX states | 500 | EXISTS_AND_ADEQUATE | `web/src/app/error.tsx` | Runtime crashes. | Core error boundary page is fully functional. |
| UX states | Maintenance | EXISTS_AND_ADEQUATE | `web/src/app/maintenance/page.tsx` | Scheduled downtimes. | Created upkeep mode template. |
| UX states | Offline | EXISTS_AND_ADEQUATE | `web/src/components/layout/OfflineIndicator.tsx` | Network checks. | Created reactive browser network listener displaying warning banner when internet connection drops. |
| UX states | Empty State | EXISTS_AND_ADEQUATE | `web/src/app/directory/page.tsx` | Search directory. | Implemented custom result cards and empty/reset search filters. |
| UX states | No Search Results | EXISTS_AND_ADEQUATE | `web/src/app/directory/page.tsx` | Search directory. | Implemented custom result cards and empty/reset search filters. |
| UX states | Loading State | EXISTS_AND_ADEQUATE | `web/src/app/directory/page.tsx` | General load indicators. | Custom spinner and loading elements are active. |
| UX states | Error State | EXISTS_AND_ADEQUATE | `web/src/app/error.tsx` | Recoverable boundary. | Standard error boundaries handle recovery. |
| UX states | Success State | EXISTS_AND_ADEQUATE | `web/src/app/signup/page.tsx` | Completed operations. | Handled in signup confirmation step displaying serial number and moderation timing. |
| UX states | Session Expired | EXISTS_AND_ADEQUATE | `web/src/middleware.ts` | Invalid token cleanups. | Handled via JWT TTL limits in middleware redirecting back to login. |
