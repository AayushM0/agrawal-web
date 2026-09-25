import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Task 3: /businesses/page.tsx renders search, sector chips, verified toggle, and enterprise cards", () => {
  const dirPath = path.join(webRoot, "src/app/businesses/page.tsx");
  assert.ok(fs.existsSync(dirPath), "src/app/businesses/page.tsx must exist");

  const content = fs.readFileSync(dirPath, "utf8");
  assert.ok(content.includes("getLiveBusinessProfiles"), "Must import and call getLiveBusinessProfiles");
  assert.ok(content.includes("/businesses/create"), "Must have CTA link to register business /businesses/create");
  assert.ok(content.includes("verified") || content.includes("Verified"), "Must include verified enterprise toggle/filter");
  assert.ok(content.includes("export default"), "Must export default component");
});

test("Task 3: /businesses/[id]/page.tsx renders hero, photo gallery, about narrative, specs, and leadership cards", () => {
  const showcasePath = path.join(webRoot, "src/app/businesses/[id]/page.tsx");
  assert.ok(fs.existsSync(showcasePath), "src/app/businesses/[id]/page.tsx must exist");

  const content = fs.readFileSync(showcasePath, "utf8");
  assert.ok(content.includes("getBusinessProfileById"), "Must import getBusinessProfileById");
  assert.ok(content.includes("linkedDirectors") || content.includes("LinkedDirector"), "Must render linked directors");
  assert.ok(content.includes("photos") || content.includes("gallery"), "Must render photo gallery/media");
  assert.ok(
    content.includes("Chat") || content.includes("Connect") || content.includes("Inquiry"),
    "Must include Connect / Chat button"
  );
  assert.ok(content.includes("export default"), "Must export default component");
});

test("Task 3: Privacy and leadership directory gating invariants", () => {
  const showcaseContent = fs.readFileSync(path.join(webRoot, "src/app/businesses/[id]/page.tsx"), "utf8");
  
  // Leadership links gate to /directory/
  assert.ok(
    showcaseContent.includes("/directory/") || showcaseContent.includes("/login"),
    "Must link or gate leadership profiles to directory"
  );
  // Ensure raw phone numbers are not rendered in public template
  assert.ok(!showcaseContent.includes("profile.phone"), "Must not expose direct phone on public profile");
});
