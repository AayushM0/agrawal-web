import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Task 5: business.ts exports initiateBusinessChat with required contracts", () => {
  const actionsPath = path.join(webRoot, "src/actions/business.ts");
  const content = fs.readFileSync(actionsPath, "utf8");

  assert.ok(
    content.includes("export async function initiateBusinessChat"),
    "Must export initiateBusinessChat server action"
  );
  assert.ok(
    content.includes("getSession()"),
    "initiateBusinessChat must enforce authenticated session"
  );
  assert.ok(
    content.includes("isPrimaryContact") || content.includes("linkedDirectors"),
    "Must resolve primary contact director"
  );
  assert.ok(
    content.includes("Business Inquiry") || content.includes("[Business Inquiry:"),
    "Must format contextual business inquiry tag"
  );
  assert.ok(
    content.includes("cannot message yourself") || content.includes("own business") || content.includes("isSelf"),
    "Must prevent self-messaging if caller is the primary contact"
  );
});

test("Task 5: /businesses/[id]/page.tsx wires commercial chat button to initiateBusinessChat", () => {
  const showcasePath = path.join(webRoot, "src/app/businesses/[id]/page.tsx");
  const content = fs.readFileSync(showcasePath, "utf8");

  assert.ok(
    content.includes("initiateBusinessChat"),
    "Showcase page must import and wire initiateBusinessChat action"
  );
  assert.ok(
    content.includes("handleCommercialChat") || content.includes("initiateBusinessChat"),
    "Showcase page must have handler for commercial chat"
  );
  assert.ok(
    content.includes("/login") || content.includes("isGuest"),
    "Showcase page must redirect unauthenticated visitors to login"
  );
});
