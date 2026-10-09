import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

test("renderBiodataPdf produces a non-empty PDF buffer", () => {
  const output = execFileSync(process.execPath, [
    "--experimental-strip-types",
    path.join(testDirectory, "fixtures", "render-matrimony-biodata-pdf.mjs"),
  ], { encoding: "utf8" });
  const result = JSON.parse(output);

  assert.equal(result.header, "%PDF-");
  assert.ok(result.length > 0);
});

test("biodata download UI exposes resilient download controls in member views", () => {
  const root = path.join(testDirectory, "..");
  const button = fs.readFileSync(path.join(root, "src", "components", "matrimony", "DownloadBiodataButton.tsx"), "utf8");
  const profilePage = fs.readFileSync(path.join(root, "src", "app", "matrimony", "[id]", "page.tsx"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "src", "app", "dashboard", "page.tsx"), "utf8");
  const adminCreator = fs.readFileSync(path.join(root, "src", "components", "admin", "AdminAssistedProfilesCreator.tsx"), "utf8");

  assert.match(button, /variant\?: "default" \| "outline" \| "admin"/);
  assert.match(button, /className\?: string/);
  assert.match(button, /Content-Disposition/);
  assert.match(button, /response\.status === 401/);
  assert.match(button, /Unable to generate biodata PDF right now/);
  assert.match(button, /inFlightRef/);
  assert.match(profilePage, /<DownloadBiodataButton/);
  assert.match(dashboard, /<DownloadBiodataButton/);
  assert.match(adminCreator, /<DownloadBiodataButton/);
  assert.match(adminCreator, /variant="admin"/);
});
