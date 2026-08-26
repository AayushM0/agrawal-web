import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authRoute = path.join(__dirname, "../src/app/api/pusher/auth/route.ts");

test("Pusher API route handler file exists", () => {
  assert.ok(fs.existsSync(authRoute), "auth API route file must be created");
});
