import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Task 4: /businesses/create page file exists and implements 4-step wizard", () => {
  const createPath = path.join(webRoot, "src/app/businesses/create/page.tsx");
  assert.ok(fs.existsSync(createPath), "src/app/businesses/create/page.tsx must exist");

  const content = fs.readFileSync(createPath, "utf8");
  assert.ok(content.includes("createBusinessProfile"), "Must import createBusinessProfile action");
  assert.ok(content.includes("currentStep") || content.includes("step"), "Must maintain wizard step state");
  assert.ok(content.includes("businessName"), "Must include business name field");
  assert.ok(content.includes("industrySector"), "Must include industry sector field");
  assert.ok(content.includes("aboutBusiness"), "Must include about business narrative");
  assert.ok(content.includes("isPrimaryContact"), "Must allow designating primary contact director");
  assert.ok(content.includes("export default"), "Must export default page component");
});

test("Task 4: dashboard/page.tsx integrates 'My Businesses' management tab and controls", () => {
  const dashPath = path.join(webRoot, "src/app/dashboard/page.tsx");
  const content = fs.readFileSync(dashPath, "utf8");

  assert.ok(
    content.includes("getMyHouseholdBusinesses"),
    "Dashboard must import and call getMyHouseholdBusinesses"
  );
  assert.ok(
    content.includes("toggleBusinessVisibility"),
    "Dashboard must import toggleBusinessVisibility for pause/resume"
  );
  assert.ok(
    content.includes("deleteBusinessProfile"),
    "Dashboard must import deleteBusinessProfile"
  );
  assert.ok(
    content.includes("My Businesses") || content.includes("व्यापार प्रतिष्ठान"),
    "Dashboard must render My Businesses / व्यापार प्रतिष्ठान section"
  );
  assert.ok(
    content.includes("/businesses/create"),
    "Dashboard must provide link to register a new enterprise"
  );
});
