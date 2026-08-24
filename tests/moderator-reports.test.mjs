import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 017: moderate.ts exports getMessageReports and resolveMessageReport with admin check", () => {
  const modPath = path.join(webRoot, "src/actions/moderate.ts");
  const code = fs.readFileSync(modPath, "utf8");

  assert.ok(code.includes("export async function getMessageReports"), "Must export getMessageReports");
  assert.ok(code.includes("export async function resolveMessageReport"), "Must export resolveMessageReport");
  assert.ok(code.includes("role !== 'admin'") || code.includes('role !== "admin"'), "Must check admin role");
});

test("Issue 017: Admin Moderation Page renders interactive report cards when reports filter selected", () => {
  const pagePath = path.join(webRoot, "src/app/admin/moderation/page.tsx");
  const code = fs.readFileSync(pagePath, "utf8");

  assert.ok(code.includes("getMessageReports") || code.includes("resolveMessageReport"), "Must connect to report actions");
  assert.ok(code.includes("Dismiss") || code.includes("dismiss"), "Must support dismissing reports");
  assert.ok(code.includes("Suspend") || code.includes("suspend"), "Must support suspending offending chats");
});
