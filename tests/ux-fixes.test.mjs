import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 1: Signup page includes Toast notification for validation errors", () => {
  const signupPath = path.join(webRoot, "src/app/signup/page.tsx");
  const code = fs.readFileSync(signupPath, "utf8");

  assert.ok(code.includes("showToast") || code.includes("toast"), "Must have toast notification state/function");
  assert.ok(code.includes("Toast") || code.includes("role=\"alert\"") || code.includes("fixed top-"), "Must render floating toast alert");
});

test("Issue 2: Directory search excludes current session member from results", () => {
  const searchPath = path.join(webRoot, "src/actions/search.ts");
  const code = fs.readFileSync(searchPath, "utf8");

  assert.ok(code.includes("getSession"), "Must get session in searchDirectory");
  assert.ok(code.includes("session.userId") || code.includes("session?.userId"), "Must check session.userId");
  assert.ok(code.includes("!== String(session.userId)") || code.includes("!== session.userId") || code.includes("!= session.userId"), "Must filter out current user");
});

test("Issue 3: Messages dashboard supports starting new conversations with initial recipient", () => {
  const msgPath = path.join(webRoot, "src/app/dashboard/messages/page.tsx");
  const code = fs.readFileSync(msgPath, "utf8");

  assert.ok(code.includes("recipient") || code.includes("initialRecipientId"), "Must read recipient query param");
  assert.ok(code.includes("getMemberProfile") || code.includes("isNewDraft") || code.includes("draft") || code.includes("recipientMemberId"), "Must support initializing new draft conversation");
  assert.ok(code.includes("Start New") || code.includes("Browse Directory") || code.includes("directory"), "Must guide user to start new chat");
});
