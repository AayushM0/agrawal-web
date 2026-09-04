import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePassword, hashPassword } from "../src/lib/auth-crypto.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("TDD: validatePassword validates registration passwords correctly", () => {
  assert.equal(validatePassword("").valid, false);
  assert.equal(validatePassword("short1!").valid, false);
  assert.equal(validatePassword("nouppercase123!").valid, false);
  assert.equal(validatePassword("NOLOWERCASE123!").valid, false);
  assert.equal(validatePassword("NoNumbersHere!").valid, false);
  assert.equal(validatePassword("ValidPassword123").valid, true);
});

test("TDD: hashPassword generates valid bcrypt hash for household registration", async () => {
  const hash = await hashPassword("Agrawal@2026");
  assert.ok(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$"));
});

test("TDD: register.ts enforces password validation and password hashing", () => {
  const registerFile = fs.readFileSync(path.join(__dirname, "../src/actions/register.ts"), "utf8");
  assert.ok(registerFile.includes("validatePassword(input.password)"), "registerHousehold must validate password");
  assert.ok(registerFile.includes("hashPassword(input.password)"), "registerHousehold must hash password");
  assert.ok(registerFile.includes("passwordHash"), "newHousehold must store passwordHash");
});

test("TDD: db.ts createHousehold persists password_hash for members", () => {
  const dbFile = fs.readFileSync(path.join(__dirname, "../src/lib/db.ts"), "utf8");
  assert.ok(dbFile.includes("password_hash"), "insertMQuery must include password_hash");
  assert.ok(dbFile.includes("household.passwordHash"), "head member must inherit household passwordHash");
});

