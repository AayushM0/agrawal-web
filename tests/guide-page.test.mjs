import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Visual User Guide page (/guide) file exists and exports client component", () => {
  const guidePath = path.join(webRoot, "src/app/guide/page.tsx");
  assert.ok(fs.existsSync(guidePath), "src/app/guide/page.tsx must exist");

  const content = fs.readFileSync(guidePath, "utf8");
  assert.ok(content.startsWith("'use client'") || content.includes("'use client'"), "Guide page must be a client component");
  assert.ok(
    content.includes("export default function UserGuidePage") || content.includes("export default function GuidePage"),
    "Guide page must export default function UserGuidePage"
  );
});

test("Guide page contains all 6 core user flows with bilingual English and Hindi content", () => {
  const guidePath = path.join(webRoot, "src/app/guide/page.tsx");
  const content = fs.readFileSync(guidePath, "utf8");

  // Flow 1: Family Registration
  assert.ok(content.includes('id: "registration"'), "Must include registration topic");
  assert.ok(content.includes("Family Registration"), "Must include Family Registration title");
  assert.ok(content.includes("निःशुल्क परिवार पंजीकरण"), "Must include Hindi title for registration");

  // Flow 2: Login & Authentication
  assert.ok(content.includes('id: "login"'), "Must include login topic");
  assert.ok(content.includes("Login & Dashboard Access"), "Must include Login & Dashboard Access title");
  assert.ok(content.includes("लॉगिन एवं डैशबोर्ड उपयोग"), "Must include Hindi title for login");

  // Flow 3: Family Members & Claiming
  assert.ok(content.includes('id: "members"'), "Must include members topic");
  assert.ok(content.includes("Add & Claim Members"), "Must include Add & Claim Members title");
  assert.ok(content.includes("सदस्य जोड़ना एवं प्रोफाइल क्लेम"), "Must include Hindi title for members");

  // Flow 4: 18 Gotras Directory Search
  assert.ok(content.includes('id: "directory"'), "Must include directory topic");
  assert.ok(content.includes("18 Gotras Directory Search"), "Must include Directory Search title");
  assert.ok(content.includes("18 गोत्र निर्देशिका खोज"), "Must include Hindi title for directory");

  // Flow 5: Private Member Messaging
  assert.ok(content.includes('id: "messaging"'), "Must include messaging topic");
  assert.ok(content.includes("Private Member Messaging"), "Must include Private Messaging title");
  assert.ok(content.includes("सुरक्षित सदस्य संवाद"), "Must include Hindi title for messaging");

  // Flow 6: Support & Helpline
  assert.ok(content.includes('id: "support"'), "Must include support topic");
  assert.ok(content.includes("Support & Helpline"), "Must include Support & Helpline title");
  assert.ok(content.includes("सहायता केंद्र एवं हेल्पलाइन"), "Must include Hindi title for support");
});

test("Guide page includes flowchart nodes with start, process, decision, and success types", () => {
  const guidePath = path.join(webRoot, "src/app/guide/page.tsx");
  const content = fs.readFileSync(guidePath, "utf8");

  assert.ok(content.includes('type: "start"'), "Must include start flowchart nodes");
  assert.ok(content.includes('type: "process"'), "Must include process flowchart nodes");
  assert.ok(content.includes('type: "decision"'), "Must include decision flowchart nodes");
  assert.ok(content.includes('type: "success"'), "Must include success flowchart nodes");
  assert.ok(content.includes("flowchartNodes"), "Must include flowchartNodes definition");
});

test("Navigation components link to /guide", () => {
  // TopNavBar
  const navPath = path.join(webRoot, "src/components/layout/TopNavBar.tsx");
  const navContent = fs.readFileSync(navPath, "utf8");
  assert.ok(navContent.includes('href="/guide"'), "TopNavBar must link to /guide");
  assert.ok(navContent.includes("User Guide"), "TopNavBar link text must mention User Guide");

  // RoyalFooter
  const footerPath = path.join(webRoot, "src/components/layout/RoyalFooter.tsx");
  const footerContent = fs.readFileSync(footerPath, "utf8");
  assert.ok(footerContent.includes('href="/guide"'), "RoyalFooter must link to /guide");
  assert.ok(footerContent.includes("User Guide"), "RoyalFooter link text must mention User Guide");

  // Help Center Callout Banner
  const helpPath = path.join(webRoot, "src/app/help/page.tsx");
  const helpContent = fs.readFileSync(helpPath, "utf8");
  assert.ok(helpContent.includes('href="/guide"'), "Help Center must have callout banner linking to /guide");
});

test("Guide page maintains accurate helpline and emergency phone numbers", () => {
  const guidePath = path.join(webRoot, "src/app/guide/page.tsx");
  const content = fs.readFileSync(guidePath, "utf8");

  assert.ok(content.includes("+65 9277 4444") || content.includes("+6592774444"), "Helpline number must be +65 9277 4444");
});
