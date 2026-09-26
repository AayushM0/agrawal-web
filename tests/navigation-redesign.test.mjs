import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const mainHeaderPath = path.join(rootDir, "src/components/layout/MainHeader.tsx");
const topNavBarPath = path.join(rootDir, "src/components/layout/TopNavBar.tsx");

test("Navigation Redesign: TopNavBar does not contain conversational emojis and eliminates duplicate platform links", () => {
  const content = fs.readFileSync(topNavBarPath, "utf-8");

  // Ensure emojis are purged from TopNavBar
  const forbiddenEmojis = ["💍", "🏢", "💬", "📖", "🏛️", "📊", "⚙️", "🚪"];
  for (const emoji of forbiddenEmojis) {
    assert.strictEqual(
      content.includes(emoji),
      false,
      `TopNavBar still contains forbidden emoji: ${emoji}`
    );
  }

  // Ensure duplicate platforms without emojis (Matrimony, Messages) are pruned from thin top bar
  assert.strictEqual(
    content.includes('href="/matrimony"'),
    false,
    "TopNavBar should not duplicate /matrimony link"
  );
});

test("Navigation Redesign: MainHeader streamlines direct links and eliminates navigation emojis", () => {
  const content = fs.readFileSync(mainHeaderPath, "utf-8");

  // Ensure conversational emojis are removed from main navigation and popovers
  const forbiddenEmojis = ["💍", "🏢", "🏛️", "📖", "📊", "🪪", "🛡️", "⚙️", "🚪", "🏠"];
  for (const emoji of forbiddenEmojis) {
    assert.strictEqual(
      content.includes(emoji),
      false,
      `MainHeader still contains forbidden emoji: ${emoji}`
    );
  }

  // Ensure direct desktop nav links contain Home and Directory Search
  assert.match(content, /href="\/"/, "MainHeader must include direct Home link");
  assert.match(content, /href="\/directory"/, "MainHeader must include direct Directory Search link");

  // Ensure dropdown trigger for Explore Community exists
  assert.match(content, /Explore Community/i, "MainHeader must include Explore Community dropdown");

  // Ensure community destinations are grouped in the dropdown popover
  assert.match(content, /href="\/matrimony"/, "Community dropdown must link to /matrimony");
  assert.match(content, /href="\/businesses"/, "Community dropdown must link to /businesses");
  assert.match(content, /href="\/about"/, "Community dropdown must link to /about");
  assert.match(content, /href="\/guide"/, "Community dropdown must link to /guide");
});

test("Navigation Redesign: MainHeader consolidates authenticated actions into User Account dropdown", () => {
  const content = fs.readFileSync(mainHeaderPath, "utf-8");

  // Check for Account dropdown / My Account trigger
  assert.match(content, /My Account|Account/i, "MainHeader must include an Account dropdown menu");

  // Ensure core authenticated links are present
  assert.match(content, /href="\/dashboard"/, "Account dropdown must link to /dashboard");
  assert.match(content, /href="\/dashboard\/pass"/, "Account dropdown must link to /dashboard/pass");
  assert.match(content, /href="\/settings"/, "Account dropdown must link to /settings");
  assert.match(content, /handleLogout/i, "Account dropdown must provide Sign Out trigger");
});
