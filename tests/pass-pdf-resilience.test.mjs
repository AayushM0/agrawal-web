import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

// --- TEST 1: Next.js Serverless File Tracing Configuration ---
test("Task 1.1: next.config.ts defines outputFileTracingIncludes for public/fonts", () => {
  const nextConfigCode = fs.readFileSync(path.join(webRoot, "next.config.ts"), "utf8");
  assert.ok(
    nextConfigCode.includes("outputFileTracingIncludes"),
    "next.config.ts must define outputFileTracingIncludes"
  );
  assert.ok(
    nextConfigCode.includes("public/fonts"),
    "outputFileTracingIncludes must include public/fonts"
  );
  assert.ok(
    nextConfigCode.includes("'/**/*': ['./public/fonts/**/*']") ||
      nextConfigCode.includes('"/**/*": ["./public/fonts/**/*"]') ||
      nextConfigCode.includes("'/**/*': [\"./public/fonts/**/*\"]") ||
      nextConfigCode.includes('"/**/*": [\'./public/fonts/**/*\']'),
    "outputFileTracingIncludes must map '/**/*' to ['./public/fonts/**/*']"
  );
});

// --- TEST 2: PassPDF Font Fallback & Candidate Resolution Contract ---
test("Task 1.2: PassPDF component source contains multi-path resolution and CDN fallback", () => {
  const passPdfCode = fs.readFileSync(path.join(webRoot, "src/components/PassPDF.tsx"), "utf8");

  // Check candidate resolution
  assert.ok(
    passPdfCode.includes("existsSync") || passPdfCode.includes("process.cwd()"),
    "PassPDF must resolve candidate font paths dynamically"
  );

  // Check CDN fallback URL
  assert.ok(
    passPdfCode.includes("https://agrawal-web.vercel.app/fonts/NotoSansDevanagari-Regular.ttf") ||
      passPdfCode.includes("agrawal-web.vercel.app/fonts"),
    "PassPDF must define remote CDN fallback URL for NotoSansDevanagari"
  );

  // Check safe font registration
  assert.ok(
    passPdfCode.includes("Font.register") &&
      (passPdfCode.includes("try") || passPdfCode.includes("catch") || passPdfCode.includes("registerDevanagariFont")),
    "PassPDF must safely register fonts without unhandled exceptions"
  );

  // Check fallback font family in styles or rendering
  assert.ok(
    passPdfCode.includes("NotoSansDevanagari") &&
      (passPdfCode.includes("Helvetica") || passPdfCode.includes("sans-serif")),
    "PassPDF styles must support fallback font family"
  );
});

// --- TEST 3: End-to-End PDF Buffer Generation with Real PassPDF ---
test("Task 1.3: Real PassPDF component renders valid PDF buffer (>1000 bytes) with font resolved", async () => {
  const React = (await import("react")).default;
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { PassPDF } = await import("../scripts/compiled/components/PassPDF.js");

  const samplePass = {
    fullName: "Ramesh Kumar Agrawal",
    roleLabel: "self",
    gotra: "Garg",
    fatherName: "Suresh Chand Agrawal",
    fatherOrHusbandLabel: "FATHER",
    nativePlace: "Agroha, Haryana",
    currentCity: "Singapore",
    serialNo: "MAF-2026-0001",
    householdCode: "HH-001",
    photoUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  };

  const buffer = await renderToBuffer(React.createElement(PassPDF, { passData: samplePass }));
  assert.ok(Buffer.isBuffer(buffer), "Rendered output must be a Buffer");
  assert.ok(buffer.length > 1000, `Buffer length (${buffer.length}) must be > 1000 bytes`);
  assert.equal(buffer.subarray(0, 5).toString("utf8"), "%PDF-", "Buffer must begin with %PDF- header");
});

// --- TEST 4: Photo Malformation & Edge Case Resilience ---
test("Task 1.4: PassPDF does not crash when photoUrl is corrupt, non-image, or unreachable", async () => {
  const React = (await import("react")).default;
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { PassPDF } = await import("../scripts/compiled/components/PassPDF.js");

  const edgeCases = [
    { name: "Null photo", photoUrl: null },
    { name: "Undefined photo", photoUrl: undefined },
    { name: "Empty string photo", photoUrl: "" },
    { name: "Corrupt base64 string", photoUrl: "data:image/jpeg;base64,corrupt_data_not_image" },
    { name: "Malformed scheme", photoUrl: "javascript:alert(1)" },
    { name: "FTP url", photoUrl: "ftp://example.com/photo.jpg" },
  ];

  for (const tc of edgeCases) {
    const passData = {
      fullName: "Ananya Agrawal",
      roleLabel: "daughter",
      gotra: "Bansal",
      fatherName: "Ramesh Kumar Agrawal",
      nativePlace: "Jaipur, Rajasthan",
      currentCity: "Singapore",
      serialNo: "MAF-2026-0002",
      householdCode: "HH-001",
      photoUrl: tc.photoUrl,
    };

    const buffer = await renderToBuffer(React.createElement(PassPDF, { passData }));
    assert.ok(Buffer.isBuffer(buffer), `${tc.name}: Output must be a Buffer`);
    assert.ok(buffer.length > 1000, `${tc.name}: Buffer length (${buffer.length}) must be > 1000 bytes`);
    assert.equal(buffer.subarray(0, 5).toString("utf8"), "%PDF-", `${tc.name}: Buffer must begin with %PDF- header`);
  }
});

// --- TEST 5: Missing Local Fonts Simulation (Serverless /var/task Environment) ---
test("Task 1.5: PassPDF rendering survives when local fonts are absent in working directory", async () => {
  const React = (await import("react")).default;
  const { renderToBuffer } = await import("@react-pdf/renderer");

  // Temporarily change cwd to temp dir where public/fonts does NOT exist
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "serverless-sim-"));

  try {
    process.chdir(tempDir);
    assert.equal(fs.existsSync(path.join(tempDir, "public/fonts")), false, "Temp dir must not have public/fonts");

    const { PassPDF } = await import(`../scripts/compiled/components/PassPDF.js?cwd_test=${Date.now()}`);

    const passData = {
      fullName: "Vikram Agrawal",
      roleLabel: "son",
      gotra: "Garg",
      serialNo: "MAF-2026-0003",
      householdCode: "HH-001",
      photoUrl: "",
    };

    const buffer = await renderToBuffer(React.createElement(PassPDF, { passData }));
    assert.ok(Buffer.isBuffer(buffer), "Must return Buffer even when local fonts missing in cwd");
    assert.ok(buffer.length > 1000, "Buffer length must be > 1000 bytes");
    assert.equal(buffer.subarray(0, 5).toString("utf8"), "%PDF-", "Buffer must begin with %PDF- header");
  } finally {
    process.chdir(originalCwd);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});
