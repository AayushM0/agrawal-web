import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

// --- SEAM 1: Layout & Top Navigation (No Horizontal Scrollbar) ---
test("Seam 1: Top navigation bar must suppress horizontal scrollbars", () => {
  const topNavFile = fs.readFileSync(path.join(webRoot, "src/components/layout/TopNavBar.tsx"), "utf8");
  const globalsCss = fs.readFileSync(path.join(webRoot, "src/app/globals.css"), "utf8");
  
  assert.ok(
    !topNavFile.includes("overflow-x-auto whitespace-nowrap scrollbar-none"),
    "TopNavBar should not use unhandled raw overflow-x-auto"
  );
  
  assert.ok(
    globalsCss.includes(".no-scrollbar") && globalsCss.includes("overflow-x: hidden"),
    "globals.css should define horizontal overflow protection"
  );
});

test("Seam 33: optional international IDs and secure profile controls", () => {
  const register = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const signup = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");
  const profile = fs.readFileSync(path.join(webRoot, "src/actions/profile.ts"), "utf8");
  const account = fs.readFileSync(path.join(webRoot, "src/actions/account.ts"), "utf8");

  assert.ok(!register.includes('A valid Passport Number is required for international members.'), "Passport must be optional");
  assert.ok(!signup.includes('Passport Number *'), "Passport label must not imply a requirement");
  assert.ok(profile.includes("updateIdentityDocuments"), "Sensitive IDs need their own protected action");
  assert.ok(profile.includes("verifyOtp"), "Sensitive ID changes must require an OTP");
  assert.ok(profile.includes("postalCode") && profile.includes("fullAddress"), "Profile address updates must persist all fields");
  assert.ok(account.includes("Unauthorized: sign in"), "Account deletion must require an authenticated session");
});

test("Seam 34: identity editor must not clear untouched documents", () => {
  const dashboard = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");
  assert.ok(dashboard.includes("identityRemove"), "Identity editor must distinguish removal from an untouched blank field");
  assert.ok(dashboard.includes("? null : undefined"), "Untouched document fields must be omitted from partial updates");
});

test("Seam 35: business profiles use an explicit manager and founder handover contract", () => {
  const schema = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const business = fs.readFileSync(path.join(webRoot, "src/actions/business.ts"), "utf8");
  const businessTypes = fs.readFileSync(path.join(webRoot, "src/types/business.ts"), "utf8");
  const businessEdit = fs.readFileSync(path.join(webRoot, "src/app/businesses/[id]/edit/page.tsx"), "utf8");

  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS profile_manager_assignments"), "Profile manager assignments must be persisted");
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS profile_manager_handovers"), "Pending manager handovers must be persisted");
  assert.ok(dbCode.includes("isProfileManager"), "Database layer must expose manager authorization");
  assert.ok(business.includes("assertBusinessManager"), "Business mutations must enforce the current manager");
  assert.ok(business.includes("createBusinessManagerHandover") && business.includes("acceptBusinessManagerHandover"), "Business actions must support explicit handover");
  assert.ok(businessTypes.includes("source: \"directory\" | \"manual\""), "Leadership records must distinguish directory and manual founders");
  assert.ok(businessEdit.includes("addManualFounder"), "Manager-only business editing must support a manual founder");
});

test("Seam 36: admin legacy backfill must never overwrite an accepted business manager", () => {
  const schema = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const protectedBackfill = "assignment.creator_actor_type = 'member'";
  assert.ok(schema.includes(protectedBackfill), "Schema backfill must only promote the untouched member fallback");
  assert.ok(dbCode.includes(protectedBackfill), "Runtime schema backfill must preserve an accepted manager after restart");
});

// --- SEAM 2: Database Schema & PostGIS DDL Integrity ---
test("Seam 2: PostgreSQL schema DDL contains all required tables and indexes", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS households"), "Must contain households table");
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS members"), "Must contain members table");
  assert.ok(schemaSql.includes("CREATE EXTENSION IF NOT EXISTS \"postgis\""), "Must enable PostGIS");
  assert.ok(schemaSql.includes("search_vector TSVECTOR GENERATED ALWAYS AS"), "Must define tsvector full-text column");
  assert.ok(schemaSql.includes("idx_members_coordinates ON members USING gist(coordinates)"), "Must define PostGIS GiST index");
});

// --- SEAM 3: 18 Gotras Complete Dataset ---
test("Seam 3: 18 Gotras list is complete and well-formed", () => {
  const gotrasContent = fs.readFileSync(path.join(webRoot, "src/data/gotras.ts"), "utf8");
  
  const expectedGotras = ["Garg", "Bansal", "Bindal", "Dharan", "Airon", "Goyal", "Jindal", "Kansal", "Kuchhal", "Madhukul", "Mangal", "Mittal", "Nangil", "Singhal", "Tayal", "Tingal", "Vatsil", "Kasal"];
  expectedGotras.forEach((name) => {
    assert.ok(gotrasContent.includes(name), `Missing Gotra: ${name}`);
  });
});

// --- SEAM 4: Server Actions Code Contract Verification ---
test("Seam 4: Server Actions adhere to privacy and validation contracts", () => {
  const registerCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const searchCode = fs.readFileSync(path.join(webRoot, "src/actions/search.ts"), "utf8");
  const claimCode = fs.readFileSync(path.join(webRoot, "src/actions/claim.ts"), "utf8");
  const moderateCode = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");

  // Registration checks
  assert.ok(registerCode.includes("input.consentAccepted"), "Must validate consent");
  assert.ok(registerCode.includes("pending_review"), "Must set status to pending_review");
  assert.ok(registerCode.includes("getHouseholdByContact"), "Must check duplicate contact");

  // Search privacy checks
  assert.ok(searchCode.includes("safeListResults"), "Must sanitize list results");
  assert.ok(searchCode.includes("m.householdStatus === \"live\""), "Must filter only live members");

  // Claim checks
  assert.ok(claimCode.includes("createClaimInvite"), "Must provide claim invite generator");
  assert.ok(claimCode.includes("claimMember"), "Must support member claim");

  // Moderate checks
  assert.ok(moderateCode.includes("approveHousehold"), "Must support approval");
  assert.ok(moderateCode.includes("rejectionReason"), "Must enforce rejection reason");
});

// --- SEAM 5: OTP Generation & Verification Logic ---
test("Seam 5: OTP Server Action generates code and verifies successfully", () => {
  const otpCode = fs.readFileSync(path.join(webRoot, "src/actions/otp.ts"), "utf8");
  
  assert.ok(otpCode.includes("sendOtp"), "Must export sendOtp");
  assert.ok(otpCode.includes("verifyOtp"), "Must export verifyOtp");
  assert.ok(otpCode.includes("attempts"), "Must track brute force attempts");
  assert.ok(otpCode.includes("expiresAt"), "Must enforce expiry TTL");
});

// --- SEAM 6: Database Layer Fail-Loud Contract ---
test("Seam 6: Database layer throws errors instead of swallowing them", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  
  assert.ok(!dbCode.includes("class FallbackStore"), "FallbackStore must be completely removed");
  assert.ok(!dbCode.includes("fallbackStore."), "Must not reference fallbackStore");
  assert.ok(dbCode.includes("throw ") || !dbCode.includes("catch (e)"), "Must throw errors or remove swallowing catch blocks entirely");
});

// --- SEAM 7: Cryptographic Secrets Hardening ---
test("Seam 7: Cryptographic secrets must not have hardcoded fallbacks", () => {
  const otpCode = fs.readFileSync(path.join(webRoot, "src/actions/otp.ts"), "utf8");
  const authTokensCode = fs.readFileSync(path.join(webRoot, "src/lib/auth-tokens.ts"), "utf8");
  
  assert.ok(!otpCode.includes("agarwal_dir_secure"), "OTP module must not contain hardcoded fallback secret");
  assert.ok(!authTokensCode.includes("agarwal_dir_secure"), "Auth tokens module must not contain hardcoded fallback secret");
  
  assert.ok(otpCode.includes("throw new Error") && otpCode.includes("AUTH_SECRET"), "OTP module must throw if AUTH_SECRET is missing");
  assert.ok(authTokensCode.includes("throw new Error") && authTokensCode.includes("AUTH_SECRET"), "Auth tokens module must throw if AUTH_SECRET is missing");
});

