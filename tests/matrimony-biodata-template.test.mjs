import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";

const root = path.join(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("biodata template is self-contained and carries the 4-gotra heritage contract", () => {
  const template = read("src/lib/matrimony-biodata-template.ts");
  const types = read("src/types/matrimony-biodata.ts");

  assert.ok(template.includes("compileBiodataHtml"));
  assert.ok(template.includes("data:font/ttf;base64,"));
  assert.ok(template.includes("NotoSansDevanagari-Regular.ttf"));
  assert.ok(template.includes("selfGotra"));
  assert.ok(template.includes("motherGotra"));
  assert.ok(template.includes("दादी"));
  assert.ok(template.includes("॥ श्री गणेशाय नमः ॥"));
  assert.ok(template.includes("@page { size: A4 portrait; margin: 6mm; }"));
  assert.ok(template.includes("break-inside: avoid"));
  assert.ok(types.includes("interface BiodataTemplateProps"));
  assert.ok(types.includes("interface FourGotras"));
});

test("biodata compiler protects untrusted text and omits blank optional rows", () => {
  const template = read("src/lib/matrimony-biodata-template.ts");

  assert.ok(template.includes("escapeHtml"));
  assert.ok(template.includes("filter(Boolean)"));
  assert.ok(template.includes("normalizeProfileToBiodataProps"));
  assert.ok(template.includes("secondaryPhone"));
  assert.ok(template.includes("siblings"));
});

test("compiler renders real self-contained HTML and collapses absent optional sections", () => {
  const source = `import { compileBiodataHtml } from './src/lib/matrimony-biodata-template.ts'; const h = compileBiodataHtml({ id: 'MAFL/1', fullName: '<Aarav>', fourGotras: { selfGotra: 'Singhal', motherGotra: 'Bansal' } }); console.log(JSON.stringify({ font: h.includes('data:font/ttf;base64,'), gotras: h.includes('Singhal') && h.includes('Bansal'), escaped: h.includes('&lt;Aarav&gt;'), noAstrology: !h.includes('Horoscope & astrology') }));`;
  const output = execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "--eval", source], { cwd: root, encoding: "utf8" });
  assert.deepEqual(JSON.parse(output.trim()), { font: true, gotras: true, escaped: true, noAstrology: true });
});
