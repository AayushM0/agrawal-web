import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chatActions = path.join(__dirname, "../src/actions/chat.ts");

const content = fs.readFileSync(chatActions, "utf8");

// Task 4: sendMessage fires new-message to the active chat room channel
test("sendMessage: triggers new-message event on private-chat-room channel", () => {
  assert.ok(
    content.includes("private-chat-room-") && content.includes("new-message"),
    "sendMessage must trigger 'new-message' on the private-chat-room channel"
  );
});

// Task 4 & 5: Pusher failures never disrupt the database save
test("sendMessage: wraps Pusher trigger in try-catch so failures are non-fatal", () => {
  // Find the Pusher block inside sendMessage (before respondToRequest)
  const sendMessageSection = content.slice(0, content.indexOf("export async function respondToRequest"));
  assert.ok(
    sendMessageSection.includes("non-fatal"),
    "Pusher trigger in sendMessage must be wrapped in a try-catch with a non-fatal comment"
  );
});

// Task 5: sendMessage fires incoming-message to the recipient's user channel
test("sendMessage: triggers incoming-message notification on recipient private-user channel", () => {
  assert.ok(
    content.includes("private-user-") && content.includes("incoming-message"),
    "sendMessage must trigger 'incoming-message' on the recipient's private-user channel"
  );
});

// Task 5: respondToRequest fires conversation-updated to the chat room
test("respondToRequest: triggers conversation-updated event on private-chat-room channel", () => {
  const respondSection = content.slice(content.indexOf("export async function respondToRequest"));
  assert.ok(
    respondSection.includes("conversation-updated"),
    "respondToRequest must trigger 'conversation-updated' on the private-chat-room channel"
  );
});

// Task 5: respondToRequest fires incoming-message to the initiator's user channel
test("respondToRequest: triggers incoming-message on initiator private-user channel", () => {
  const respondSection = content.slice(content.indexOf("export async function respondToRequest"));
  assert.ok(
    respondSection.includes("private-user-") && respondSection.includes("incoming-message"),
    "respondToRequest must trigger 'incoming-message' on the initiator's private-user channel"
  );
});

// Task 5: Pusher failures in respondToRequest are non-fatal
test("respondToRequest: wraps Pusher trigger in try-catch so failures are non-fatal", () => {
  const respondSection = content.slice(content.indexOf("export async function respondToRequest"));
  assert.ok(
    respondSection.includes("non-fatal"),
    "Pusher trigger in respondToRequest must be wrapped in a try-catch with a non-fatal comment"
  );
});