// --- SEAM 8: OTP Optimization & Rate Limiting ---
test("Seam 8: OTP must use native fetch and implement rate limiting", () => {
  const pkgJson = fs.readFileSync(path.join(webRoot, "package.json"), "utf8");
  const otpCode = fs.readFileSync(path.join(webRoot, "src/actions/otp.ts"), "utf8");
  
  assert.ok(!pkgJson.includes("twilio:"), "twilio SDK must be removed from package.json");
  assert.ok(!pkgJson.includes("resend:"), "resend SDK must be removed from package.json");
  
  assert.ok(!otpCode.includes("import twilio"), "twilio SDK import must be removed");
  assert.ok(!otpCode.includes("import { Resend }"), "resend SDK import must be removed");
  
  assert.ok(otpCode.includes("fetch("), "Must use native fetch for external API calls");
  assert.ok(otpCode.includes("rateLimits") || otpCode.includes("RateLimit"), "Must implement rate limiting on OTP attempts");
});

// --- SEAM 9: Global Error Boundaries ---
test("Seam 9: Next.js root error.tsx must exist and be client-side", () => {
  const errorFileExists = fs.existsSync(path.join(webRoot, "src/app/error.tsx"));
  assert.ok(errorFileExists, "src/app/error.tsx boundary must exist");
  
  if (errorFileExists) {
    const errorCode = fs.readFileSync(path.join(webRoot, "src/app/error.tsx"), "utf8");
    assert.ok(errorCode.includes("use client"), "error.tsx must be a Client Component");
    assert.ok(errorCode.includes("error") && errorCode.includes("reset"), "error.tsx must accept error and reset props");
  }
});

// --- SEAM 10: PDF Generator Contract & Font Normalization ---
test("Seam 10: PassPDF adheres to serverless font normalization and safe image decoding", () => {
  const passPdfCode = fs.readFileSync(path.join(webRoot, "src/components/PassPDF.tsx"), "utf8");
  const passLibCode = fs.readFileSync(path.join(webRoot, "src/lib/pass.ts"), "utf8");
  const lanyardClientCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/pass/LanyardPassClient.tsx"), "utf8");

  // Pass Data normalizer checks
  assert.ok(passLibCode.includes("createUnifiedPassData"), "Must export createUnifiedPassData");
  assert.ok(passLibCode.includes("fatherOrHusbandLabel"), "Must resolve fatherOrHusbandLabel dynamically");
  assert.ok(passLibCode.includes("HUSBAND / FATHER"), "Must support HUSBAND / FATHER label for married females/spouses");

  // PassPDF font & safety checks
  assert.ok(!passPdfCode.includes("Times-Bold"), "Must not use unregistered Times-Bold font to prevent Linux/Vercel crashes");
  assert.ok(passPdfCode.includes("isCompatiblePhoto"), "Must validate photo format before rendering Image component");

  // Lanyard client resilience checks
  assert.ok(lanyardClientCode.includes("handleDownloadPdf"), "Must implement active blob download handler");
  assert.ok(lanyardClientCode.includes("pdf("), "Must include direct in-browser PDF rendering fallback");
});

// --- SEAM 11: End-to-End @react-pdf/renderer Buffer Generation ---
test("Seam 11: Real @react-pdf/renderer generates valid PDF binaries for all edge cases", async () => {
  const React = (await import("react")).default;
  const { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } = await import("@react-pdf/renderer");

  const sampleJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  const styles = StyleSheet.create({
    page: { backgroundColor: "#0d111a", padding: 12, alignItems: "center", justifyContent: "center" },
    card: { width: "100%", backgroundColor: "#ffffff", borderRadius: 14, overflow: "hidden", border: "1px solid #374151" },
    header: { backgroundColor: "#9a3412", paddingTop: 8, paddingBottom: 14, paddingHorizontal: 16, alignItems: "center" },
    headerTitle: { fontSize: 13, fontWeight: "bold", color: "#ffffff", marginBottom: 2, textAlign: "center" },
    avatarImage: { width: 56, height: 56, borderRadius: 28, border: "2px solid #ffffff" },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#b45309", alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 22, color: "#ffffff", fontWeight: "bold" },
  });

  function TestDoc({ passData }) {
    const isCompatiblePhoto =
      typeof passData.photoUrl === "string" &&
      passData.photoUrl.trim().length > 0 &&
      (passData.photoUrl.startsWith("data:image/jpeg") ||
        passData.photoUrl.startsWith("data:image/jpg") ||
        passData.photoUrl.startsWith("data:image/png") ||
        passData.photoUrl.startsWith("https://"));

    return React.createElement(Document, null,
      React.createElement(Page, { size: [320, 460], style: styles.page },
        React.createElement(View, { style: styles.card },
          React.createElement(View, { style: styles.header },
            React.createElement(Text, { style: styles.headerTitle }, "Maharaja Agrasen Foundation")
          ),
          React.createElement(View, null,
            isCompatiblePhoto
              ? React.createElement(Image, { style: styles.avatarImage, src: passData.photoUrl })
              : React.createElement(View, { style: styles.avatarPlaceholder },
                  React.createElement(Text, { style: styles.avatarText }, passData.fullName ? passData.fullName.charAt(0) : "M")
                )
          )
        )
      )
    );
  }

  const testCases = [
    { name: "Head of Household with Valid Photo", photo: sampleJpeg },
    { name: "Married Spouse with Dynamic Label & Photo", photo: sampleJpeg },
    { name: "Member with Empty Photo", photo: "" },
    { name: "Member with Corrupt / Unsupported String", photo: "data:image/webp;base64,invalid" },
  ];

  for (const tc of testCases) {
    const buffer = await renderToBuffer(React.createElement(TestDoc, { passData: { fullName: "Ramesh", photoUrl: tc.photo } }));
    assert.ok(Buffer.isBuffer(buffer), `${tc.name} must return a Buffer`);
    assert.ok(buffer.length > 1000, `${tc.name} buffer must be valid size`);
    assert.equal(buffer.subarray(0, 5).toString("utf8"), "%PDF-", `${tc.name} must start with %PDF- header`);
  }
});

// --- SEAM 12: Directory Photo Rendering, SQL Aliasing & CSP Directives ---
test("Seam 12: Directory search, getMemberById SQL, and CSP headers adhere to contracts", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const nextConfigCode = fs.readFileSync(path.join(webRoot, "next.config.ts"), "utf8");
  const directoryPageCode = fs.readFileSync(path.join(webRoot, "src/app/directory/page.tsx"), "utf8");
  const searchActionCode = fs.readFileSync(path.join(webRoot, "src/actions/search.ts"), "utf8");

  // 1. SQL unambiguous column reference in getMemberById
  assert.ok(dbCode.includes('m.postal_code as "postalCode", m.state, m.full_address as "fullAddress"'), "getMemberById must qualify m.state to prevent ambiguous column collision");

  // 2. CSP WASM, Blob & Turnstile Frame allowance
  assert.ok(nextConfigCode.includes("connect-src 'self' https: wss: data: blob:"), "next.config.ts must allow data: and blob: in connect-src");
  assert.ok(nextConfigCode.includes("frame-src 'self' https://challenges.cloudflare.com"), "next.config.ts must permit challenges.cloudflare.com in frame-src");

  // 3. Directory search UI photo rendering
  assert.ok(directoryPageCode.includes("src={m.photoUrl}"), "Directory page must render img with m.photoUrl");

  // 4. Search action photo projection
  assert.ok(searchActionCode.includes('m.visibility?.photo === "hidden"'), "Search action must check for hidden photo visibility");
});

// --- SEAM 13: Form Abandonment & Incomplete Registration Lead Capture ---
test("Seam 13: Registration drafts schema, server actions, and admin integration adhere to contracts", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const draftActionFile = path.join(webRoot, "src/actions/draft.ts");
  
  // 1. Database Schema DDL check
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS registration_drafts"), "Must declare registration_drafts table in schema.sql");
  assert.ok(schemaSql.includes("idx_registration_drafts_incomplete"), "Must index registration_drafts by completion and date");

  // 2. Draft action file must exist and export required contracts
  assert.ok(fs.existsSync(draftActionFile), "src/actions/draft.ts must exist");
  const draftCode = fs.readFileSync(draftActionFile, "utf8");
  assert.ok(draftCode.includes("export async function saveRegistrationDraft"), "Must export saveRegistrationDraft");
  assert.ok(draftCode.includes("export async function markRegistrationDraftCompleted"), "Must export markRegistrationDraftCompleted");
  assert.ok(draftCode.includes("export async function getIncompleteRegistrations"), "Must export getIncompleteRegistrations");
  assert.ok(draftCode.includes('role !== "admin"') || draftCode.includes("admin"), "getIncompleteRegistrations must verify admin role");

  // 3. Register action must resolve draft on final submission
  const registerCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  assert.ok(registerCode.includes("markRegistrationDraftCompleted"), "registerHousehold must call markRegistrationDraftCompleted");

  // 4. Signup wizard must trigger saveRegistrationDraft
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");
  assert.ok(signupCode.includes("saveRegistrationDraft"), "Signup page must trigger saveRegistrationDraft on Step 1 advancement");

  // 5. Admin moderation queue must integrate incomplete signups
  const adminCode = fs.readFileSync(path.join(webRoot, "src/app/admin/moderation/page.tsx"), "utf8");
  assert.ok(adminCode.includes("getIncompleteRegistrations"), "Moderation page must fetch incomplete registrations");
  assert.ok(adminCode.includes('"incomplete"'), "Moderation page must include 'incomplete' filter tab");
});

