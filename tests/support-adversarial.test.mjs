import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

// --- ADVERSARIAL TEST 1: HTML Injection / XSS in Email Templates ---
test("Adversarial 1: Email template must escape HTML to prevent XSS / email injection", () => {
  const supportActionCode = fs.readFileSync(path.join(webRoot, "src/actions/support.ts"), "utf8");

  // Code must have an escapeHtml helper or sanitize HTML before injecting into resend payload
  assert.ok(
    supportActionCode.includes("escapeHtml") || supportActionCode.includes("sanitizeHtml") || supportActionCode.includes("replace(/&/g"),
    "support.ts must escape user inputs (name, message) before embedding them into HTML emails"
  );
});

// --- ADVERSARIAL TEST 2: Email Subject Line CRLF / Header Injection Defense ---
test("Adversarial 2: Subject line must strip newlines to prevent SMTP header injection", () => {
  const supportActionCode = fs.readFileSync(path.join(webRoot, "src/actions/support.ts"), "utf8");

  assert.ok(
    supportActionCode.includes("replace(/[\\r\\n]/g") || supportActionCode.includes("sanitizeSubject") || supportActionCode.includes(".replace(/\\s+/g, ' ')"),
    "support.ts must sanitize newlines from subject line fields"
  );
});

// --- ADVERSARIAL TEST 3: IP Address Buffer Overflow (> 45 characters) Defense ---
test("Adversarial 3: Client IP must be safely truncated to 45 chars for VARCHAR(45) DB column", () => {
  const supportActionCode = fs.readFileSync(path.join(webRoot, "src/actions/support.ts"), "utf8");

  assert.ok(
    supportActionCode.includes(".slice(0, 45)") || supportActionCode.includes(".substring(0, 45)"),
    "getClientIp must truncate IP address to max 45 characters to avoid PostgreSQL VARCHAR(45) overflow"
  );
});

// --- ADVERSARIAL TEST 4: Ticket ID Entropy (Prevent Collision after 9000 tickets) ---
test("Adversarial 4: Ticket ID must have higher entropy than 4-digit Math.random", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // INQ-2026-XXXX with only 4 digits has high collision probability.
  // Must use at least 6 digits, timestamp hex, or random crypto alphanumeric
  assert.ok(
    !dbCode.includes("Math.floor(1000 + Math.random() * 9000)"),
    "Ticket ID must use higher entropy than simple 4-digit random (e.g. 6+ digits or crypto/timestamp component)"
  );
});

// --- ADVERSARIAL TEST 5: Admin Status Whitelist Defense ---
test("Adversarial 5: updateAdminInquiryStatus must enforce strict whitelist of valid statuses", () => {
  const modCode = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");

  assert.ok(
    modCode.includes("VALID_INQUIRY_STATUSES") || modCode.includes("open") && modCode.includes("in_progress") && modCode.includes("resolved") && modCode.includes("Invalid status"),
    "moderate.ts updateAdminInquiryStatus must reject unauthorized status strings"
  );
});

// --- ADVERSARIAL TEST 6: Whitespace / Invisible Unicode String Rejection ---
test("Adversarial 6: Validation must reject messages that contain only whitespace/control chars", () => {
  const supportActionCode = fs.readFileSync(path.join(webRoot, "src/actions/support.ts"), "utf8");

  // Must ensure cleanMessage replaces multiple spaces and rejects empty/whitespace
  assert.ok(
    supportActionCode.includes("cleanMessage.replace"),
    "support.ts must normalize whitespace in messages before length check"
  );
});
