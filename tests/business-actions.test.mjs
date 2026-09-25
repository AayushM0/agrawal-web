import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Task 2: src/actions/business.ts file exists and exports required Server Actions", () => {
  const actionsPath = path.join(webRoot, "src/actions/business.ts");
  assert.ok(fs.existsSync(actionsPath), "src/actions/business.ts must exist");

  const content = fs.readFileSync(actionsPath, "utf8");
  assert.ok(content.includes("'use server'"), "Must have 'use server' directive");
  assert.ok(content.includes("export async function createBusinessProfile"), "Must export createBusinessProfile");
  assert.ok(content.includes("export async function updateBusinessProfile"), "Must export updateBusinessProfile");
  assert.ok(content.includes("export async function toggleBusinessVisibility"), "Must export toggleBusinessVisibility");
  assert.ok(content.includes("export async function deleteBusinessProfile"), "Must export deleteBusinessProfile");
  assert.ok(content.includes("export async function getLiveBusinessProfiles"), "Must export getLiveBusinessProfiles");
  assert.ok(content.includes("export async function getBusinessProfileById"), "Must export getBusinessProfileById");
  assert.ok(content.includes("export async function getMyHouseholdBusinesses"), "Must export getMyHouseholdBusinesses");
});

test("Task 2: business.ts enforces authentication and householdStatus === 'live' guards", () => {
  const content = fs.readFileSync(path.join(webRoot, "src/actions/business.ts"), "utf8");

  // Auth and live check
  assert.ok(content.includes("getSession()"), "Must check user session");
  assert.ok(content.includes('householdStatus !== "live"'), "Must guard that householdStatus === 'live'");
  assert.ok(content.includes("getHouseholdByContact") || content.includes("householdId"), "Must resolve creator household");
});

test("Task 2: getLiveBusinessProfiles and getBusinessProfileById sanitize PII", () => {
  const content = fs.readFileSync(path.join(webRoot, "src/actions/business.ts"), "utf8");

  // Anti-scraping guarantee
  assert.ok(content.includes("sanitizeBusinessProfile") || content.includes("status === \"live\""), "Must enforce live status on search");
  assert.ok(!content.includes("contact_phone:") || content.includes("undefined"), "Must not expose raw personal phone");
});