// --- SEAM 14: Message Request Email Notifications & Real-Time Pop-up Toast ---
test("Seam 14: First-turn message request email dispatch and in-app popup toast adhere to contracts", () => {
  const emailUtilFile = path.join(webRoot, "src/lib/email.ts");
  const toastComponentFile = path.join(webRoot, "src/components/chat/MessageRequestToast.tsx");
  const chatActionFile = path.join(webRoot, "src/actions/chat.ts");
  const headerFile = path.join(webRoot, "src/components/layout/MainHeader.tsx");

  // 1. Email Utility Contract
  assert.ok(fs.existsSync(emailUtilFile), "src/lib/email.ts must exist");
  const emailCode = fs.readFileSync(emailUtilFile, "utf8");
  assert.ok(emailCode.includes("export async function sendMessageRequestNotificationEmail"), "Must export sendMessageRequestNotificationEmail");
  assert.ok(emailCode.includes("api.resend.com/emails"), "Must dispatch to Resend API endpoint");
  assert.ok(emailCode.includes("RESEND_API_KEY"), "Must check RESEND_API_KEY");

  // 2. Chat Action First-Turn Integration
  const chatCode = fs.readFileSync(chatActionFile, "utf8");
  assert.ok(chatCode.includes("sendMessageRequestNotificationEmail"), "sendMessage must call sendMessageRequestNotificationEmail");
  assert.ok(chatCode.includes("isFirstRequestTurn") || chatCode.includes("isRequestTurn") || chatCode.includes("existingMessages.length === 0"), "Must detect first-turn message request");
  assert.ok(chatCode.includes("senderName"), "Pusher incoming-message payload must include senderName");
  assert.ok(chatCode.includes("isRequest"), "Pusher incoming-message payload must include isRequest flag");

  // 3. Floating Pop-up Toast Component
  assert.ok(fs.existsSync(toastComponentFile), "src/components/chat/MessageRequestToast.tsx must exist");
  const toastCode = fs.readFileSync(toastComponentFile, "utf8");
  assert.ok(toastCode.includes("MessageRequestToast"), "Toast file must declare MessageRequestToast");
  assert.ok(toastCode.includes("Open Chat") || toastCode.includes("open-chat"), "Toast must include open chat action");

  // 4. MainHeader Real-Time & Polling Pop-up Integration
  const headerCode = fs.readFileSync(headerFile, "utf8");
  assert.ok(headerCode.includes("MessageRequestToast"), "MainHeader must import MessageRequestToast");
  assert.ok(headerCode.includes("incoming-message"), "MainHeader must listen for incoming-message events");

  // 5. Security & XSS protection in email template
  assert.ok(emailCode.includes("escHtml"), "email.ts must sanitize user data with escHtml");
});

test("Seam 15: Chat attachments schema, storage helpers, upload route, and UI adhere to contracts", () => {
  // 1. Schema DDL contains attachment columns and nullable message_body
  const schemaFile = path.resolve(webRoot, "src/db/schema.sql");
  const schema = fs.readFileSync(schemaFile, "utf8");
  assert.ok(schema.includes("attachment_url"), "schema.sql must define attachment_url column");
  assert.ok(schema.includes("attachment_type"), "schema.sql must define attachment_type column");
  assert.ok(schema.includes("attachment_name"), "schema.sql must define attachment_name column");
  assert.ok(schema.includes("attachment_size"), "schema.sql must define attachment_size column");
  assert.ok(!schema.includes("message_body TEXT NOT NULL"), "message_body must be nullable in schema.sql");

  // 2. Storage lib exports attachment helpers and validation
  const storageFile = path.resolve(webRoot, "src/lib/storage.ts");
  const storageCode = fs.readFileSync(storageFile, "utf8");
  assert.ok(storageCode.includes("uploadChatAttachment"), "storage.ts must export uploadChatAttachment");
  assert.ok(storageCode.includes("getChatAttachmentSignedUrl"), "storage.ts must export getChatAttachmentSignedUrl");
  assert.ok(storageCode.includes("ALLOWED_ATTACHMENT_MIME_TYPES"), "storage.ts must define ALLOWED_ATTACHMENT_MIME_TYPES");
  assert.ok(storageCode.includes("ALLOWED_ATTACHMENT_EXTENSIONS"), "storage.ts must define ALLOWED_ATTACHMENT_EXTENSIONS");
  assert.ok(storageCode.includes("validateAttachmentMagicBytes"), "storage.ts must export validateAttachmentMagicBytes");
  assert.ok(storageCode.includes("MAX_ATTACHMENT_BYTES"), "storage.ts must define MAX_ATTACHMENT_BYTES");
  assert.ok(storageCode.includes("chat-attachments"), "storage.ts must reference chat-attachments bucket");

  // 3. Upload API route exists with required guards
  const uploadRoute = path.resolve(webRoot, "src/app/api/chat/upload/route.ts");
  assert.ok(fs.existsSync(uploadRoute), "POST /api/chat/upload route.ts must exist");
  const routeCode = fs.readFileSync(uploadRoute, "utf8");
  assert.ok(routeCode.includes("status !== \"accepted\""), "Upload route must reject non-accepted conversations");
  assert.ok(routeCode.includes("isParticipant"), "Upload route must verify caller is conversation participant");
  assert.ok(routeCode.includes("MAX_ATTACHMENT_BYTES"), "Upload route must enforce size limit");
  assert.ok(routeCode.includes("validateAttachmentMagicBytes"), "Upload route must verify magic bytes");

  // 4. sendMessage server action accepts optional messageBody + attachment params and protects signed URLs
  const chatActionFile = path.resolve(webRoot, "src/actions/chat.ts");
  const chatCode = fs.readFileSync(chatActionFile, "utf8");
  assert.ok(chatCode.includes("attachmentUrl?"), "sendMessage must accept optional attachmentUrl");
  assert.ok(chatCode.includes("attachmentType?"), "sendMessage must accept optional attachmentType");
  assert.ok(chatCode.includes("getAttachmentSignedUrl"), "chat.ts must export getAttachmentSignedUrl action");
  assert.ok(chatCode.includes("!trimmedBody && !params.attachmentUrl"), "sendMessage must allow attachment-only messages");
  assert.ok(chatCode.includes("isParticipant"), "getAttachmentSignedUrl must check isParticipant before signing");

  // 5. Chat UI contains file picker and attachment rendering
  const messagesPage = path.resolve(webRoot, "src/app/dashboard/messages/page.tsx");
  const pageCode = fs.readFileSync(messagesPage, "utf8");
  assert.ok(pageCode.includes("fileInputRef"), "Chat UI must have hidden file input ref");
  assert.ok(pageCode.includes("AttachmentRenderer"), "Chat UI must use AttachmentRenderer component");
  assert.ok(pageCode.includes("pendingFile"), "Chat UI must have pendingFile state");
  assert.ok(pageCode.includes("/api/chat/upload"), "Chat UI must call /api/chat/upload");
  assert.ok(pageCode.includes("lightboxUrl"), "Chat UI must have lightbox state for image preview");
});

