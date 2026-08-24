import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 012: /api/pass/pdf must enforce household ownership or admin check (VULN-003 IDOR)", () => {
  const pdfRouteCode = fs.readFileSync(path.join(webRoot, "src/app/api/pass/pdf/route.ts"), "utf8");
  
  assert.ok(pdfRouteCode.includes("getSession"), "Must get session in PDF pass route");
  assert.ok(
    pdfRouteCode.includes('session.role === "admin"') || pdfRouteCode.includes("role === 'admin'"),
    "Must permit admin role"
  );
  assert.ok(
    pdfRouteCode.includes("household") || pdfRouteCode.includes("isAuthorized") || pdfRouteCode.includes("403"),
    "Must verify household ownership and deny unauthorized access with 403 Forbidden"
  );
});

test("Issue 012: middleware.ts must not have hardcoded fallback secrets (VULN-004)", () => {
  const middlewareCode = fs.readFileSync(path.join(webRoot, "src/middleware.ts"), "utf8");
  
  assert.ok(
    !middlewareCode.includes("agarwal_dir_secure_hmac_secret_2026_super_key_998127"),
    "middleware.ts must not contain the static fallback secret string"
  );
  assert.ok(
    middlewareCode.includes("process.env.AUTH_SECRET"),
    "middleware.ts must reference process.env.AUTH_SECRET"
  );
});

test("Issue 012: /api/location/pincode must strictly validate country parameter (VULN-005 SSRF)", () => {
  const pincodeRouteCode = fs.readFileSync(path.join(webRoot, "src/app/api/location/pincode/route.ts"), "utf8");
  
  assert.ok(
    pincodeRouteCode.includes("^[A-Za-z]{2}$") || pincodeRouteCode.includes("^[a-zA-Z]{2}$"),
    "pincode route must enforce 2-letter ISO alpha country regex"
  );
});
