import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Pass Parity 1: getBaseUrl dynamically resolves current host and avoids hardcoded domains", async () => {
  const { getBaseUrl } = await import("../src/lib/pass.ts");

  // Default fallback
  const url = getBaseUrl();
  assert.ok(url.startsWith("http"), "Must return valid HTTP URL");
  assert.ok(!url.endsWith("/"), "Must trim trailing slash");
  assert.ok(!url.includes("agrasenvaishakhara.com"), "Must not use outdated domain");
});

test("Pass Parity 2: createUnifiedPassData builds consistent pass fields for email and web download", async () => {
  const { createUnifiedPassData } = await import("../src/lib/pass.ts");

  const member = {
    fullName: "Aarav Agrawal",
    relationToHead: "son",
    currentCity: "Mumbai",
    gotra: "Bansal",
    householdCode: "MAFL-2026-IND-00042",
    photoUrl: "https://cdn.example.com/aarav.webp",
  };

  const household = {
    gotra: "Bansal",
    householdCode: "MAFL-2026-IND-00042",
    serialNo: "MAFL-2026-IND-00042",
    city: "Mumbai",
    nativePlace: "Agroha",
  };

  const passData = createUnifiedPassData({ member, household });
  assert.equal(passData.fullName, "Aarav Agrawal");
  assert.equal(passData.roleLabel, "Son");
  assert.equal(passData.serialNo, "MAFL-2026-IND-00042");
  assert.equal(passData.currentCity, "Mumbai");
  assert.equal(passData.nativePlace, "Agroha");
});

test("Pass Parity 3: moderate.ts does not contain hardcoded test domains", () => {
  const modPath = path.join(webRoot, "src/actions/moderate.ts");
  const code = fs.readFileSync(modPath, "utf8");

  assert.ok(!code.includes("agrasenvaishakhara.com"), "moderate.ts must not contain hardcoded agrasenvaishakhara.com");
  assert.ok(code.includes("getBaseUrl"), "moderate.ts must use getBaseUrl()");
});

test("Pass Parity 4: src directory contains zero references to legacy domains or emails", () => {
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(tsx?|jsx?|mjs|json|css)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf8");
        assert.ok(
          !content.includes("agrasenvaishakhara.com"),
          `File ${fullPath} must not contain agrasenvaishakhara.com`
        );
        assert.ok(
          !content.includes("agrasenfoundation.org"),
          `File ${fullPath} must not contain agrasenfoundation.org`
        );
      }
    }
  }

  scanDir(path.join(webRoot, "src"));
});

test("Pass Parity 5: frontend pages and components contain zero mentions of OWASP or Supabase", () => {
  function scanFrontend(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanFrontend(fullPath);
      } else if (/\.(tsx|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf8");
        assert.ok(
          !content.toLowerCase().includes("owasp"),
          `Frontend file ${fullPath} must not mention OWASP`
        );
        assert.ok(
          !content.toLowerCase().includes("supabase"),
          `Frontend file ${fullPath} must not mention Supabase`
        );
      }
    }
  }

  scanFrontend(path.join(webRoot, "src/app"));
  scanFrontend(path.join(webRoot, "src/components"));
});