// --- SEAM 16: Part 1 Security Hardening & Zero-Knowledge Deduplication ---
test("Seam 16: Aadhaar masking, DB search pushdown, serverless rate limits, and email XSS guards adhere to contracts", () => {
  const privacyCode = fs.readFileSync(path.join(webRoot, "src/lib/privacy.ts"), "utf8");
  const registerCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const searchCode = fs.readFileSync(path.join(webRoot, "src/actions/search.ts"), "utf8");
  const matrimonyCode = fs.readFileSync(path.join(webRoot, "src/actions/matrimony.ts"), "utf8");
  const nextConfigCode = fs.readFileSync(path.join(webRoot, "next.config.ts"), "utf8");
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");

  // 1. Aadhaar masking & blind HMAC indexing
  assert.ok(privacyCode.includes("export function maskAadhaar"), "privacy.ts must export maskAadhaar");
  assert.ok(privacyCode.includes("export function hashGovtId"), "privacy.ts must export hashGovtId");
  assert.ok(schemaSql.includes("aadhaar_hash TEXT"), "schema.sql must define aadhaar_hash column");
  assert.ok(registerCode.includes("maskAadhaar"), "register.ts must store masked Aadhaar");
  assert.ok(registerCode.includes("hashGovtId"), "register.ts must generate blind Aadhaar hash");
  assert.ok(dbCode.includes("getHouseholdByAadhaarHash"), "db.ts must export getHouseholdByAadhaarHash for duplicate detection");

  // 2. DB Search pushdown eliminating heap exhaustion
  assert.ok(dbCode.includes("searchMembersPaged"), "db.ts must implement searchMembersPaged");
  assert.ok(searchCode.includes("db.searchMembersPaged"), "searchDirectory must call db.searchMembersPaged");

  // 3. Serverless rate limiting & auth gating
  assert.ok(dbCode.includes("checkDbRateLimit"), "db.ts must implement checkDbRateLimit");
  assert.ok(searchCode.includes("checkDbRateLimit"), "searchDirectory must use checkDbRateLimit");
  assert.ok(searchCode.includes("isStrictAuth"), "searchDirectory must enforce isStrictAuth in production");

  // 4. Matrimonial email sanitization
  assert.ok(matrimonyCode.includes("escapeHtml"), "matrimony.ts must implement escapeHtml");
  assert.ok(matrimonyCode.includes("cleanSubject"), "matrimony.ts must strip newlines to prevent SMTP injection");

  // 5. CSP domain pinning
  assert.ok(nextConfigCode.includes('const isDevelopment = process.env.NODE_ENV === "development"'), "next.config.ts must explicitly identify development mode for CSP");
  assert.ok(nextConfigCode.includes("...(isDevelopment ? [\"'unsafe-eval'\"] : [])"), "development CSP must allow Next.js React Refresh to evaluate its runtime");
  assert.ok(!nextConfigCode.includes("script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"), "next.config.ts must not have a broad unsafe-eval production script policy");
});

// --- SEAM 17: Part 2 Cloudflare Turnstile Bot Defense Contract ---
test("Seam 17: Cloudflare Turnstile server service and client widget adhere to contracts", () => {
  const turnstileLibPath = path.join(webRoot, "src/lib/turnstile.ts");
  const turnstileWidgetPath = path.join(webRoot, "src/components/common/TurnstileWidget.tsx");

  assert.ok(fs.existsSync(turnstileLibPath), "src/lib/turnstile.ts must exist");
  assert.ok(fs.existsSync(turnstileWidgetPath), "src/components/common/TurnstileWidget.tsx must exist");

  const turnstileCode = fs.readFileSync(turnstileLibPath, "utf8");
  const widgetCode = fs.readFileSync(turnstileWidgetPath, "utf8");

  // 1. Server-side verification service contracts
  assert.ok(turnstileCode.includes("export function getClientIp"), "turnstile.ts must export getClientIp");
  assert.ok(turnstileCode.includes("export async function verifyTurnstileToken"), "turnstile.ts must export verifyTurnstileToken");
  assert.ok(turnstileCode.includes("cf-connecting-ip"), "getClientIp must prioritize cf-connecting-ip");
  assert.ok(turnstileCode.includes("CLOUDFLARE_TURNSTILE_SECRET_KEY"), "verifyTurnstileToken must check CLOUDFLARE_TURNSTILE_SECRET_KEY");
  assert.ok(turnstileCode.includes("isDevBypass"), "verifyTurnstileToken must support dev bypass for zero-friction local development");
  assert.ok(turnstileCode.includes("https://challenges.cloudflare.com/turnstile/v0/siteverify"), "verifyTurnstileToken must target Cloudflare siteverify endpoint");

  // 2. Client widget contracts
  assert.ok(widgetCode.includes("'use client'"), "TurnstileWidget must be a client component");
  assert.ok(widgetCode.includes("export function TurnstileWidget"), "TurnstileWidget must be exported");
  assert.ok(widgetCode.includes("NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY"), "TurnstileWidget must reference NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY");
  assert.ok(widgetCode.includes("challenges.cloudflare.com/turnstile/v0/api.js"), "TurnstileWidget must load official Cloudflare Turnstile API");
  assert.ok(widgetCode.includes("isDevFallback"), "TurnstileWidget must provide local developer fallback");
  assert.ok(widgetCode.includes("min-h-[65px]"), "TurnstileWidget must enforce min-height to eliminate Cumulative Layout Shift (CLS)");
  assert.ok(widgetCode.includes("isNgrokDevHost"), "TurnstileWidget must recognize ngrok development tunnels");
  assert.ok(widgetCode.includes(".ngrok-free.dev"), "TurnstileWidget must recognize ngrok-free.dev tunnels");
  assert.ok(widgetCode.includes(".ngrok-free.app"), "TurnstileWidget must recognize ngrok-free.app tunnels");
  assert.ok(widgetCode.includes(".ngrok.io"), "TurnstileWidget must recognize ngrok.io tunnels");
  assert.ok(widgetCode.includes("process.env.NODE_ENV !== 'production'"), "ngrok test-key handling must remain development-only");

  // 3. OTP bill-bombing protection & Turnstile gate
  const otpCode = fs.readFileSync(path.join(webRoot, "src/actions/otp.ts"), "utf8");
  assert.ok(otpCode.includes("verifyTurnstileToken"), "otp.ts must verify Turnstile token");
  assert.ok(otpCode.includes("cooldown_"), "otp.ts must enforce 60s cooldown per recipient to block toll fraud");
  assert.ok(otpCode.includes("turnstileToken"), "SendOtpInput must support turnstileToken");

  // 4. Auth & Registration Turnstile gates
  const authCode = fs.readFileSync(path.join(webRoot, "src/actions/auth.ts"), "utf8");
  const registerCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  assert.ok(authCode.includes("verifyTurnstileToken"), "auth.ts must verify Turnstile token on password login");
  assert.ok(registerCode.includes("verifyTurnstileToken"), "register.ts must verify Turnstile token on household registration");

  // 5. Login & Signup form UI wiring
  const loginPageCode = fs.readFileSync(path.join(webRoot, "src/app/login/page.tsx"), "utf8");
  const signupPageCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");
  assert.ok(loginPageCode.includes("TurnstileWidget"), "login/page.tsx must embed TurnstileWidget");
  assert.ok(loginPageCode.includes("turnstileToken"), "login/page.tsx must manage turnstileToken state");
  assert.ok(signupPageCode.includes("TurnstileWidget"), "signup/page.tsx must embed TurnstileWidget");
  assert.ok(signupPageCode.includes("turnstileToken"), "signup/page.tsx must pass turnstileToken to registerHousehold");
});

// --- SEAM 18: DPDP Act 2023 / PDPA Legal Compliance & Admin Audit Trail ---
test("Seam 18: DPDP right to erasure purges storage photos and admin actions are logged", () => {
  const storageLib = fs.readFileSync(path.join(webRoot, "src/lib/storage.ts"), "utf8");
  const accountAction = fs.readFileSync(path.join(webRoot, "src/actions/account.ts"), "utf8");
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const moderateAction = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");

  // 1. Right to Erasure - physical photo purge
  assert.ok(storageLib.includes("export async function deleteMemberPhoto"), "storage.ts must export deleteMemberPhoto");
  assert.ok(accountAction.includes("deleteMemberPhoto"), "deleteHouseholdAccount must purge member photos from storage");

  // 2. Admin Audit Log table and RLS
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS admin_audit_logs"), "schema.sql must define admin_audit_logs table");
  assert.ok(schemaSql.includes("ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY"), "admin_audit_logs must have RLS enabled");
  assert.ok(dbLib.includes("CREATE TABLE IF NOT EXISTS admin_audit_logs"), "db.ts ensureSchema must define admin_audit_logs table");
  assert.ok(dbLib.includes("recordAdminAuditLog"), "db.ts must implement recordAdminAuditLog");

  // 3. Admin audit logging in moderate actions
  assert.ok(moderateAction.includes("recordAdminAuditLog"), "moderate.ts must record admin audit logs");
  assert.ok(moderateAction.includes("APPROVE_HOUSEHOLD"), "moderate.ts must log APPROVE_HOUSEHOLD");
  assert.ok(moderateAction.includes("REJECT_HOUSEHOLD"), "moderate.ts must log REJECT_HOUSEHOLD");
  assert.ok(moderateAction.includes("APPROVE_ALL_HOUSEHOLDS"), "moderate.ts must log APPROVE_ALL_HOUSEHOLDS");

  // 4. IDOR prevention and bucket pinning
  assert.ok(accountAction.includes("household.verifiedContact !== input.verifiedContact"), "deleteHouseholdAccount must enforce verifiedContact matching");
  assert.ok(storageLib.includes('bucket === "member-photos"'), "deleteMemberPhoto must strictly pin deletion to member-photos bucket");
});

