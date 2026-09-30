import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

// Dynamically import the compiled or direct source module
import { validateEmail, normalizeEmail, suggestDomainCorrection } from "../src/lib/email-validation.ts";

test("Issue 051: normalizeEmail trims whitespace and converts to lower case", () => {
  assert.equal(normalizeEmail("  user@Example.COM  "), "user@example.com");
  assert.equal(normalizeEmail("\t\nRahul.Agrawal@GMAIL.com\n "), "rahul.agrawal@gmail.com");
  assert.equal(normalizeEmail(""), "");
  assert.equal(normalizeEmail(undefined), "");
});

test("Issue 051: validateEmail accepts valid standard emails and provides canonical form", () => {
  const result1 = validateEmail("rahul.agrawal@gmail.com");
  assert.equal(result1.isValid, true);
  assert.equal(result1.canonical, "rahul.agrawal@gmail.com");
  assert.equal(result1.suggestion, undefined);

  const result2 = validateEmail("  Pooja.Goyal+work@yahoo.co.in  ");
  assert.equal(result2.isValid, true);
  assert.equal(result2.canonical, "pooja.goyal+work@yahoo.co.in");
  assert.equal(result2.suggestion, undefined);
});

test("Issue 051: validateEmail rejects empty, null, or short values", () => {
  assert.equal(validateEmail("").isValid, false);
  assert.equal(validateEmail("   ").isValid, false);
  assert.equal(validateEmail(undefined).isValid, false);
  assert.equal(validateEmail("a@b").isValid, false);
});

test("Issue 051: validateEmail rejects control characters and internal spaces", () => {
  assert.equal(validateEmail("user\x00name@gmail.com").isValid, false);
  assert.equal(validateEmail("user\x1fname@gmail.com").isValid, false);
  assert.equal(validateEmail("user name@gmail.com").isValid, false);
  assert.equal(validateEmail("username@gm ail.com").isValid, false);
});

test("Issue 051: validateEmail rejects display-name syntax and angle brackets", () => {
  const res1 = validateEmail("Rahul Agrawal <rahul@gmail.com>");
  assert.equal(res1.isValid, false);
  assert.match(res1.error, /display names|angle brackets/i);

  const res2 = validateEmail("<rahul@gmail.com>");
  assert.equal(res2.isValid, false);
});

test("Issue 051: validateEmail rejects dangerous punctuation and quotes", () => {
  assert.equal(validateEmail("'rahul'@gmail.com").isValid, false);
  assert.equal(validateEmail('"rahul"@gmail.com').isValid, false);
  assert.equal(validateEmail("rahul\\@gmail.com").isValid, false);
  assert.equal(validateEmail("rahul;test@gmail.com").isValid, false);
  assert.equal(validateEmail("rahul,test@gmail.com").isValid, false);
});

test("Issue 051: validateEmail rejects multiple @ symbols or missing @ symbol", () => {
  const res1 = validateEmail("rahul@@gmail.com");
  assert.equal(res1.isValid, false);
  assert.match(res1.error, /multiple @/i);

  const res2 = validateEmail("rahul@work@gmail.com");
  assert.equal(res2.isValid, false);

  const res3 = validateEmail("rahul.gmail.com");
  assert.equal(res3.isValid, false);
});

test("Issue 051: validateEmail rejects invalid local-part boundary dots and consecutive dots", () => {
  assert.equal(validateEmail(".rahul@gmail.com").isValid, false);
  assert.equal(validateEmail("rahul.@gmail.com").isValid, false);
  assert.equal(validateEmail("ra..hul@gmail.com").isValid, false);
});

test("Issue 051: validateEmail rejects invalid domain boundaries, consecutive dots, and missing TLD", () => {
  assert.equal(validateEmail("rahul@.gmail.com").isValid, false);
  assert.equal(validateEmail("rahul@gmail.com.").isValid, false);
  assert.equal(validateEmail("rahul@-gmail.com").isValid, false);
  assert.equal(validateEmail("rahul@gmail..com").isValid, false);
  assert.equal(validateEmail("rahul@localhost").isValid, false);
  assert.equal(validateEmail("rahul@gmail").isValid, false);
  assert.equal(validateEmail("rahul@127.0.0.1").isValid, false);
});

