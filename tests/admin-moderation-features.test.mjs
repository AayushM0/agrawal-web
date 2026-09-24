import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");

test("Task 3: Admin Pass Direct Download & Member Selection (Issue 043)", () => {
  const pageSrc = fs.readFileSync(
    path.join(webRoot, "src/app/admin/moderation/page.tsx"),
    "utf8"
  );

  // 1. Single-member direct download
  assert.ok(
    pageSrc.includes("/api/pass/pdf?memberId="),
    "page.tsx must reference /api/pass/pdf?memberId= for PDF downloads"
  );
  assert.ok(
    pageSrc.includes("download") && pageSrc.includes('target="_blank"'),
    "page.tsx must provide download and target='_blank' attributes on pass links"
  );

  // 2. Multi-member family selection dropdown
  assert.ok(
    pageSrc.includes("downloadingHouseholdId"),
    "page.tsx must track downloadingHouseholdId state for member selection"
  );
  assert.ok(
    pageSrc.includes("Download Pass ▾") || pageSrc.includes("Download Pass"),
    "page.tsx must render a Download Pass button"
  );
  assert.ok(
    pageSrc.includes("relationToHead === \"self\" ? \"Head\" : m.relationToHead"),
    "page.tsx must display member relation in the dropdown"
  );

  // 3. Individual member card pass download button
  assert.ok(
    pageSrc.includes("<span>Pass</span>") || pageSrc.includes("📥"),
    "page.tsx must render a pass download action for individual member cards"
  );
});

test("Task 4: Admin Dashboard Error Column & Real-Time Diagnostics (Issue 044)", () => {
  const pageSrc = fs.readFileSync(
    path.join(webRoot, "src/app/admin/moderation/page.tsx"),
    "utf8"
  );
  const moderateSrc = fs.readFileSync(
    path.join(webRoot, "src/actions/moderate.ts"),
    "utf8"
  );
  const dbSrc = fs.readFileSync(
    path.join(webRoot, "src/lib/db.ts"),
    "utf8"
  );

  // 1. Household card dispatch warning banner
  assert.ok(
    pageSrc.includes("Dispatch Warning") && pageSrc.includes("h.lastError"),
    "page.tsx must render Dispatch Warning banner when h.lastError is present"
  );
  assert.ok(
    pageSrc.includes("Retry Dispatch"),
    "page.tsx must include a Retry Dispatch button on the warning banner"
  );
  assert.ok(
    pageSrc.includes("Copy Details") || pageSrc.includes("handleCopyError"),
    "page.tsx must include a Copy Details action for error diagnostics"
  );

  // 2. Email Queue Error Diagnostics column
  assert.ok(
    pageSrc.includes("Error Diagnostics"),
    "Email Queue table must have an Error Diagnostics column header"
  );

  // 3. Failed Only filter button
  assert.ok(
    pageSrc.includes("showOnlyFailedEmails") && pageSrc.includes("Failed Only"),
    "Email Queue must include a Failed Only toggle filter button"
  );

  // 4. Backend integration in moderate.ts and db.ts
  assert.ok(
    moderateSrc.includes("getRecentHouseholdWarnings") || moderateSrc.includes("getAdminAuditLogsAction"),
    "moderate.ts must integrate warning diagnostics"
  );
  assert.ok(
    dbSrc.includes("getRecentHouseholdWarnings") && dbSrc.includes("getAdminAuditLogs"),
    "db.ts must implement getRecentHouseholdWarnings and getAdminAuditLogs"
  );
});

test("Task 5: Admin Moderation Dashboard Mobile Responsiveness Overhaul (Issue 045)", () => {
  const pageSrc = fs.readFileSync(
    path.join(webRoot, "src/app/admin/moderation/page.tsx"),
    "utf8"
  );

  // 1. Header & 7 Filter tabs touch container
  assert.ok(
    pageSrc.includes("overflow-x-auto") && pageSrc.includes("no-scrollbar") && pageSrc.includes("min-w-max"),
    "Filter tabs must be wrapped in overflow-x-auto no-scrollbar min-w-max for horizontal swiping on mobile"
  );

  // 2. Touch friendly action buttons
  assert.ok(
    pageSrc.includes("min-h-[38px]"),
    "Action buttons must have min-h-[38px] tap target for touch devices"
  );

  // 3. Tables with responsive min-widths
  assert.ok(
    pageSrc.includes("min-w-[700px]") && pageSrc.includes("min-w-[800px]"),
    "Tables must have min-w-[700px] or min-w-[800px] to prevent column crushing"
  );

  // 4. Member card grid
  assert.ok(
    pageSrc.includes("grid-cols-1 md:grid-cols-2"),
    "Member cards must be single column on mobile and dual column on desktop"
  );

  // 5. Rejection Modal mobile scrollability
  assert.ok(
    pageSrc.includes("max-h-[90vh]") && pageSrc.includes("overflow-y-auto") && pageSrc.includes("p-5 sm:p-7"),
    "Rejection modal must be responsive with max-h-[90vh] overflow-y-auto p-5 sm:p-7"
  );
});