// --- SEAM 19: Registration Draft Auto-Save & Resumption Contract ---
test("Seam 19: Registration draft schema, actions, and client auto-save adhere to contract", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const draftAction = fs.readFileSync(path.join(webRoot, "src/actions/draft.ts"), "utf8");
  const signupPage = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // 1. Schema supports form_data JSONB
  assert.ok(schemaSql.includes("form_data JSONB DEFAULT '{}'::jsonb"), "schema.sql must define form_data JSONB column");
  assert.ok(dbLib.includes("form_data JSONB DEFAULT '{}'::jsonb"), "db.ts ensureSchema must add form_data column");

  // 2. Draft action contracts
  assert.ok(draftAction.includes("formData?: Record<string, any>"), "SaveDraftInput must support formData");
  assert.ok(draftAction.includes("getRegistrationDraft"), "draft.ts must export getRegistrationDraft");
  assert.ok(draftAction.includes("discardRegistrationDraft"), "draft.ts must export discardRegistrationDraft");

  // 3. OWASP Password exclusion guard
  assert.ok(draftAction.includes("delete safeData.password") || draftAction.includes("const { password, confirmPassword"), "draft.ts must strip password before saving");

  // 4. Client auto-save & resumption banner
  assert.ok(signupPage.includes("mafl_signup_draft_v1"), "signup page must persist to mafl_signup_draft_v1");
  assert.ok(signupPage.includes("resumeDraft"), "signup page must manage resumeDraft state");
  assert.ok(signupPage.includes("handleResumeDraft"), "signup page must provide handleResumeDraft");
  assert.ok(signupPage.includes("handleDiscardDraft"), "signup page must provide handleDiscardDraft");
  assert.ok(signupPage.includes("Unfinished Registration Found"), "signup page must render Unfinished Registration Found banner");
  assert.ok(signupPage.includes('localStorage.removeItem("mafl_signup_draft_v1")'), "signup page must purge draft on success or discard");
});

// --- SEAM 20: Gap-Free Serial Number Recycling Engine Contract ---
test("Seam 20: Rejection clears serial numbers and sequence generator reclaims gaps", () => {
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const moderateAction = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");

  // 1. Rejection resets serial numbers to NULL
  assert.ok(
    dbLib.includes("UPDATE households SET status = $1, rejection_reason = $2, serial_no = NULL") &&
    dbLib.includes("UPDATE members SET serial_no = NULL WHERE household_id = $1"),
    "db.ts updateHouseholdStatus must reset serial_no = NULL for both household and members on rejection"
  );
  assert.ok(moderateAction.includes("rejectHousehold"), "moderate.ts must implement rejectHousehold");

  // 2. Gap detection logic in generateNextHouseholdNo & generateNextMemberSerialNo
  assert.ok(
    dbLib.includes("generate_series(bounds.start_num, bounds.max_num) s(n)") &&
    dbLib.includes("WHERE NOT EXISTS (SELECT 1 FROM existing_nums e WHERE e.num = s.n)"),
    "db.ts sequence generators must use gap-filling generate_series NOT EXISTS query"
  );
});

// --- SEAM 21: Rejection Lifecycle Resolution & Resubmission Contract ---
test("Seam 21: Status-aware checkContactRegistration and resubmitHousehold allow seamless resubmission", () => {
  const registerAction = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const signupPage = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // 1. checkContactRegistration detects rejected status and returns canResubmit
  assert.ok(registerAction.includes('existing.status === "rejected"'), "checkContactRegistration must detect rejected household");
  assert.ok(registerAction.includes("canResubmit: true"), "checkContactRegistration must return canResubmit: true");
  assert.ok(registerAction.includes("previousHousehold:"), "checkContactRegistration must return previousHousehold payload");

  // 2. registerHousehold calls resubmitHousehold for rejected records
  assert.ok(registerAction.includes("isRejectedResubmission"), "registerHousehold must check isRejectedResubmission");
  assert.ok(registerAction.includes("db.resubmitHousehold"), "registerHousehold must invoke db.resubmitHousehold");
  assert.ok(dbLib.includes("async resubmitHousehold"), "db.ts must implement resubmitHousehold");

  // 3. Signup UI displays rejection reason and restores prior inputs
  assert.ok(signupPage.includes("rejectionNotice"), "signup page must manage rejectionNotice state");
  assert.ok(signupPage.includes("Updating Previously Rejected Application"), "signup page must render rejection notice banner");
  assert.ok(signupPage.includes("Moderator Feedback:"), "signup page must display moderator feedback reason");
});
// --- SEAM 22: Supabase PostgREST Row-Level Security (RLS) Complete Coverage ---
test("Seam 22: Complete RLS hardening across all application tables in schema.sql and db.ts", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  const expectedTables = [
    "households",
    "members",
    "conversations",
    "messages",
    "message_reports",
    "otp_rate_limits",
    "admin_login_attempts",
    "login_attempts",
    "action_rate_limits",
    "support_inquiries",
    "registration_drafts",
    "admin_audit_logs",
    "matrimonial_profiles",
    "email_queue",
  ];

  for (const table of expectedTables) {
    assert.ok(
      schemaSql.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`),
      `schema.sql must enable RLS for ${table}`
    );
    assert.ok(
      dbLib.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`),
      `db.ts must enable RLS for ${table}`
    );
  }
});

