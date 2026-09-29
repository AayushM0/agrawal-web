import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("authentication actions do not export a caller-controlled session issuer", () => {
  const auth = read("src/actions/auth.ts");
  assert.ok(!auth.includes("export async function createSession"));
  assert.ok(!auth.includes("export async function loginWithVerifiedContact"));
});

test("business social links are validated before public rendering", () => {
  const actions = read("src/actions/business.ts");
  const page = read("src/app/businesses/[id]/page.tsx");
  assert.ok(actions.includes("sanitizeSocialLinks"));
  assert.ok(page.includes("isSafeExternalUrl"));
});
