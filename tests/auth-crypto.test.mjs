import assert from "node:assert/strict";
import test from "node:test";

let authCrypto;
try {
  authCrypto = await import("../src/lib/auth-crypto.ts");
} catch (e) {
  authCrypto = null;
}

test("TDD RED: auth-crypto module exists", () => {
  assert.ok(authCrypto, "Expected src/lib/auth-crypto.ts to exist and export functions");
});

test("Password complexity: rejects short passwords (< 8 chars)", () => {
  assert.ok(authCrypto, "Module missing");
  const res = authCrypto.validatePassword("Agra1!");
  assert.equal(res.valid, false);
  assert.match(res.error, /at least 8 characters/i);
});

test("Password complexity: rejects passwords without uppercase", () => {
  assert.ok(authCrypto, "Module missing");
  const res = authCrypto.validatePassword("agrawal@2026");
  assert.equal(res.valid, false);
  assert.match(res.error, /uppercase/i);
});

test("Password complexity: rejects passwords without lowercase", () => {
  assert.ok(authCrypto, "Module missing");
  const res = authCrypto.validatePassword("AGRAWAL@2026");
  assert.equal(res.valid, false);
  assert.match(res.error, /lowercase/i);
});

test("Password complexity: rejects passwords without numbers", () => {
  assert.ok(authCrypto, "Module missing");
  const res = authCrypto.validatePassword("AgrawalFoundation!");
  assert.equal(res.valid, false);
  assert.match(res.error, /number/i);
});

test("Password complexity: accepts strong compliant password", () => {
  assert.ok(authCrypto, "Module missing");
  const res = authCrypto.validatePassword("Maharaja@2026");
  assert.equal(res.valid, true);
  assert.equal(res.error, undefined);
});

test("bcryptjs hashing: generates bcrypt hash with cost 12", async () => {
  assert.ok(authCrypto, "Module missing");
  const hash = await authCrypto.hashPassword("Maharaja@2026");
  assert.ok(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$"), "Hash should start with $2a$12$ or $2b$12$");
  
  const hash2 = await authCrypto.hashPassword("Maharaja@2026");
  assert.notEqual(hash, hash2, "Unique salts must generate unique hashes");
});

test("bcryptjs verification: matches valid password and rejects invalid", async () => {
  assert.ok(authCrypto, "Module missing");
  const hash = await authCrypto.hashPassword("Maharaja@2026");
  
  const isMatch = await authCrypto.verifyPassword("Maharaja@2026", hash);
  assert.equal(isMatch, true, "Valid password should verify successfully");

  const isWrong = await authCrypto.verifyPassword("WrongPassword@123", hash);
  assert.equal(isWrong, false, "Wrong password should fail verification");
});

test("Lockout evaluator: returns locked = true when attempts >= 5 within 15 mins", () => {
  assert.ok(authCrypto, "Module missing");
  const now = Date.now();
  const recentAttempts = [
    { success: false, created_at: new Date(now - 1 * 60 * 1000) },
    { success: false, created_at: new Date(now - 2 * 60 * 1000) },
    { success: false, created_at: new Date(now - 3 * 60 * 1000) },
    { success: false, created_at: new Date(now - 4 * 60 * 1000) },
    { success: false, created_at: new Date(now - 5 * 60 * 1000) },
  ];

  const status = authCrypto.evaluateLockout(recentAttempts, now);
  assert.equal(status.locked, true);
  assert.ok(status.remainingMinutes > 0, "Remaining lockout minutes should be positive");
});

test("Lockout evaluator: returns locked = false when attempts < 5", () => {
  assert.ok(authCrypto, "Module missing");
  const now = Date.now();
  const recentAttempts = [
    { success: false, created_at: new Date(now - 1 * 60 * 1000) },
    { success: false, created_at: new Date(now - 2 * 60 * 1000) },
  ];

  const status = authCrypto.evaluateLockout(recentAttempts, now);
  assert.equal(status.locked, false);
});