// --- SEAM 23: Outbound Email Queue System, IPv4 DNS Resolution & Rate-Limit Pacing ---
test("Seam 23: Outbound email queue system, Undici IPv4 DNS resolution, and rate-limit pacing adhere to contracts", () => {
  const emailLib = fs.readFileSync(path.join(webRoot, "src/lib/email.ts"), "utf8");
  const emailQueueLib = fs.readFileSync(path.join(webRoot, "src/lib/email-queue.ts"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const moderateActions = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");
  const drainRoute = fs.readFileSync(path.join(webRoot, "src/app/api/admin/email-queue/drain/route.ts"), "utf8");

  // 1. IPv4 DNS enforcement against Undici IPv6 connect timeout
  assert.ok(
    emailLib.includes(`dns.setDefaultResultOrder("ipv4first")`),
    "src/lib/email.ts must set setDefaultResultOrder('ipv4first')"
  );

  // 2. Dispatcher and rate limiter exports
  assert.ok(emailLib.includes("export async function waitForRateLimitPacing"), "src/lib/email.ts must export waitForRateLimitPacing");
  assert.ok(emailLib.includes("export async function dispatchResendEmail"), "src/lib/email.ts must export dispatchResendEmail");

  // 3. Email queue worker engine
  assert.ok(emailQueueLib.includes("export async function enqueueEmail"), "src/lib/email-queue.ts must export enqueueEmail");
  assert.ok(emailQueueLib.includes("export async function drainEmailQueue"), "src/lib/email-queue.ts must export drainEmailQueue");

  // 4. PostgreSQL concurrency safety via FOR UPDATE SKIP LOCKED
  assert.ok(
    dbLib.includes("FOR UPDATE SKIP LOCKED"),
    "src/lib/db.ts claimNextEmailJob must use FOR UPDATE SKIP LOCKED for atomic job leasing"
  );
  assert.ok(dbLib.includes("enqueueEmail("), "src/lib/db.ts must implement enqueueEmail");
  assert.ok(dbLib.includes("markEmailSent("), "src/lib/db.ts must implement markEmailSent");
  assert.ok(dbLib.includes("markEmailFailed("), "src/lib/db.ts must implement markEmailFailed");
  assert.ok(dbLib.includes("getEmailQueueStats("), "src/lib/db.ts must implement getEmailQueueStats");
  assert.ok(dbLib.includes("retryFailedEmailQueueItems("), "src/lib/db.ts must implement retryFailedEmailQueueItems");

  // 5. Moderation admin server actions and RBAC guards
  assert.ok(moderateActions.includes("export async function resendHouseholdPassAction"), "moderate.ts must export resendHouseholdPassAction");
  assert.ok(moderateActions.includes("export async function getEmailQueueStatusAction"), "moderate.ts must export getEmailQueueStatusAction");
  assert.ok(moderateActions.includes("export async function retryFailedEmailsAction"), "moderate.ts must export retryFailedEmailsAction");
  assert.ok(moderateActions.includes("export async function drainEmailQueueAction"), "moderate.ts must export drainEmailQueueAction");

  // 6. Admin API endpoint RBAC and drain connection
  assert.ok(drainRoute.includes("export async function POST"), "email-queue/drain/route.ts must export POST");
  assert.ok(drainRoute.includes(`session?.role !== "admin"`), "email-queue/drain/route.ts must enforce admin privileges");
  assert.ok(drainRoute.includes("drainEmailQueue"), "email-queue/drain/route.ts must call drainEmailQueue");
});

// --- SEAM 24: Global Agarwal Business Network Contract Suite ---
test("Seam 24: Global Agarwal Business Network adheres to all contracts and invariants", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const businessTypes = fs.readFileSync(path.join(webRoot, "src/types/business.ts"), "utf8");
  const businessActions = fs.readFileSync(path.join(webRoot, "src/actions/business.ts"), "utf8");
  const moderateActions = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");
  const topNav = fs.readFileSync(path.join(webRoot, "src/components/layout/TopNavBar.tsx"), "utf8");
  const mainHeader = fs.readFileSync(path.join(webRoot, "src/components/layout/MainHeader.tsx"), "utf8");
  const mainFooter = fs.readFileSync(path.join(webRoot, "src/components/layout/MainFooter.tsx"), "utf8");
  const guidePage = fs.readFileSync(path.join(webRoot, "src/app/guide/page.tsx"), "utf8");
  const businessDirectory = fs.readFileSync(path.join(webRoot, "src/app/businesses/page.tsx"), "utf8");
  const businessShowcase = fs.readFileSync(path.join(webRoot, "src/app/businesses/[id]/page.tsx"), "utf8");
  const businessBuilder = fs.readFileSync(path.join(webRoot, "src/app/businesses/create/page.tsx"), "utf8");

  // 1. Schema & RLS enablement for business_profiles
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS business_profiles"), "schema.sql must define business_profiles");
  assert.ok(schemaSql.includes("ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;"), "schema.sql must enable RLS on business_profiles");
  assert.ok(dbLib.includes("ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;"), "db.ts must enable RLS on business_profiles");
  assert.ok(businessTypes.includes("export interface BusinessProfile"), "business.ts types must export BusinessProfile");

  // 2. Server actions authorization & PII safety
  assert.ok(businessActions.includes("export async function createBusinessProfile"), "Must export createBusinessProfile");
  assert.ok(businessActions.includes("export async function getLiveBusinessProfiles"), "Must export getLiveBusinessProfiles");
  assert.ok(businessActions.includes("export async function getBusinessProfileById"), "Must export getBusinessProfileById");
  assert.ok(businessActions.includes("export async function initiateBusinessChat"), "Must export initiateBusinessChat");
  assert.ok(businessActions.includes("export async function getMyHouseholdBusinesses"), "Must export getMyHouseholdBusinesses");
  assert.ok(moderateActions.includes("export async function approveBusinessProfileAction"), "Must export approveBusinessProfileAction");
  assert.ok(moderateActions.includes("export async function rejectBusinessProfileAction"), "Must export rejectBusinessProfileAction");

  // 3. Navigation links to /businesses across Header and Footer
  assert.ok(mainHeader.includes("/businesses"), "MainHeader must link to /businesses");
  assert.ok(mainFooter.includes("/businesses"), "MainFooter must link to /businesses");

  // 4. Topic 8 in src/app/guide/page.tsx
  assert.ok(guidePage.includes("Topic 8") || guidePage.includes("अग्रवाल व्यापार संजाल") || guidePage.includes("Business Network"), "Guide page must contain Topic 8 for Business Network");
  assert.ok(guidePage.includes("/businesses"), "Guide page must link to /businesses");

  // 5. In-Platform commercial chat routing & visible commercial contacts
  assert.ok(businessShowcase.includes("initiateBusinessChat"), "Showcase must wire initiateBusinessChat");
  assert.ok(!businessShowcase.includes("profile.phone"), "Showcase must not expose raw personal member phone");
  assert.ok(businessShowcase.includes("profile.contactPhone"), "Showcase must expose commercial contact phone");
  assert.ok(businessDirectory.includes("getLiveBusinessProfiles"), "Directory must consume getLiveBusinessProfiles");
  assert.ok(businessBuilder.includes("createBusinessProfile"), "Builder must consume createBusinessProfile");
});

// --- SEAM 25: Global Agarwal Jobs & Careers Network Contract Suite ---
test("Seam 25: Global Agarwal Jobs & Careers Network adheres to all contracts and invariants", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const careerTypes = fs.readFileSync(path.join(webRoot, "src/types/career.ts"), "utf8");
  const careerActions = fs.readFileSync(path.join(webRoot, "src/actions/career.ts"), "utf8");
  const topNav = fs.readFileSync(path.join(webRoot, "src/components/layout/TopNavBar.tsx"), "utf8");
  const mainHeader = fs.readFileSync(path.join(webRoot, "src/components/layout/MainHeader.tsx"), "utf8");
  const mainFooter = fs.readFileSync(path.join(webRoot, "src/components/layout/MainFooter.tsx"), "utf8");
  const pillarsGrid = fs.readFileSync(path.join(webRoot, "src/components/home/SevenPillarsGrid.tsx"), "utf8");
  const guidePage = fs.readFileSync(path.join(webRoot, "src/app/guide/page.tsx"), "utf8");
  const careerDirectory = fs.readFileSync(path.join(webRoot, "src/app/careers/page.tsx"), "utf8");
  const careerProfile = fs.readFileSync(path.join(webRoot, "src/app/careers/[id]/page.tsx"), "utf8");
  const careerBuilder = fs.readFileSync(path.join(webRoot, "src/app/careers/create/page.tsx"), "utf8");
  const jobCreate = fs.readFileSync(path.join(webRoot, "src/app/careers/jobs/create/page.tsx"), "utf8");
  const jobDetail = fs.readFileSync(path.join(webRoot, "src/app/careers/jobs/[id]/page.tsx"), "utf8");
  const dashboardPage = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");

  // 1. Schema & RLS enablement for career_profiles, job_postings, job_applications
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS career_profiles"), "schema.sql must define career_profiles");
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS job_postings"), "schema.sql must define job_postings");
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS job_applications"), "schema.sql must define job_applications");
  assert.ok(schemaSql.includes("ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;"), "schema.sql must enable RLS on career_profiles");
  assert.ok(schemaSql.includes("ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;"), "schema.sql must enable RLS on job_postings");
  assert.ok(schemaSql.includes("ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;"), "schema.sql must enable RLS on job_applications");

  // 2. Types export
  assert.ok(careerTypes.includes("export interface CareerProfile"), "career.ts types must export CareerProfile");
  assert.ok(careerTypes.includes("export interface JobPosting"), "career.ts types must export JobPosting");
  assert.ok(careerTypes.includes("export interface JobApplication"), "career.ts types must export JobApplication");

  // 3. Server actions
  assert.ok(careerActions.includes("createCareerProfileAction"), "Must export createCareerProfileAction");
  assert.ok(careerActions.includes("getLiveCareerProfilesAction"), "Must export getLiveCareerProfilesAction");
  assert.ok(careerActions.includes("createJobPostingAction"), "Must export createJobPostingAction");
  assert.ok(careerActions.includes("applyForJobAction"), "Must export applyForJobAction");

  // 4. Navigation links to /careers across Header and Footer
  assert.ok(mainHeader.includes("/careers"), "MainHeader must link to /careers");
  assert.ok(mainFooter.includes("/careers"), "MainFooter must link to /careers");

  // 5. Pillar 4 in SevenPillarsGrid is LIVE
  assert.ok(pillarsGrid.includes("/careers"), "SevenPillarsGrid must link to /careers");

  // 6. Topic 9 in Guide
  assert.ok(guidePage.includes("careers") && (guidePage.includes("रोजगार व करियर") || guidePage.includes("Jobs & Careers")), "Guide page must contain Topic 9 for Jobs & Careers");
  assert.ok(guidePage.includes("/careers"), "Guide page must link to /careers");

  // 7. Pages wire up actions
  assert.ok(careerDirectory.includes("getLiveCareerProfilesAction"), "Directory must call getLiveCareerProfilesAction");
  assert.ok(careerProfile.includes("getCareerProfileByIdAction"), "Profile must call getCareerProfileByIdAction");
  assert.ok(careerBuilder.includes("createCareerProfileAction"), "Builder must call createCareerProfileAction");
  assert.ok(jobCreate.includes("createJobPostingAction"), "Job create must call createJobPostingAction");
  assert.ok(jobDetail.includes("applyForJobAction"), "Job detail must call applyForJobAction");

  // 8. Dashboard integration
  assert.ok(dashboardPage.includes("/careers/create"), "Dashboard must link to career create");
  assert.ok(dashboardPage.includes("/careers/jobs/create"), "Dashboard must link to job create");
});

