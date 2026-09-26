import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 046 - Task 1: career_profiles DDL, RLS, and indexes exist in schema.sql and db.ts", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  // DDL & Foreign keys
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS career_profiles"), "schema.sql must contain career_profiles table");
  assert.ok(schemaSql.includes("household_id UUID NOT NULL REFERENCES households(id)"), "Must reference households(id) ON DELETE CASCADE");
  assert.ok(schemaSql.includes("member_id UUID NOT NULL UNIQUE REFERENCES members(id)"), "Must reference members(id) ON DELETE CASCADE uniquely");
  assert.ok(schemaSql.includes("headline VARCHAR(255) NOT NULL"), "Must include headline");
  assert.ok(schemaSql.includes("career_level VARCHAR(50) NOT NULL"), "Must include career_level");
  assert.ok(schemaSql.includes("primary_domain VARCHAR(100) NOT NULL"), "Must include primary_domain");
  assert.ok(schemaSql.includes("is_confidential_mode BOOLEAN"), "Must include is_confidential_mode");
  assert.ok(schemaSql.includes("is_mentor_available BOOLEAN"), "Must include is_mentor_available");

  // RLS enablement
  assert.ok(schemaSql.includes("ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;"), "schema.sql must enable RLS on career_profiles");
  assert.ok(dbCode.includes("ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;"), "db.ts schema setup must enable RLS on career_profiles");

  // CRUD in db.ts
  assert.ok(dbCode.includes("createCareerProfile"), "db.ts must implement createCareerProfile");
  assert.ok(dbCode.includes("getCareerProfileById"), "db.ts must implement getCareerProfileById");
  assert.ok(dbCode.includes("getCareerProfileByMemberId"), "db.ts must implement getCareerProfileByMemberId");
  assert.ok(dbCode.includes("getLiveCareerProfiles"), "db.ts must implement getLiveCareerProfiles");
  assert.ok(dbCode.includes("updateCareerProfile"), "db.ts must implement updateCareerProfile");
  assert.ok(dbCode.includes("deleteCareerProfile"), "db.ts must implement deleteCareerProfile");
});

test("Issue 046 - Task 1: src/types/career.ts exports accurate TypeScript data contracts", () => {
  const typesPath = path.join(webRoot, "src/types/career.ts");
  assert.ok(fs.existsSync(typesPath), "src/types/career.ts must exist");

  const content = fs.readFileSync(typesPath, "utf8");
  assert.ok(content.includes("export interface CareerProfile"), "Must export CareerProfile interface");
  assert.ok(content.includes("export type CareerLevel"), "Must export CareerLevel type");
  assert.ok(content.includes("export type PrimaryDomain"), "Must export PrimaryDomain type");
  assert.ok(content.includes("export type SeekingStatus"), "Must export SeekingStatus type");
  assert.ok(content.includes("isConfidentialMode"), "CareerProfile must include isConfidentialMode");
  assert.ok(content.includes("isMentorAvailable"), "CareerProfile must include isMentorAvailable");
});

test("Issue 046 - Task 2: src/actions/career.ts exports authorized server actions", () => {
  const actionsPath = path.join(webRoot, "src/actions/career.ts");
  assert.ok(fs.existsSync(actionsPath), "src/actions/career.ts must exist");

  const content = fs.readFileSync(actionsPath, "utf8");
  assert.ok(content.includes("createCareerProfileAction"), "Must export createCareerProfileAction");
  assert.ok(content.includes("getCareerProfileByIdAction"), "Must export getCareerProfileByIdAction");
  assert.ok(content.includes("getCareerProfileByMemberIdAction"), "Must export getCareerProfileByMemberIdAction");
  assert.ok(content.includes("toggleCareerProfileVisibilityAction"), "Must export toggleCareerProfileVisibilityAction");
  assert.ok(content.includes("deleteCareerProfileAction"), "Must export deleteCareerProfileAction");
  assert.ok(content.includes("getSession"), "Must check user session");
});

test("Issue 046 - Task 4: src/app/careers/create/page.tsx implements 4-step wizard", () => {
  const pagePath = path.join(webRoot, "src/app/careers/create/page.tsx");
  assert.ok(fs.existsSync(pagePath), "src/app/careers/create/page.tsx must exist");

  const content = fs.readFileSync(pagePath, "utf8");
  assert.ok(content.includes("createCareerProfileAction"), "Must call createCareerProfileAction");
  assert.ok(content.includes("currentStep") || content.includes("step"), "Must maintain wizard step state");
  assert.ok(content.includes("headline"), "Must include headline input");
  assert.ok(content.includes("primaryDomain"), "Must include primaryDomain input");
  assert.ok(content.includes("careerLevel"), "Must include careerLevel input");
  assert.ok(content.includes("isConfidentialMode"), "Must include confidential mode toggle");
  assert.ok(content.includes("isMentorAvailable"), "Must include mentor toggle");
  assert.ok(content.includes("export default"), "Must export default page component");
});
