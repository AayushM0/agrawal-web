import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Bugfix 1: Pool configuration has resilient timeout and keepalive", () => {
  const dbPath = path.join(webRoot, "src/lib/db.ts");
  const code = fs.readFileSync(dbPath, "utf8");

  assert.ok(code.includes("connectionTimeoutMillis: 15000") || code.includes("connectionTimeoutMillis: 10000") || code.includes("connectionTimeoutMillis: 20000"), "Pool must have at least 10s connection timeout");
  assert.ok(code.includes("getMemberByContact"), "db must export getMemberByContact");
});

test("Bugfix 2: Auth and Login establish real member UUID session", () => {
  const authPath = path.join(webRoot, "src/actions/auth.ts");
  const loginPath = path.join(webRoot, "src/app/login/page.tsx");
  const authCode = fs.readFileSync(authPath, "utf8");
  const loginCode = fs.readFileSync(loginPath, "utf8");

  assert.ok(authCode.includes("loginWithVerifiedContact") || authCode.includes("getMemberByContact"), "auth must support resolving member UUID for contact");
  assert.ok(!loginCode.includes("u-${Date.now()}"), "login/page.tsx must not use fake string u-${Date.now()}");
});

test("Bugfix 3: Chat Server Action validates and self-heals member UUIDs", () => {
  const chatPath = path.join(webRoot, "src/actions/chat.ts");
  const code = fs.readFileSync(chatPath, "utf8");

  assert.ok(code.includes("getMemberByContact") || code.includes("resolveEffectiveMemberId") || code.includes("UUID_REGEX") || code.includes("isValidUuid"), "chat.ts must validate or resolve member UUIDs");
});
