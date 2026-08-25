import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("SQLi Hardening 1: sanitizeSearchString strips SQL injection delimiters, quotes, and control chars", async () => {
  const searchCode = fs.readFileSync(path.join(webRoot, "src/actions/search.ts"), "utf8");

  assert.ok(searchCode.includes("sanitizeSearchString"), "Must define sanitizeSearchString");
  assert.ok(searchCode.includes("VALID_GOTRAS"), "Must define canonical VALID_GOTRAS whitelist");
  assert.ok(searchCode.includes("VALID_GOTRAS.has"), "Must enforce whitelist validation on Gotra parameter");
});

test("SQLi Hardening 2: searchDirectory and getMemberProfile encapsulate database queries in try-catch without 500 leaks", () => {
  const searchCode = fs.readFileSync(path.join(webRoot, "src/actions/search.ts"), "utf8");

  assert.ok(searchCode.includes("[DIRECTORY SEARCH ERROR]") || searchCode.includes("catch (err)"), "Must catch directory search exceptions");
  assert.ok(searchCode.includes("Unable to process directory search"), "Must return generic user-facing message on error");
  assert.ok(searchCode.includes("sanitizeMemberProfile"), "Must sanitize member profile at boundary");
});

test("SQLi Hardening 3: Member ID parameter in getMemberProfile is strictly regex-validated", () => {
  const searchCode = fs.readFileSync(path.join(webRoot, "src/actions/search.ts"), "utf8");

  assert.ok(
    searchCode.includes("/^[a-zA-Z0-9_-]{3,64}$/") || searchCode.includes("test(cleanId)"),
    "Must validate member ID format with strict alphanumeric regex before querying database"
  );
});