test("Issue 051: validateEmail enforces RFC 5321 length limits", () => {
  const longLocal = "a".repeat(65) + "@gmail.com";
  assert.equal(validateEmail(longLocal).isValid, false);
  assert.match(validateEmail(longLocal).error, /64 characters/i);

  const longDomain = "user@" + "a".repeat(250) + ".com";
  assert.equal(validateEmail(longDomain).isValid, false);
  assert.match(validateEmail(longDomain).error, /254 characters|255 characters/i);
});

test("Issue 051: validateEmail safely supports Internationalized Domain Names (IDN)", () => {
  // Hindi IDN: .भारत
  const hindiEmail = "vikram@उदाहरण.भारत";
  const hindiRes = validateEmail(hindiEmail);
  assert.equal(hindiRes.isValid, true);
  assert.equal(hindiRes.canonical, "vikram@उदाहरण.भारत");
  assert.ok(hindiRes.asciiDomain.startsWith("xn--"), "Should normalize to ASCII punycode hostname");

  // European IDN: münchen.de
  const deEmail = "ananya@münchen.de";
  const deRes = validateEmail(deEmail);
  assert.equal(deRes.isValid, true);
  assert.equal(deRes.canonical, "ananya@münchen.de");
  assert.equal(deRes.asciiDomain, "xn--mnchen-3ya.de");
});

test("Issue 051: suggestDomainCorrection identifies common consumer domain typos without silent rewrite", () => {
  // Gmail typos
  assert.equal(suggestDomainCorrection("gmial.com"), "gmail.com");
  assert.equal(suggestDomainCorrection("gamil.com"), "gmail.com");
  assert.equal(suggestDomainCorrection("gmaill.com"), "gmail.com");
  assert.equal(suggestDomainCorrection("gmai.com"), "gmail.com");
  assert.equal(suggestDomainCorrection("gmal.com"), "gmail.com");
  assert.equal(suggestDomainCorrection("gmeil.com"), "gmail.com");
  assert.equal(suggestDomainCorrection("gnail.com"), "gmail.com");

  // Yahoo typos
  assert.equal(suggestDomainCorrection("yaho.com"), "yahoo.com");
  assert.equal(suggestDomainCorrection("yahooo.com"), "yahoo.com");
  assert.equal(suggestDomainCorrection("yahoo.co.i"), "yahoo.co.in");

  // Hotmail & Outlook typos
  assert.equal(suggestDomainCorrection("hotmial.com"), "hotmail.com");
  assert.equal(suggestDomainCorrection("outlok.com"), "outlook.com");

  // Rediffmail typos
  assert.equal(suggestDomainCorrection("redifmail.com"), "rediffmail.com");

  // Valid popular domains should return null (no typo)
  assert.equal(suggestDomainCorrection("gmail.com"), null);
  assert.equal(suggestDomainCorrection("yahoo.com"), null);
  assert.equal(suggestDomainCorrection("yahoo.co.in"), null);
  assert.equal(suggestDomainCorrection("outlook.com"), null);

  // Custom corporate / institutional domains must NOT produce false positives
  assert.equal(suggestDomainCorrection("tatagroup.com"), null);
  assert.equal(suggestDomainCorrection("reliance.com"), null);
  assert.equal(suggestDomainCorrection("iitd.ac.in"), null);
  assert.equal(suggestDomainCorrection("stanford.edu"), null);
});

test("Issue 051: validateEmail surfaces suggestion for typo domains", () => {
  const res = validateEmail("rahul@gmial.com");
  assert.equal(res.isValid, true);
  assert.equal(res.canonical, "rahul@gmial.com");
  assert.equal(res.suggestion, "rahul@gmail.com");
});

test("Issue 051: Static code check ensures shared validation is imported across signup and server actions", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");
  const registerCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");

  assert.ok(
    signupCode.includes("validateEmail") || signupCode.includes("email-validation"),
    "signup/page.tsx must import email-validation utility"
  );

  assert.ok(
    registerCode.includes("validateEmail") || registerCode.includes("email-validation"),
    "register.ts must import email-validation utility"
  );
});
