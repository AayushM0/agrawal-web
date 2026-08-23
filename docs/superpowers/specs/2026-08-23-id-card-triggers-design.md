# ID Card PDF and Automatic Verification Triggers

## 1. Goal
1. Replace the current full-page browser print mechanism for ID cards with a dedicated server-side PDF generation that downloads a perfectly sized CR80 ID card.
2. Add automatic triggers to send the generated ID to users via Twilio SMS and Twilio SendGrid email as soon as an admin approves their household.

## 2. Architecture & Approach

### 2.1 Server-Side ID Card PDF Generation
- **Library:** `@react-pdf/renderer` will be used to construct the PDF securely on the backend. This avoids the heavy overhead of headless browsers and guarantees consistent sizing (CR80 standard ID size).
- **New API Route:** A secure route (`/api/pass/pdf?memberId=XYZ`) will be created.
- **Workflow:** When a user clicks the "Download ID" button on the frontend (`LanyardPassClient.tsx`), it hits this new API route. The server builds the PDF in memory using the member's database record and streams it back to the browser as a downloadable `.pdf` file.

### 2.2 Automatic Verification Triggers (Email & SMS)
- **Integration Points:** The `approveHousehold` and `approveAllHouseholds` functions in `src/actions/moderate.ts` will be updated to trigger the notification workflow.
- **Data Flow:** Upon approval, the system fetches all verified members within the household.
- **Twilio SMS:** Using the Twilio Node SDK, an SMS is dispatched to each member's phone number containing a secure link to download their PDF (e.g., "Your membership is approved! Download your official ID here: [Link]").
- **Twilio SendGrid (Email):** Using `@sendgrid/mail`, an email is dispatched to the member. The system will reuse the server-side PDF generation logic to build the PDF buffer in memory, attach it directly to the SendGrid payload, and send the email.

## 3. Data Flow & Security
- The PDF generation route will verify the session to ensure the requester has access to the specified member's ID.
- Private member information remains securely on the server during generation.
- Email and SMS dispatches happen asynchronously or reliably awaited during the Server Action to ensure the database transaction and notification match state.

## 4. Open Questions / Follow-ups
- Need to add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and `SENDGRID_API_KEY` to `.env` file during implementation.
