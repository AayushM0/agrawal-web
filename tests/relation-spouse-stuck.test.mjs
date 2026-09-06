import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("TDD Repro: signup/page.tsx updateAdditionalMember must use functional state updater and support atomic multiple field updates", () => {
  const signupCode = fs.readFileSync(path.join(webRoot, "src/app/signup/page.tsx"), "utf8");

  // In signup/page.tsx, updateAdditionalMember MUST use functional updater (prev) => ...
  const usesFunctionalState = signupCode.includes("setAdditionalMembers((prev)") || 
                              signupCode.includes("setAdditionalMembers(prev =>");
  assert.ok(
    usesFunctionalState,
    "updateAdditionalMember in signup/page.tsx must use functional state update `setAdditionalMembers((prev) => ...)` so back-to-back updates don't clobber relationToHead"
  );

  // In the relationToHead select onChange handler, it must NOT call updateAdditionalMember twice in a row with stale state
  const hasStaleDoubleCall = signupCode.includes('updateAdditionalMember(member.id, "relationToHead", rel);\n                                if (["father"');
  assert.ok(
    !hasStaleDoubleCall,
    "signup/page.tsx must not make sequential conflicting calls that revert relationToHead to spouse"
  );
});

test("TDD: dashboard/page.tsx and profile.ts support updating member relation in Edit Member modal", () => {
  const profileActionCode = fs.readFileSync(path.join(webRoot, "src/actions/profile.ts"), "utf8");
  const dashboardCode = fs.readFileSync(path.join(webRoot, "src/app/dashboard/page.tsx"), "utf8");

  // profile.ts should allow updating relationToHead for non-self members
  assert.ok(
    profileActionCode.includes("relationToHead?:") && !profileActionCode.includes("relationToHead: existing.relationToHead,\n  });"),
    "profile.ts saveMemberProfile must accept relationToHead and allow updating it"
  );

  // dashboard/page.tsx edit modal should provide a relationToHead select for non-self members
  assert.ok(
    dashboardCode.includes("editingMember.relationToHead") && dashboardCode.includes("Relationship to Head"),
    "dashboard/page.tsx Edit Member modal must provide a select for relationToHead"
  );
});

test("TDD: db.ts updateMemberProfile writes relation_to_head to PostgreSQL", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  assert.ok(
    dbCode.includes("relation_to_head = COALESCE(") && dbCode.includes("updates.relationToHead"),
    "db.ts updateMemberProfile must include relation_to_head in UPDATE query so relationship changes persist to PostgreSQL"
  );
});