test("Seam 26: Admin-Assisted Delegated Profile Creation adheres to contracts and security invariants", () => {
  const adminActionsPath = path.join(webRoot, "src/actions/admin-profiles.ts");
  const adminCompPath = path.join(webRoot, "src/components/admin/AdminAssistedProfilesCreator.tsx");
  const modPagePath = path.join(webRoot, "src/app/admin/moderation/page.tsx");

  assert.ok(fs.existsSync(adminActionsPath), "src/actions/admin-profiles.ts must exist");
  assert.ok(fs.existsSync(adminCompPath), "src/components/admin/AdminAssistedProfilesCreator.tsx must exist");
  assert.ok(fs.existsSync(modPagePath), "src/app/admin/moderation/page.tsx must exist");

  const actionsCode = fs.readFileSync(adminActionsPath, "utf8");
  const compCode = fs.readFileSync(adminCompPath, "utf8");
  const modCode = fs.readFileSync(modPagePath, "utf8");

  // 1. Exported server actions
  assert.ok(actionsCode.includes("searchMembersForAdminAction"), "Must export searchMembersForAdminAction");
  assert.ok(actionsCode.includes("adminCreateMatrimonyProfileAction"), "Must export adminCreateMatrimonyProfileAction");
  assert.ok(actionsCode.includes("adminCreateCareerProfileAction"), "Must export adminCreateCareerProfileAction");
  assert.ok(actionsCode.includes("adminCreateBusinessProfileAction"), "Must export adminCreateBusinessProfileAction");

  // 2. Security guards & audit logging
  assert.ok(actionsCode.includes('session?.role !== "admin"'), "Must guard actions with session.role !== 'admin'");
  assert.ok(actionsCode.includes("recordAdminAuditLog"), "Must record audit trail in admin_action_logs");
  assert.ok(actionsCode.includes("ADMIN_CREATE_MATRIMONY_PROFILE"), "Must log matrimony profile creation");
  assert.ok(actionsCode.includes("ADMIN_CREATE_CAREER_PROFILE"), "Must log career profile creation");
  assert.ok(actionsCode.includes("ADMIN_CREATE_BUSINESS_PROFILE"), "Must log business profile creation");

  // 3. UI Integration
  assert.ok(modCode.includes("AdminAssistedProfilesCreator"), "Admin moderation page must render AdminAssistedProfilesCreator");
  assert.ok(modCode.includes("Create on Behalf") || modCode.includes("assisted"), "Admin moderation page must have Create on Behalf tab");
  assert.ok(compCode.includes("matrimony") && compCode.includes("career") && compCode.includes("business"), "AdminAssistedProfilesCreator must support matrimony, career, and business profiles");
});

test("Seam 27: Nullable DOB and non-mandatory photos across schema and helpers", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // Schema must not enforce NOT NULL on dob
  assert.ok(!schemaSql.includes("dob DATE NOT NULL"), "schema.sql must not enforce NOT NULL on dob");
  assert.ok(dbCode.includes("ALTER TABLE members ALTER COLUMN dob DROP NOT NULL"), "db.ts must idempotently drop NOT NULL on members.dob");
  assert.ok(dbCode.includes("ALTER TABLE matrimonial_profiles ALTER COLUMN dob DROP NOT NULL"), "db.ts must idempotently drop NOT NULL on matrimonial_profiles.dob");
});

test("Seam 28: Signup page allows DOB to be omitted or marked as Not specified", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // Step 2 Head DOB validation must not block when empty
  assert.ok(!signupCode.includes('Please enter a valid Date of Birth (जन्म तिथि) for the Head of Household.'), "Head DOB must not be blocking");
  // Step 3 Member DOB validation must not block when empty
  assert.ok(!signupCode.includes('Please enter Date of Birth for ${m.fullName'), "Member DOB must not be blocking");
  // UI must include Not specified control
  assert.ok(signupCode.includes("Not specified") || signupCode.includes("ज्ञात नहीं"), "Must render Not specified control");
});

test("Seam 29: Matrimony profile allows optional photos and optional DOB", () => {
  const matrimonyActionCode = fs.readFileSync(path.join(webRoot, "src/actions/matrimony.ts"), "utf8");
  const matrimonyCreateCode = fs.readFileSync(path.join(webRoot, "src/app/matrimony/create/page.tsx"), "utf8");

  // Server action must not require DOB or photos
  assert.ok(!matrimonyActionCode.includes('return { success: false, error: "Date of Birth is required." };'), "Matrimony action must not enforce DOB required");
  // UI must not block submit when photos.length === 0
  assert.ok(!matrimonyCreateCode.includes('Please upload at least 1 portrait photograph for the matrimonial biodata.'), "Matrimony form must not enforce photo upload");
  // UI must not have mandatory asterisks on photos or DOB
  assert.ok(!matrimonyCreateCode.includes('Candidate Photographs (2-3 तस्वीरें) *'), "Photo section must not have asterisk");
  assert.ok(!matrimonyCreateCode.includes('Date of Birth *'), "DOB section must not have asterisk");
});

test("Seam 30: Dashboard and guide support Not specified DOB and optional photos", () => {
  const dashboardCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");
  const guideCode = fs.readFileSync(path.join(webRoot, "src/app/guide/page.tsx"), "utf8");

  assert.ok(dashboardCode.includes("Not specified") || dashboardCode.includes("ज्ञात नहीं"), "Dashboard must provide Not specified DOB toggle");
  assert.ok(!guideCode.includes("photograph is required for each member to generate their official ID card"), "Guide must not claim photo is strictly required");
});

test("Seam 31: Nullable DOB/photo updates in db.ts and dashboard isHeadUser permission scoping", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const profileActionCode = fs.readFileSync(path.join(webRoot, "src/actions/profile.ts"), "utf8");
  const dashboardCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");

  // 1. db.ts supports clearing photo_url and dob to NULL conditionally
  assert.ok(dbCode.includes("photo_url = CASE WHEN $20::boolean THEN $4 ELSE photo_url END"), "db.ts must conditionally clear photo_url when explicitly passed");
  assert.ok(dbCode.includes("dob = CASE WHEN $21::boolean THEN $5 ELSE dob END"), "db.ts must conditionally clear dob when explicitly passed");

  // 2. profile.ts sends null when dob or photoUrl is cleared
  assert.ok(profileActionCode.includes("photoUrl?: string | null") && profileActionCode.includes("dob?: string | null"), "profile.ts UpdateProfileInput must allow null for photoUrl and dob");

  // 3. dashboard/page.tsx enforces isHeadUser permission scoping
  assert.ok(dashboardCode.includes("const isHeadUser = Boolean("), "dashboard/page.tsx must calculate isHeadUser");
  assert.ok(dashboardCode.includes("canEditThisMember = isHeadUser ?"), "dashboard/page.tsx must guard canEditThisMember using isHeadUser");
  assert.ok(dashboardCode.includes("canInviteThisMember = isHeadUser"), "dashboard/page.tsx must restrict Invite to Claim to isHeadUser");
});

// --- SEAM 32: Non-mandatory Aadhaar and Photo for Head & Member Registration ---
test("Seam 32: Non-mandatory Aadhaar and profile photo for Head and all family members", () => {
  const registerActionCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const signupPageCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // 1. Aadhaar is not mandatory in signup Step 2 (Head)
  assert.ok(!signupPageCode.includes('Aadhaar Number (12-Digit) *'), "Head Aadhaar label must not have asterisk");
  assert.ok(signupPageCode.includes('if (aadhaarNumber.trim())'), "Head Aadhaar validation must only run if provided");
  assert.ok(!signupPageCode.includes('!aadhaarNumber.trim()'), "Head Aadhaar must not block when empty");

  // 2. Aadhaar is not mandatory in signup Step 3 (Members)
  assert.ok(!signupPageCode.includes('Aadhaar Card Number (आधार नंबर) *'), "Member Aadhaar label must not have asterisk");
  assert.ok(signupPageCode.includes('if (m.aadhaarNumber && m.aadhaarNumber.trim())'), "Member Aadhaar validation must only run if provided");

  // 3. Backend register.ts enforces Aadhaar as strictly optional
  assert.ok(registerActionCode.includes('if (cleanAadhaar)'), "Backend Head Aadhaar check must be conditional on presence");
  assert.ok(registerActionCode.includes('if (m.aadhaarNumber && m.aadhaarNumber.trim())'), "Backend Member Aadhaar check must be conditional on presence");
  assert.ok(!registerActionCode.includes('Aadhaar Number is required for Head'), "Backend must not require Head Aadhaar");
  assert.ok(!registerActionCode.includes('Aadhaar Number is required for member'), "Backend must not require Member Aadhaar");

  // 4. Photo is not mandatory in signup Step 2 (Head) & Step 3 (Members)
  assert.ok(!signupPageCode.includes('Profile Photo (मुखिया का फोटो) *'), "Head Photo must not have asterisk");
  assert.ok(!signupPageCode.includes('Member Profile Photo (सदस्य का फोटो) *'), "Member Photo must not have asterisk");
  assert.ok(!signupPageCode.includes('!headPhotoUrl.trim()'), "Head photo must not block Step 2 submission");
  assert.ok(!signupPageCode.includes('!m.photoUrl.trim()'), "Member photo must not block Step 3 submission");

  // 5. Backend register.ts enforces Photo as strictly optional
  assert.ok(registerActionCode.includes('if (m.photoUrl && m.photoUrl.trim()'), "Backend photo check must be conditional on presence");
  assert.ok(!registerActionCode.includes('A recent profile photograph is mandatory'), "Backend must not enforce mandatory photo");
});

