# Product Requirements Document (PRD): Frictionless Registration, Preview Dashboard & Gated-Action Activation

Status: ready-for-agent

## Problem Statement

When prospective members visit the Global Agarwal Directory to register their family household, they encounter immediate authentication friction:
1. **Upfront Verification Bottlenecks:** New users must request an email/SMS OTP, wait for delivery, enter the code, and configure a complex password before they even start filling out their family, Gotra, or ancestral details.
2. **Registration Drop-Off:** Any delay in verification delivery or password validation errors at Step 1 leads to immediate abandonment before the community member provides their family records.
3. **Delayed Gratification & Anxiety:** After filling out a comprehensive multi-step application, members are disconnected from their submission and cannot see what their official record looks like while waiting for admin moderation.
4. **All-or-Nothing Authentication:** There is currently no concept of a "preview mode" or "progressive activation," meaning prospective members cannot verify their submitted record without first going through complete upfront credentialing.

---

## Solution

Transform the onboarding experience into a **progressive, frictionless, two-phase onboarding workflow**:

1. **Zero-Friction Step 1:** Users provide their **Email and Mobile Phone Number** with instant format and uniqueness validation. No OTP challenge or password setup is required in Step 1. The user proceeds directly to enter Head of Household details, family origin, photos, and members.
2. **Moderation Queue Submission:** On form submission, the household record is stored in the database with status `pending_review` (moderator review required) and an unactivated credential state (`password_hash = null`).
3. **Immediate Read-Only Dashboard Preview:** The user is immediately transitioned to their household dashboard with an unactivated preview session. They can view their family card, all registered members, and their assigned Official Serial Number (`HHN-...` / `MAFL-...`), along with a status banner explaining that the application is under review.
4. **Progressive Gated Action Activation:** Modifying actions (editing personal details, editing family origin, adding/deleting family members, accessing the directory) are protected. Triggering any gated action displays an **Account Activation Dialog**:
   - Dispatches a 6-digit OTP to the registered contact.
   - User verifies the OTP and sets their permanent password.
   - Upgrades their session to fully authenticated.
   - Automatically unblocks the requested action.
5. **Persistent Standard Login:** Once the password is created, the member can log in on any device using their Email/Phone and password via standard credential authentication.

---

## User Stories

### Frictionless Registration & Onboarding
1. As a new community member, I want to provide my email and phone number in Step 1 and proceed immediately to entering my family details, so that I don't have to wait for OTPs before sharing my family background.
2. As a new community member, I want real-time validation on my email and phone number in Step 1, so that typos are caught before I spend time on subsequent steps.
3. As a new community member, I want an immediate alert if my email or phone is already registered, so that I can sign into my existing profile rather than creating a duplicate.
4. As a household head, I want my verified email and phone from Step 1 to automatically populate into my Head of Household profile in Step 2, so that I don't have to re-enter them.
5. As a household head, I want to submit my family details, photos, gotra, ancestral origin, and additional members without creating a password upfront, so that the registration process is fast and stress-free.
6. As a registered applicant, I want to receive an assigned Official Serial Number immediately upon submission, so that I have a durable reference for my family record.

### Read-Only Dashboard & Transparency
7. As a newly registered applicant, I want to land directly on my household dashboard after submitting, so that I can visually verify all the details I just entered.
8. As an unactivated applicant, I want to see a clear "Status: Under Review" badge on my dashboard, so that I know my application is safely in the community moderation queue.
9. As an unactivated applicant, I want to see an informational banner on my dashboard explaining that my account is in preview mode and can be activated anytime, so that I understand my account state.
10. As an unactivated applicant, I want to view all family member cards, occupations, and ancestral native place on my dashboard, so that I can review my submitted record.
11. As an unactivated applicant, I want to see my assigned household and member serial numbers, so that I can keep them for my personal records.

### Gated Actions & Progressive Activation
12. As an unactivated applicant, I want to see an "Activate & Set Password" button on my dashboard, so that I can secure my account whenever I choose.
13. As an unactivated applicant, I want clicking "Edit Profile" to prompt me to activate my account with an OTP, so that only a verified owner can make profile updates.
14. As an unactivated applicant, I want clicking "Add Family Member" to prompt me to activate my account with an OTP, so that unauthorized additions cannot be made.
15. As an unactivated applicant, I want clicking "Edit Family Origin" to prompt me to activate my account with an OTP, so that critical lineage details remain protected.
16. As an unactivated applicant, I want an OTP code sent to my registered contact when I activate, so that I can prove ownership of my contact channel.
17. As an unactivated applicant, I want to create a permanent password during activation with live strength requirements, so that my account is securely protected for the future.
18. As an unactivated applicant, I want the action I originally clicked (such as editing a member) to open immediately after I successfully activate, so that my workflow is not interrupted.
19. As a platform user, I want attempts to access the member directory to require an activated account, so that private member contact data is only visible to verified community members.

