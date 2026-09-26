import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 048 - Task 5: job_postings and job_applications DDL and types exist", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");
  const typesContent = fs.readFileSync(path.join(webRoot, "src/types/career.ts"), "utf8");

  // DDL
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS job_postings"), "schema.sql must contain job_postings");
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS job_applications"), "schema.sql must contain job_applications");
  assert.ok(schemaSql.includes("ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;"), "RLS must be enabled on job_postings");
  assert.ok(schemaSql.includes("ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;"), "RLS must be enabled on job_applications");

  // Types
  assert.ok(typesContent.includes("export interface JobPosting"), "types/career.ts must export JobPosting");
  assert.ok(typesContent.includes("export interface JobApplication"), "types/career.ts must export JobApplication");
  assert.ok(typesContent.includes("export interface CreateJobPostingInput"), "types/career.ts must export CreateJobPostingInput");
});

test("Issue 048 - Task 5: src/actions/career.ts exports job posting and application actions", () => {
  const actionsPath = path.join(webRoot, "src/actions/career.ts");
  const content = fs.readFileSync(actionsPath, "utf8");

  assert.ok(content.includes("createJobPostingAction"), "Must export createJobPostingAction");
  assert.ok(content.includes("getLiveJobPostingsAction"), "Must export getLiveJobPostingsAction");
  assert.ok(content.includes("getJobPostingByIdAction"), "Must export getJobPostingByIdAction");
  assert.ok(content.includes("applyForJobAction"), "Must export applyForJobAction");
});

test("Issue 048 - Task 5: /careers/jobs/create and /careers/jobs/[id] pages exist", () => {
  const createJobPath = path.join(webRoot, "src/app/careers/jobs/create/page.tsx");
  assert.ok(fs.existsSync(createJobPath), "src/app/careers/jobs/create/page.tsx must exist");

  const createContent = fs.readFileSync(createJobPath, "utf8");
  assert.ok(createContent.includes("createJobPostingAction"), "Must call createJobPostingAction");
  assert.ok(createContent.includes("title"), "Must include job title input");
  assert.ok(createContent.includes("companyName"), "Must include company name input");

  const detailJobPath = path.join(webRoot, "src/app/careers/jobs/[id]/page.tsx");
  assert.ok(fs.existsSync(detailJobPath), "src/app/careers/jobs/[id]/page.tsx must exist");

  const detailContent = fs.readFileSync(detailJobPath, "utf8");
  assert.ok(detailContent.includes("getJobPostingByIdAction"), "Must call getJobPostingByIdAction");
  assert.ok(detailContent.includes("applyForJobAction"), "Must call applyForJobAction");
  assert.ok(detailContent.includes("Apply with Agarwal Profile") || detailContent.includes("Apply"), "Must provide apply action");
});