test("Seam 36: Registration email input hardening, typo suggestions, and canonical normalization", () => {
  const registerActionCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const signupPageCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");
  const claimActionCode = fs.readFileSync(path.join(webRoot, "src/actions/claim.ts"), "utf8");
  const emailValCode = fs.readFileSync(path.join(webRoot, "src/lib/email-validation.ts"), "utf8");

  // 1. Shared validator exports
  assert.ok(emailValCode.includes("export function validateEmail"), "Must export validateEmail");
  assert.ok(emailValCode.includes("export function normalizeEmail"), "Must export normalizeEmail");
  assert.ok(emailValCode.includes("export function suggestDomainCorrection"), "Must export suggestDomainCorrection");

  // 2. Client signup integration
  assert.ok(signupPageCode.includes("validateEmail"), "signup page must use validateEmail");
  assert.ok(signupPageCode.includes("emailSuggestion"), "signup page must manage emailSuggestion state");
  assert.ok(signupPageCode.includes("handleAcceptEmailSuggestion") || signupPageCode.includes("handleDeclineEmailSuggestion"), "signup page must support explicit accept/decline");
  assert.ok(signupPageCode.includes("Keep entered"), "signup page must offer explicit 'Keep entered' option");

  // 3. Backend registration integration
  assert.ok(registerActionCode.includes("validateEmail(rawHeadEmail)"), "Backend must validate Head email");
  assert.ok(registerActionCode.includes("validateEmail(m.email)"), "Backend must validate member email");
  assert.ok(registerActionCode.includes("normalizeEmail"), "Backend must use normalizeEmail");
  assert.ok(claimActionCode.includes("normalizeEmail"), "Claim action must use normalizeEmail for availability checks");
});

// --- SEAM 37: Member-Authorized Admin Support Sessions & Personal Detail Corrections ---
test("Seam 37: Member-Authorized Admin Support Sessions & Personal Detail Corrections (AWB-8)", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const actionCode = fs.readFileSync(path.join(webRoot, "src/actions/support-session.ts"), "utf8");
  const typesCode = fs.readFileSync(path.join(webRoot, "src/types/support-session.ts"), "utf8");

  // 1. Database schema defines admin_support_sessions and admin_support_audit_logs in schema.sql & db.ts
  assert.ok(
    schemaSql.includes("CREATE TABLE IF NOT EXISTS admin_support_sessions"),
    "schema.sql must create admin_support_sessions table"
  );
  assert.ok(
    schemaSql.includes("CREATE TABLE IF NOT EXISTS admin_support_audit_logs"),
    "schema.sql must create admin_support_audit_logs table"
  );
  assert.ok(
    dbLib.includes("CREATE TABLE IF NOT EXISTS admin_support_sessions"),
    "db.ts ensureSchema must create admin_support_sessions table"
  );
  assert.ok(
    dbLib.includes("CREATE TABLE IF NOT EXISTS admin_support_audit_logs"),
    "db.ts ensureSchema must create admin_support_audit_logs table"
  );

  // 2. RLS enabled on both tables in schema.sql and db.ts
  assert.ok(
    schemaSql.includes("ALTER TABLE admin_support_sessions ENABLE ROW LEVEL SECURITY;"),
    "schema.sql must enable RLS on admin_support_sessions"
  );
  assert.ok(
    schemaSql.includes("ALTER TABLE admin_support_audit_logs ENABLE ROW LEVEL SECURITY;"),
    "schema.sql must enable RLS on admin_support_audit_logs"
  );
  assert.ok(
    dbLib.includes("ALTER TABLE admin_support_sessions ENABLE ROW LEVEL SECURITY;"),
    "db.ts ensureSchema must enable RLS on admin_support_sessions"
  );
  assert.ok(
    dbLib.includes("ALTER TABLE admin_support_audit_logs ENABLE ROW LEVEL SECURITY;"),
    "db.ts ensureSchema must enable RLS on admin_support_audit_logs"
  );

  // 3. Server actions exported in support-session.ts
  assert.ok(
    actionCode.includes("export async function requestAdminSupportSession"),
    "support-session.ts must export requestAdminSupportSession"
  );
  assert.ok(
    actionCode.includes("export async function verifyAdminSupportSession"),
    "support-session.ts must export verifyAdminSupportSession"
  );
  assert.ok(
    actionCode.includes("export async function getActiveSupportSessionAction"),
    "support-session.ts must export getActiveSupportSessionAction"
  );
  assert.ok(
    actionCode.includes("export async function adminCorrectMemberDetailsAction"),
    "support-session.ts must export adminCorrectMemberDetailsAction"
  );
  assert.ok(
    actionCode.includes("export async function revokeAdminSupportSessionAction"),
    "support-session.ts must export revokeAdminSupportSessionAction"
  );
  assert.ok(
    actionCode.includes("export async function getSupportAuditLogsAction"),
    "support-session.ts must export getSupportAuditLogsAction"
  );

  // 4. Aliases exported for developer ergonomics
  assert.ok(
    actionCode.includes("export const getActiveSupportSession = getActiveSupportSessionAction"),
    "support-session.ts must export getActiveSupportSession alias"
  );
  assert.ok(
    actionCode.includes("export const adminCorrectMemberDetails = adminCorrectMemberDetailsAction"),
    "support-session.ts must export adminCorrectMemberDetails alias"
  );
  assert.ok(
    actionCode.includes("export const revokeAdminSupportSession = revokeAdminSupportSessionAction"),
    "support-session.ts must export revokeAdminSupportSession alias"
  );
  assert.ok(
    actionCode.includes("export const getSupportAuditLogs = getSupportAuditLogsAction"),
    "support-session.ts must export getSupportAuditLogs alias"
  );

  // 5. Types exported
  assert.ok(typesCode.includes("export interface AdminSupportSession"), "types must export AdminSupportSession");
  assert.ok(typesCode.includes("export interface AdminSupportAuditLog"), "types must export AdminSupportAuditLog");
});

// --- SEAM 38: Unified Platform Audit Trail & Admin Audit Table ---
test("Seam 38: Unified Platform Audit Trail & Admin Audit Table architecture", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbLib = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");
  const auditAction = fs.readFileSync(path.join(webRoot, "src/actions/audit.ts"), "utf8");
  const auditTypes = fs.readFileSync(path.join(webRoot, "src/types/audit.ts"), "utf8");
  const auditPage = fs.readFileSync(path.join(webRoot, "src/app/admin/audit/page.tsx"), "utf8");
  const moderationPage = fs.readFileSync(path.join(webRoot, "src/app/admin/moderation/page.tsx"), "utf8");

  // 1. Schema & View definitions
  assert.ok(schemaSql.includes("view_platform_audit_trail"), "schema.sql must create unified audit view");
  assert.ok(schemaSql.includes("prevent_audit_log_mutation"), "schema.sql must define immutability trigger");
  assert.ok(dbLib.includes("view_platform_audit_trail"), "db.ts must create unified audit view");
  assert.ok(dbLib.includes("recordPlatformAuditLog"), "db.ts must export recordPlatformAuditLog");
  assert.ok(dbLib.includes("getUnifiedAuditTrail"), "db.ts must export getUnifiedAuditTrail");

  // 2. Server actions
  assert.ok(auditAction.includes("getAuditTrailLogsAction"), "audit.ts must export getAuditTrailLogsAction");
  assert.ok(auditAction.includes("exportAuditTrailCsvAction"), "audit.ts must export exportAuditTrailCsvAction");
  assert.ok(auditAction.includes("getAuditTrailStatsAction"), "audit.ts must export getAuditTrailStatsAction");

  // 3. Types
  assert.ok(auditTypes.includes("AuditTrailItem"), "types/audit.ts must define AuditTrailItem");
  assert.ok(auditTypes.includes("AuditCategory"), "types/audit.ts must define AuditCategory");

  // 4. Admin Routing & Moderation Integration
  assert.ok(auditPage.includes("AdminAuditExplorer"), "admin/audit/page.tsx must embed AdminAuditExplorer");
  assert.ok(moderationPage.includes("AdminAuditExplorer"), "moderation/page.tsx must embed AdminAuditExplorer");
  assert.ok(moderationPage.includes("Audit Trail") || moderationPage.includes("Audit Logs"), "moderation/page.tsx must feature an Audit Trail tab/button");
});