### Returning Member Authentication
20. As an activated member, I want to log in using my email or mobile number plus my password, so that I can access my dashboard in seconds on any device.
21. As a member who registered previously without setting a password, I want the login page to detect that I need activation and prompt me to verify via OTP and set a password, so that I never get permanently locked out.
22. As an activated member, I want my session to remain active across browser restarts via secure HTTP-only cookies, so that I don't have to log in repeatedly on trusted personal devices.
23. As an activated member, I want standard password reset capabilities via email OTP, so that I can recover my account if I forget my password.

### Administration & Security
24. As a community moderator, I want to see unactivated and activated pending submissions in the moderation queue, so that I can verify their identity documents and approve them into the live directory.
25. As a community moderator, I want approving an unactivated household to trigger the standard welcome email and SMS with their official ID card pass, so that the applicant receives official confirmation regardless of activation status.
26. As a security architect, I want unactivated sessions to be strictly blocked from mutating database records on the server side, so that client-side bypasses are impossible.
27. As a security architect, I want passwords created during activation to be hashed using bcrypt (cost factor 12), so that plain credentials are never exposed.

---

## Implementation Decisions

### 1. Dual-State Session Architecture
Sessions will track both identity and activation status:
- **Unactivated / Preview Session**:
  - Issued upon initial registration.
  - Grants read-only access to `/dashboard` for the specific household.
  - Blocks all mutation endpoints (profile update, add member, delete member, directory search).
- **Fully Activated Session**:
  - Issued after successful OTP verification + password creation, or upon successful password login.
  - Unblocks all member features.

```
State Machine:
[Unregistered] ──(Step 1-4 Submit)──► [Unactivated Preview Session]
                                              │
                                  (Trigger Gated Action / Activate)
                                              │
                                              ▼
                                   [OTP Challenge Dispatched]
                                              │
                                    (Verify OTP + Set Password)
                                              │
                                              ▼
                                  [Fully Activated Member Session]
```

### 2. Registration Payload Modification
- The registration input schema makes `password` optional.
- When `password` is absent:
  - Validation skips password complexity checks.
  - Household and Head Member are persisted with `password_hash = null`.
  - Household status is initialized to `pending_review`.
  - Preview session is signed with `isActivated: false` and `hasPassword: false`.

### 3. Progressive Activation Server Action
- Introduce an activation contract `activateAccountWithOtp({ contact, otp, newPassword })`:
  - Verifies the time-limited HMAC OTP challenge for the contact.
  - Validates password complexity (min 8 chars, uppercase, lowercase, number).
  - Generates bcrypt hash (12 rounds) and updates `password_hash` in `households` and `members`.
  - Upgrades session cookie to `isActivated: true, hasPassword: true`.

### 4. Gated Action Interceptor Pattern
- Client-side: Dashboard actions pass through a lightweight `requireActivation(action)` gate. If `!isActivated`, the activation modal opens, storing the pending callback. Once activation succeeds, the modal executes the pending callback seamlessly.
- Server-side: All mutation server actions enforce `session.isActivated !== false`. If unactivated, actions return an explicit error code: `ACCOUNT_ACTIVATION_REQUIRED`.

### 5. Login Fallback Handling
- When a user enters their email/phone on `/login`:
  - If the account exists but has `password_hash == null`:
    - Return `needsActivation: true`.
    - Switch the login UI into OTP verification + password setup mode.
    - Successfully setting the password logs the user into their dashboard.

---

## Testing Decisions

### What Makes a Good Test
- Tests must assert on **observable user and security outcomes**:
  1. A user can complete registration without providing a password.
  2. The registered user can view their dashboard data in read-only mode.
  3. Attempting to mutate profile details or add a member while unactivated is rejected.
  4. OTP verification and password submission updates the credential and upgrades the session.
  5. Subsequent authentication with the new password succeeds.
- Tests must **never assert on internal salt values or mock states**.

### Testing Seams
- **Seam 1 (Registration & Credential Seam):** Test registration server action without password -> verify `password_hash` is null and status is `pending_review`.
- **Seam 2 (Authorization Seam):** Test profile mutation actions with unactivated session -> assert rejection.
- **Seam 3 (Activation & Login Seam):** Test `activateAccountWithOtp` -> verify credential upgrade -> test `loginWithPassword` with newly established password -> assert session created.

### Prior Art
- `web/tests/seams.test.mjs` (Seam 4: Server action contracts).
- `web/tests/auth-lifecycle.test.mjs` (Session signing, verification, and expiration).
- `web/tests/login-password.test.mjs` (Password validation and attempt tracking).

---

## Out of Scope
- Modifying the Step 2–4 profile forms (Gotra selection, photo upload, location selectors, Aadhaar/PAN fields remain untouched).
- Changes to admin moderation capabilities or dispute resolution workflows.
- Social login (OAuth / Google / Apple) integration.
- Native mobile push notification integrations.

---

## Further Notes
- This feature eliminates the largest source of registration abandonment while preserving the platform's long-term password security model.
- Because all changes follow the `/surgical-changes` protocol, all existing database records, approved members, and moderation queues remain 100% compatible.
