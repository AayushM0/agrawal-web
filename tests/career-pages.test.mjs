import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 047 - Task 3: /careers directory page renders search, domain pills, and gotra filter", () => {
  const dirPath = path.join(webRoot, "src/app/careers/page.tsx");
  assert.ok(fs.existsSync(dirPath), "src/app/careers/page.tsx must exist");

  const content = fs.readFileSync(dirPath, "utf8");
  assert.ok(content.includes("getLiveCareerProfilesAction"), "Must call getLiveCareerProfilesAction");
  assert.ok(content.includes("DOMAIN_OPTIONS") || content.includes("primaryDomain"), "Must provide domain filter");
  assert.ok(content.includes("gotras") || content.includes("Gotra"), "Must provide Gotra filter");
  assert.ok(content.includes("searchTerm") || content.includes("query"), "Must provide search input");
  assert.ok(content.includes("isMentorAvailable") || content.includes("Mentorship"), "Must provide mentorship filter");
  assert.ok(content.includes("export default"), "Must export default page component");
});

test("Issue 047 - Task 3: /careers/[id] profile showcase page renders verified community details", () => {
  const showPath = path.join(webRoot, "src/app/careers/[id]/page.tsx");
  assert.ok(fs.existsSync(showPath), "src/app/careers/[id]/page.tsx must exist");

  const content = fs.readFileSync(showPath, "utf8");
  assert.ok(content.includes("getCareerProfileByIdAction"), "Must call getCareerProfileByIdAction");
  assert.ok(content.includes("headline"), "Must render professional headline");
  assert.ok(content.includes("gotra") || content.includes("Gotra"), "Must display verified gotra");
  assert.ok(content.includes("nativePlace") || content.includes("Native"), "Must display ancestral native place");
  assert.ok(content.includes("skills"), "Must display skills tags");
  assert.ok(content.includes("Request Connection") || content.includes("Connect") || content.includes("Message"), "Must provide in-platform connection request action");
  assert.ok(content.includes("export default"), "Must export default page component");
});

test("Issue 047 - Task 3: server actions strictly enforce PII contact masking and confidential mode", () => {
  const actionsPath = path.join(webRoot, "src/actions/career.ts");
  const content = fs.readFileSync(actionsPath, "utf8");

  assert.ok(content.includes("sanitizeCareerProfile"), "Must implement sanitizeCareerProfile");
  assert.ok(content.includes("Confidential Enterprise"), "Must mask company with 'Confidential Enterprise' when confidential mode is active");
  assert.ok(!content.includes("verifiedContact: profile.verifiedContact"), "Must not expose raw verifiedContact in sanitized model");
});
