import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 011: getModerationHouseholds() must enforce session admin role check", () => {
  const moderateCode = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");
  
  // Locate getModerationHouseholds function body
  const fnIndex = moderateCode.indexOf("export async function getModerationHouseholds");
  assert.ok(fnIndex !== -1, "getModerationHouseholds must exist");
  
  const fnBody = moderateCode.slice(fnIndex, fnIndex + 300);
  assert.ok(
    fnBody.includes("getSession") && fnBody.includes('session?.role !== "admin"'),
    "getModerationHouseholds must verify admin session before returning records"
  );
});

test("Issue 011: getMemberProfile() in search.ts must sanitize member profiles", () => {
  const searchCode = fs.readFileSync(path.join(webRoot, "src/actions/search.ts"), "utf8");
  
  const fnIndex = searchCode.indexOf("export async function getMemberProfile");
  assert.ok(fnIndex !== -1, "getMemberProfile must exist");
  
  const fnBody = searchCode.slice(fnIndex, fnIndex + 600);
  assert.ok(
    fnBody.includes("sanitizeMemberProfile"),
    "getMemberProfile must sanitize member profile at the server response boundary"
  );
  assert.ok(
    searchCode.includes('import { sanitizeMemberProfile } from "@/lib/privacy"') ||
    searchCode.includes("import { sanitizeMemberProfile } from '../lib/privacy'"),
    "search.ts must import sanitizeMemberProfile"
  );
});
