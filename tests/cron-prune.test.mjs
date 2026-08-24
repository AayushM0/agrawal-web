import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 016: /api/cron/prune-messages route handler exists and requires CRON_SECRET auth", () => {
  const cronPath = path.join(webRoot, "src/app/api/cron/prune-messages/route.ts");
  assert.ok(fs.existsSync(cronPath), "src/app/api/cron/prune-messages/route.ts must exist");
  const code = fs.readFileSync(cronPath, "utf8");

  assert.ok(code.includes("CRON_SECRET"), "Must check CRON_SECRET");
  assert.ok(code.includes("pruneExpiredMessages"), "Must invoke db.pruneExpiredMessages");
  assert.ok(code.includes("401") || code.includes("Unauthorized"), "Must return 401 on missing secret");
});
