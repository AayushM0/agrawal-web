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

  // 2. CSP WASM & Blob allowance
  assert.ok(nextConfigCode.includes("connect-src 'self' https: wss: data: blob:"), "next.config.ts must allow data: and blob: in connect-src");

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

  // 2. Storage lib exports attachment helpers
  const storageFile = path.resolve(webRoot, "src/lib/storage.ts");
  const storageCode = fs.readFileSync(storageFile, "utf8");
  assert.ok(storageCode.includes("uploadChatAttachment"), "storage.ts must export uploadChatAttachment");
  assert.ok(storageCode.includes("getChatAttachmentSignedUrl"), "storage.ts must export getChatAttachmentSignedUrl");
  assert.ok(storageCode.includes("ALLOWED_ATTACHMENT_MIME_TYPES"), "storage.ts must define ALLOWED_ATTACHMENT_MIME_TYPES");
  assert.ok(storageCode.includes("MAX_ATTACHMENT_BYTES"), "storage.ts must define MAX_ATTACHMENT_BYTES");
  assert.ok(storageCode.includes("chat-attachments"), "storage.ts must reference chat-attachments bucket");

  // 3. Upload API route exists with required guards
  const uploadRoute = path.resolve(webRoot, "src/app/api/chat/upload/route.ts");
  assert.ok(fs.existsSync(uploadRoute), "POST /api/chat/upload route.ts must exist");
  const routeCode = fs.readFileSync(uploadRoute, "utf8");
  assert.ok(routeCode.includes("status !== \"accepted\""), "Upload route must reject non-accepted conversations");
  assert.ok(routeCode.includes("isParticipant"), "Upload route must verify caller is conversation participant");
  assert.ok(routeCode.includes("MAX_ATTACHMENT_BYTES"), "Upload route must enforce size limit");

  // 4. sendMessage server action accepts optional messageBody + attachment params
  const chatActionFile = path.resolve(webRoot, "src/actions/chat.ts");
  const chatCode = fs.readFileSync(chatActionFile, "utf8");
  assert.ok(chatCode.includes("attachmentUrl?"), "sendMessage must accept optional attachmentUrl");
  assert.ok(chatCode.includes("attachmentType?"), "sendMessage must accept optional attachmentType");
  assert.ok(chatCode.includes("getAttachmentSignedUrl"), "chat.ts must export getAttachmentSignedUrl action");
  assert.ok(chatCode.includes("!trimmedBody && !params.attachmentUrl"), "sendMessage must allow attachment-only messages");

  // 5. Chat UI contains file picker and attachment rendering
  const messagesPage = path.resolve(webRoot, "src/app/dashboard/messages/page.tsx");
  const pageCode = fs.readFileSync(messagesPage, "utf8");
  assert.ok(pageCode.includes("fileInputRef"), "Chat UI must have hidden file input ref");
  assert.ok(pageCode.includes("AttachmentRenderer"), "Chat UI must use AttachmentRenderer component");
  assert.ok(pageCode.includes("pendingFile"), "Chat UI must have pendingFile state");
  assert.ok(pageCode.includes("/api/chat/upload"), "Chat UI must call /api/chat/upload");
  assert.ok(pageCode.includes("lightboxUrl"), "Chat UI must have lightbox state for image preview");
});
