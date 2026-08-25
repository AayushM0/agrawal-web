import test from "node:test";
import assert from "node:assert/strict";

test("Issue 018: Anti-fraud scanner detects Devanagari financial solicitation and suspicious shorteners", async () => {
  const { scanForFraud } = await import("../src/lib/anti-fraud.ts");

  // Devanagari phrase
  const hindiMsg = scanForFraud("कृपया तुरंत 10,000 रुपये मेरे खाते में ट्रांसफर करें पैसे भेजो");
  assert.equal(hindiMsg.isFlagged, true, "Devanagari money transfer phrase must be flagged");

  // OTP sharing solicitation
  const otpMsg = scanForFraud("कृपया अपने फोन पर आया हुआ ओटीपी शेयर करें");
  assert.equal(otpMsg.isFlagged, true, "OTP sharing attempt in Hindi must be flagged");

  // Suspicious URL shortener
  const shortenerMsg = scanForFraud("Claim your cash reward here: https://bit.ly/claim-reward-now");
  assert.equal(shortenerMsg.isFlagged, true, "URL shortener link must be flagged");
  assert.ok(shortenerMsg.reason.includes("shortener") || shortenerMsg.reason.includes("link"), "Reason must mention shortener/link");
});
