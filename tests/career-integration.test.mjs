import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 050 - Task 7: Platform navigation links directly to /careers across header, nav, and footer", () => {
  const topNav = fs.readFileSync(path.join(webRoot, "src/components/layout/TopNavBar.tsx"), "utf8");
  const mainHeader = fs.readFileSync(path.join(webRoot, "src/components/layout/MainHeader.tsx"), "utf8");
  const mainFooter = fs.readFileSync(path.join(webRoot, "src/components/layout/MainFooter.tsx"), "utf8");

  assert.ok(topNav.includes("/careers"), "TopNavBar must link to /careers");
  assert.ok(mainHeader.includes("/careers"), "MainHeader must link to /careers");
  assert.ok(mainFooter.includes("/careers"), "MainFooter must link to /careers");
});

test("Issue 050 - Task 7: Homepage Seven Pillars Grid Pillar 4 is LIVE linking to /careers", () => {
  const pillarsGrid = fs.readFileSync(path.join(webRoot, "src/components/home/SevenPillarsGrid.tsx"), "utf8");

  assert.ok(pillarsGrid.includes("/careers"), "SevenPillarsGrid must link to /careers");
  assert.ok(pillarsGrid.includes(`title: "Jobs & Careers"`), "Pillar 4 title must be Jobs & Careers");
  assert.ok(pillarsGrid.includes(`status: "LIVE"`), "Pillar 4 status must be LIVE");
});

test("Issue 050 - Task 7: User Guide includes Topic 9 for Jobs & Careers Network", () => {
  const guidePage = fs.readFileSync(path.join(webRoot, "src/app/guide/page.tsx"), "utf8");

  assert.ok(guidePage.includes(`id: "careers"`), "Guide must include topic id 'careers'");
  assert.ok(guidePage.includes("Jobs & Careers Network"), "Guide must include Jobs & Careers Network title");
  assert.ok(guidePage.includes("रोजगार व करियर संजाल"), "Guide must include Hindi translation");
  assert.ok(guidePage.includes("/careers"), "Guide must link to /careers");
});

test("Issue 050 - Task 7: Admin Moderation includes Careers & Jobs tab", () => {
  const moderationPage = fs.readFileSync(path.join(webRoot, "src/app/admin/moderation/page.tsx"), "utf8");

  assert.ok(moderationPage.includes(`filter === "careers"`), "Moderation page must handle careers filter");
  assert.ok(moderationPage.includes("getLiveJobPostingsAction"), "Moderation page must call getLiveJobPostingsAction");
  assert.ok(
    moderationPage.includes("Jobs &amp; Careers") || moderationPage.includes("Jobs & Careers"),
    "Moderation page must render Jobs & Careers tab"
  );
});
