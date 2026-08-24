import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 015: /dashboard/messages page exists and includes Trust & Safety UI", () => {
  const messagesPagePath = path.join(webRoot, "src/app/dashboard/messages/page.tsx");
  assert.ok(fs.existsSync(messagesPagePath), "src/app/dashboard/messages/page.tsx must exist");
  const code = fs.readFileSync(messagesPagePath, "utf8");

  assert.ok(code.includes("Community Safety") || code.includes("Trust & Safety"), "Must display safety banner");
  assert.ok(code.includes("sendMessage"), "Must connect to sendMessage server action");
  assert.ok(code.includes("getConversations"), "Must fetch conversations");
  assert.ok(code.includes("reportConversation") || code.includes("Report"), "Must provide reporting capability");
});

test("Issue 015: Member profile page includes Send Message CTA button", () => {
  const profilePagePath = path.join(webRoot, "src/app/directory/[id]/page.tsx");
  assert.ok(fs.existsSync(profilePagePath), "Directory profile page must exist");
  const code = fs.readFileSync(profilePagePath, "utf8");

  assert.ok(code.includes("/dashboard/messages") || code.includes("Message"), "Profile must offer messaging CTA");
});

test("Issue 015: TopNavBar includes Messages link/icon", () => {
  const navPath = path.join(webRoot, "src/components/layout/TopNavBar.tsx");
  assert.ok(fs.existsSync(navPath), "TopNavBar must exist");
  const code = fs.readFileSync(navPath, "utf8");

  assert.ok(code.includes("/dashboard/messages") || code.includes("Messages"), "TopNavBar must link to messages");
});

test("Issue 015: Admin Moderation page includes Reported Messages review tab", () => {
  const modPath = path.join(webRoot, "src/app/admin/moderation/page.tsx");
  assert.ok(fs.existsSync(modPath), "Admin moderation page must exist");
  const code = fs.readFileSync(modPath, "utf8");

  assert.ok(code.includes("report") || code.includes("Report"), "Moderation portal must support message reports review");
});
