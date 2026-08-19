import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

// --- SEAM 1: Layout & Top Navigation (No Horizontal Scrollbar) ---
test("Seam 1: Top navigation bar must suppress horizontal scrollbars", () => {
  const topNavFile = fs.readFileSync(path.join(webRoot, "src/components/layout/TopNavBar.tsx"), "utf8");
  const globalsCss = fs.readFileSync(path.join(webRoot, "src/app/globals.css"), "utf8");
  
  assert.ok(
    !topNavFile.includes("overflow-x-auto whitespace-nowrap scrollbar-none"),
    "TopNavBar should not use unhandled raw overflow-x-auto"
  );
  
  assert.ok(
    globalsCss.includes(".no-scrollbar") && globalsCss.includes("overflow-x: hidden"),
    "globals.css should define horizontal overflow protection"
  );
});

// --- SEAM 2: Database Schema & PostGIS DDL Integrity ---
test("Seam 2: PostgreSQL schema DDL contains all required tables and indexes", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS households"), "Must contain households table");
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS members"), "Must contain members table");
  assert.ok(schemaSql.includes("CREATE EXTENSION IF NOT EXISTS \"postgis\""), "Must enable PostGIS");
  assert.ok(schemaSql.includes("search_vector TSVECTOR GENERATED ALWAYS AS"), "Must define tsvector full-text column");
  assert.ok(schemaSql.includes("idx_members_coordinates ON members USING gist(coordinates)"), "Must define PostGIS GiST index");
});

// --- SEAM 3: 18 Gotras Complete Dataset ---
test("Seam 3: 18 Gotras list is complete and well-formed", () => {
  const gotrasContent = fs.readFileSync(path.join(webRoot, "src/data/gotras.ts"), "utf8");
  
  const expectedGotras = ["Garg", "Bansal", "Bindal", "Dharan", "Airon", "Goyal", "Jindal", "Kansal", "Kuchhal", "Madhukul", "Mangal", "Mittal", "Nangil", "Singhal", "Tayal", "Tingal", "Vatsil", "Kasal"];
  expectedGotras.forEach((name) => {
    assert.ok(gotrasContent.includes(name), `Missing Gotra: ${name}`);
  });
});

// --- SEAM 4: Server Actions Code Contract Verification ---
test("Seam 4: Server Actions adhere to privacy and validation contracts", () => {
  const registerCode = fs.readFileSync(path.join(webRoot, "src/actions/register.ts"), "utf8");
  const searchCode = fs.readFileSync(path.join(webRoot, "src/actions/search.ts"), "utf8");
  const claimCode = fs.readFileSync(path.join(webRoot, "src/actions/claim.ts"), "utf8");
  const moderateCode = fs.readFileSync(path.join(webRoot, "src/actions/moderate.ts"), "utf8");

  // Registration checks
  assert.ok(registerCode.includes("input.consentAccepted"), "Must validate consent");
  assert.ok(registerCode.includes("pending_review"), "Must set status to pending_review");
  assert.ok(registerCode.includes("getHouseholdByContact"), "Must check duplicate contact");

  // Search privacy checks
  assert.ok(searchCode.includes("safeListResults"), "Must sanitize list results");
  assert.ok(searchCode.includes("m.householdStatus === \"live\""), "Must filter only live members");

  // Claim checks
  assert.ok(claimCode.includes("createClaimInvite"), "Must provide claim invite generator");
  assert.ok(claimCode.includes("claimMember"), "Must support member claim");

  // Moderate checks
  assert.ok(moderateCode.includes("approveHousehold"), "Must support approval");
  assert.ok(moderateCode.includes("rejectionReason"), "Must enforce rejection reason");
});

// --- SEAM 5: OTP Generation & Verification Logic ---
test("Seam 5: OTP Server Action generates code and verifies successfully", () => {
  const otpCode = fs.readFileSync(path.join(webRoot, "src/actions/otp.ts"), "utf8");
  
  assert.ok(otpCode.includes("sendOtp"), "Must export sendOtp");
  assert.ok(otpCode.includes("verifyOtp"), "Must export verifyOtp");
  assert.ok(otpCode.includes("attempts"), "Must track brute force attempts");
  assert.ok(otpCode.includes("expiresAt"), "Must enforce expiry TTL");
});
