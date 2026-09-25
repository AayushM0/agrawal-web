import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Task 1: business_profiles schema DDL, RLS, and indexes exist in schema.sql", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");

  // DDL & Foreign keys
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS business_profiles"), "schema.sql must contain business_profiles table");
  assert.ok(schemaSql.includes("household_id UUID NOT NULL REFERENCES households(id)"), "Must reference households(id) ON DELETE CASCADE");
  assert.ok(schemaSql.includes("created_by_member_id UUID NOT NULL REFERENCES members(id)"), "Must reference members(id) ON DELETE CASCADE");
  assert.ok(schemaSql.includes("status VARCHAR(32) NOT NULL DEFAULT 'pending_review'"), "Default status must be pending_review");
  assert.ok(schemaSql.includes("is_verified_badge BOOLEAN NOT NULL DEFAULT FALSE"), "Must include is_verified_badge boolean column");
  assert.ok(schemaSql.includes("linked_directors JSONB NOT NULL DEFAULT '[]'::jsonb"), "Must include linked_directors JSONB");
  assert.ok(schemaSql.includes("custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb"), "Must include custom_fields JSONB");

  // RLS enablement
  assert.ok(schemaSql.includes("ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;"), "schema.sql must enable RLS on business_profiles");

  // Indexes
  assert.ok(schemaSql.includes("idx_business_profiles_status"), "Must define index on status");
  assert.ok(schemaSql.includes("idx_business_profiles_household"), "Must define index on household_id");
  assert.ok(schemaSql.includes("idx_business_profiles_sector"), "Must define index on industry_sector");
  assert.ok(schemaSql.includes("idx_business_profiles_city"), "Must define index on city");
  assert.ok(schemaSql.includes("idx_business_profiles_created_by"), "Must define index on created_by_member_id");
});

test("Task 1: src/types/business.ts exports accurate TypeScript data contracts", () => {
  const typesPath = path.join(webRoot, "src/types/business.ts");
  assert.ok(fs.existsSync(typesPath), "src/types/business.ts must exist");

  const typesContent = fs.readFileSync(typesPath, "utf8");
  assert.ok(typesContent.includes("export interface LinkedDirector"), "Must export LinkedDirector interface");
  assert.ok(typesContent.includes("isPrimaryContact: boolean"), "LinkedDirector must include isPrimaryContact boolean");
  assert.ok(typesContent.includes("export interface BusinessCustomField"), "Must export BusinessCustomField interface");
  assert.ok(typesContent.includes("export interface BusinessProfile"), "Must export BusinessProfile interface");
  assert.ok(typesContent.includes('"pending_review" | "live" | "paused" | "rejected"'), "BusinessProfile must specify valid status unions");
});

test("Task 1: src/lib/db.ts exports complete CRUD and query methods for business_profiles", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  assert.ok(dbCode.includes("createBusinessProfile"), "db.ts must implement createBusinessProfile");
  assert.ok(dbCode.includes("getBusinessProfileById"), "db.ts must implement getBusinessProfileById");
  assert.ok(dbCode.includes("getLiveBusinessProfiles"), "db.ts must implement getLiveBusinessProfiles");
  assert.ok(dbCode.includes("getBusinessProfilesByHouseholdId"), "db.ts must implement getBusinessProfilesByHouseholdId");
  assert.ok(dbCode.includes("updateBusinessProfile"), "db.ts must implement updateBusinessProfile");
  assert.ok(dbCode.includes("setBusinessProfileStatus"), "db.ts must implement setBusinessProfileStatus");
  assert.ok(dbCode.includes("deleteBusinessProfile"), "db.ts must implement deleteBusinessProfile");
  assert.ok(dbCode.includes("ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;"), "db.ts schema setup must enable RLS on business_profiles");
});
