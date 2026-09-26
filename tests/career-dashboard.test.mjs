import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 049 - Task 6: /dashboard includes Career & Jobs management card", () => {
  const dashboardPath = path.join(webRoot, "src/app/dashboard/page.tsx");
  assert.ok(fs.existsSync(dashboardPath), "src/app/dashboard/page.tsx must exist");

  const content = fs.readFileSync(dashboardPath, "utf8");

  // Verify career imports
  assert.ok(
    content.includes("getMyHouseholdApplicationsAction") || content.includes("getCareerProfileByMemberIdAction"),
    "Dashboard must import career actions"
  );

  // Verify Career Card heading & buttons
  assert.ok(
    content.includes("Career & Jobs") || content.includes("Jobs & Careers"),
    "Dashboard must render a Career & Jobs card"
  );
  assert.ok(
    content.includes("/careers/create"),
    "Dashboard must link to career profile builder (/careers/create)"
  );
  assert.ok(
    content.includes("/careers/jobs/create"),
    "Dashboard must link to enterprise job posting (/careers/jobs/create)"
  );

  // Verify application tracking or visibility toggle
  assert.ok(
    content.includes("toggleCareerProfileVisibilityAction") || content.includes("toggleCareerProfileVisibility"),
    "Dashboard must provide career profile visibility toggling"
  );
});
