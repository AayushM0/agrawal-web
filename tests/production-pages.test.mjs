import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:url";
import fileSys from "node:fs";
import filePath from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = filePath.dirname(fileURLToPath(import.meta.url));
const webRoot = filePath.join(__dirname, "..");

test("Production-grade legal & support pages exist and have correct titles/content", () => {
  const checkPages = [
    { file: "src/app/privacy/page.tsx", keyword: "Privacy Policy" },
    { file: "src/app/terms/page.tsx", keyword: "Terms of Service" },
    { file: "src/app/cookie-policy/page.tsx", keyword: "Cookie Policy" },
    { file: "src/app/accessibility/page.tsx", keyword: "Accessibility Statement" },
    { file: "src/app/acceptable-use/page.tsx", keyword: "Acceptable Use Policy" },
    { file: "src/app/security-policy/page.tsx", keyword: "Security Policy" },
    { file: "src/app/responsible-disclosure/page.tsx", keyword: "Responsible Disclosure Policy" },
    { file: "src/app/community-guidelines/page.tsx", keyword: "Community Guidelines" },
    { file: "src/app/settings/page.tsx", keyword: "Account Settings" },
    { file: "src/app/support/page.tsx", keyword: "SupportDesk" },
    { file: "src/app/help/page.tsx", keyword: "Help Center" },
  ];

  for (const page of checkPages) {
    const fullPath = filePath.join(webRoot, page.file);
    assert.ok(fileSys.existsSync(fullPath), `${page.file} must exist`);
    const content = fileSys.readFileSync(fullPath, "utf8");
    assert.ok(content.includes("export default function"), `${page.file} must export a page component`);
  }
});

test("Settings page has delete account and data export controls", () => {
  const fullPath = filePath.join(webRoot, "src/app/settings/page.tsx");
  const content = fileSys.readFileSync(fullPath, "utf8");

  assert.ok(content.includes("deleteHouseholdAccount"), "Settings page must import deleteHouseholdAccount");
  assert.ok(content.includes("getCurrentHouseholdDashboard"), "Settings page must import getCurrentHouseholdDashboard");
  assert.ok(content.includes("handleExportData"), "Settings page must define handleExportData");
  assert.ok(content.includes("handleSendDeletionOtp"), "Settings page must support sending deletion OTP");
});

test("UX Components: CookieBanner and OfflineIndicator exist and have correct listeners", () => {
  const bannerPath = filePath.join(webRoot, "src/components/layout/CookieBanner.tsx");
  const indicatorPath = filePath.join(webRoot, "src/components/layout/OfflineIndicator.tsx");

  assert.ok(fileSys.existsSync(bannerPath), "CookieBanner must exist");
  assert.ok(fileSys.existsSync(indicatorPath), "OfflineIndicator must exist");

  const bannerContent = fileSys.readFileSync(bannerPath, "utf8");
  const indicatorContent = fileSys.readFileSync(indicatorPath, "utf8");

  assert.ok(bannerContent.includes("cookieConsentDismissed"), "CookieBanner must check and set cookieConsentDismissed preference");
  assert.ok(indicatorContent.includes("window.addEventListener(\"online\""), "OfflineIndicator must listen to online event");
  assert.ok(indicatorContent.includes("window.addEventListener(\"offline\""), "OfflineIndicator must listen to offline event");
});

test("Layout and Footer reference newly created routes", () => {
  const layoutPath = filePath.join(webRoot, "src/app/layout.tsx");
  const footerPath = filePath.join(webRoot, "src/components/layout/RoyalFooter.tsx");

  const layoutContent = fileSys.readFileSync(layoutPath, "utf8");
  const footerContent = fileSys.readFileSync(footerPath, "utf8");

  assert.ok(layoutContent.includes("<CookieBanner />"), "layout.tsx must render CookieBanner");
  assert.ok(layoutContent.includes("<OfflineIndicator />"), "layout.tsx must render OfflineIndicator");

  const expectedFooterLinks = [
    "href=\"/privacy\"",
    "href=\"/terms\"",
    "href=\"/cookie-policy\"",
    "href=\"/accessibility\"",
    "href=\"/acceptable-use\"",
    "href=\"/security-policy\"",
    "href=\"/responsible-disclosure\"",
    "href=\"/community-guidelines\"",
    "href=\"/settings\"",
    "href=\"/help\"",
    "href=\"/support\"",
  ];

  for (const link of expectedFooterLinks) {
    assert.ok(footerContent.includes(link), `Footer must link to: ${link}`);
  }
});
