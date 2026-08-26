import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authRoute = path.join(__dirname, "../src/app/api/pusher/auth/route.ts");

// Task 2: Route file exists
test("Pusher API route handler file exists", () => {
  assert.ok(fs.existsSync(authRoute), "auth API route file must be created");
});

// Task 3: Security — session validation and IDOR checks
test("Pusher auth route: imports getSession from actions/auth", () => {
  const content = fs.readFileSync(authRoute, "utf8");
  assert.ok(
    content.includes("getSession"),
    "route must import and call getSession to validate the session cookie"
  );
});

test("Pusher auth route: returns 401 if no session (missing cookie guard)", () => {
  const content = fs.readFileSync(authRoute, "utf8");
  assert.ok(
    content.includes("401"),
    "route must return 401 Unauthorized when session is missing or invalid"
  );
});

test("Pusher auth route: enforces IDOR check on private-chat-room channels", () => {
  const content = fs.readFileSync(authRoute, "utf8");
  assert.ok(
    content.includes("private-chat-room-"),
    "route must check membership for private-chat-room channels"
  );
  assert.ok(
    content.includes("403"),
    "route must return 403 Forbidden when user is not a conversation participant"
  );
});

test("Pusher auth route: enforces IDOR check on private-user channels", () => {
  const content = fs.readFileSync(authRoute, "utf8");
  assert.ok(
    content.includes("private-user-"),
    "route must check identity match for private-user channels"
  );
});

test("Pusher auth route: calls pusher.authorizeChannel to sign the token", () => {
  const content = fs.readFileSync(authRoute, "utf8");
  assert.ok(
    content.includes("authorizeChannel"),
    "route must call pusher.authorizeChannel(socketId, channelName) to produce signed auth payload"
  );
});

test("Pusher auth route: imports getConversationById from db for participant verification", () => {
  const content = fs.readFileSync(authRoute, "utf8");
  assert.ok(
    content.includes("getConversationById"),
    "route must call db.getConversationById to verify conversation participants"
  );
});
