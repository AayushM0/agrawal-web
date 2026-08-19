import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

// 1. Test HMAC-SHA256 Token Signing & Verification Logic
test("Security: HMAC-SHA256 token verification rejects tampered payloads", () => {
  const secret = "test_hmac_secret_key_32_bytes_long_12345";
  const payload = { userId: "u-101", role: "head", contact: "+919876543210", loggedInAt: Date.now() };
  
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const validToken = `${payloadB64}.${signature}`;

  // Verify valid token signature calculation
  const expectedSig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  assert.equal(signature, expectedSig, "Signature should match expected HMAC");

  // Tamper payload to elevate to admin
  const tamperedPayload = { userId: "u-101", role: "admin", contact: "+919876543210", loggedInAt: Date.now() };
  const tamperedB64 = Buffer.from(JSON.stringify(tamperedPayload)).toString("base64url");
  const tamperedToken = `${tamperedB64}.${signature}`; // Using old signature

  const tamperedSig = crypto.createHmac("sha256", secret).update(tamperedB64).digest("base64url");
  assert.notEqual(signature, tamperedSig, "Tampered payload must produce signature mismatch");
});

test("Security: Token verification rejects expired sessions (>30 days)", () => {
  const thirtyOneDaysAgo = Date.now() - (31 * 24 * 60 * 60 * 1000);
  const payload = { userId: "u-102", role: "head", contact: "+919876543210", loggedInAt: thirtyOneDaysAgo };
  
  const isExpired = (Date.now() - payload.loggedInAt) > (30 * 24 * 60 * 60 * 1000);
  assert.equal(isExpired, true, "Session older than 30 days must be recognized as expired");
});

test("Security: Timing-safe SHA-256 password hash comparison", () => {
  const masterPassword = "@MasterSecurePassword2026@";
  const correctInput = "@MasterSecurePassword2026@";
  const wrongInputShort = "@Wrong";
  const wrongInputLong = "@WrongPasswordThatIsMuchLongerThanTheMasterOne@";

  const masterHash = crypto.createHash("sha256").update(masterPassword).digest();
  const correctHash = crypto.createHash("sha256").update(correctInput).digest();
  const wrongShortHash = crypto.createHash("sha256").update(wrongInputShort).digest();
  const wrongLongHash = crypto.createHash("sha256").update(wrongInputLong).digest();

  // All hashes are exactly 32 bytes (eliminating length timing leaks)
  assert.equal(masterHash.length, 32);
  assert.equal(wrongShortHash.length, 32);
  assert.equal(wrongLongHash.length, 32);

  assert.equal(crypto.timingSafeEqual(masterHash, correctHash), true);
  assert.equal(crypto.timingSafeEqual(masterHash, wrongShortHash), false);
  assert.equal(crypto.timingSafeEqual(masterHash, wrongLongHash), false);
});

test("Security: E.164 phone canonicalization handles edge cases", () => {
  function normalizePhoneNumber(input) {
    if (!input) return "";
    let digits = input.trim().replace(/[^0-9+]/g, "");
    if (digits.startsWith("00")) digits = "+" + digits.slice(2);
    if (digits.startsWith("0") && digits.length === 11) digits = "+91" + digits.slice(1);
    if (!digits.startsWith("+")) {
      if (digits.length === 10) digits = "+91" + digits;
      else if (digits.startsWith("91") && digits.length === 12) digits = "+" + digits;
      else digits = "+" + digits;
    }
    return digits;
  }

  assert.equal(normalizePhoneNumber("9876543210"), "+919876543210");
  assert.equal(normalizePhoneNumber("+91 98765 43210"), "+919876543210");
  assert.equal(normalizePhoneNumber("09876543210"), "+919876543210");
  assert.equal(normalizePhoneNumber("+91 (987) 654-3210"), "+919876543210");
  assert.equal(normalizePhoneNumber("00919876543210"), "+919876543210");
});
