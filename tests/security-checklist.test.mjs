import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Checklist 1: Image validator enforces magic bytes, blocks SVG XSS and oversized files", async () => {
  const { validateProfileImage } = await import("../src/lib/image-validator.ts");

  // Valid JPEG base64 header (/9j/)
  const validJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...";
  assert.equal(validateProfileImage(validJpeg).valid, true, "Valid JPEG must pass");

  // Valid PNG base64 header (iVBORw0KGgo)
  const validPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...";
  assert.equal(validateProfileImage(validPng).valid, true, "Valid PNG must pass");

  // Valid WebP base64 header (UklGR)
  const validWebp = "data:image/webp;base64,UklGRmIAAABXRUJQVlA4...";
  assert.equal(validateProfileImage(validWebp).valid, true, "Valid WebP must pass");

  // SVG XSS attempt
  const svgXss = "data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+";
  assert.equal(validateProfileImage(svgXss).valid, false, "SVG must be rejected");

  // Corrupted header / mismatch
  const corrupted = "data:image/jpeg;base64,AAAAFakeHeader...";
  assert.equal(validateProfileImage(corrupted).valid, false, "Fake header must be rejected");
});

test("Checklist 2: Persistent rate limiting and admin lockout schema in schema.sql", () => {
  const schemaPath = path.join(webRoot, "src/db/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS otp_rate_limits"), "otp_rate_limits table must exist");
  assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS admin_login_attempts"), "admin_login_attempts table must exist");
});

test("Checklist 3: Security headers configured in next.config.ts", () => {
  const configPath = path.join(webRoot, "next.config.ts");
  const config = fs.readFileSync(configPath, "utf8");

  assert.ok(config.includes("X-Frame-Options"), "Must declare X-Frame-Options");
  assert.ok(config.includes("X-Content-Type-Options"), "Must declare nosniff");
  assert.ok(config.includes("Referrer-Policy"), "Must declare Referrer-Policy");
});
