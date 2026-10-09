import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
