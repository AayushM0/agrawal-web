import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hookPath = path.join(__dirname, "../src/hooks/useChatRealtime.ts");
const content = fs.readFileSync(hookPath, "utf8");

test("useChatRealtime: exports getPusherClient singleton helper", () => {
  assert.ok(
    content.includes("export function getPusherClient"),
    "useChatRealtime must export getPusherClient singleton helper"
  );
});

test("useChatRealtime: subscribes to private chat room channel", () => {
  assert.ok(
    content.includes("private-chat-room-"),
    "useChatRealtime must subscribe to private-chat-room-${conversationId}"
  );
});

test("useChatRealtime: subscribes to private user notifications channel", () => {
  assert.ok(
    content.includes("private-user-"),
    "useChatRealtime must subscribe to private-user-${currentMemberId}"
  );
});

test("useChatRealtime: cleans up by unbinding and unsubscribing", () => {
  assert.ok(
    content.includes("unbind_all") || content.includes("unbind"),
    "useChatRealtime must unbind event listeners on cleanup"
  );
  assert.ok(
    content.includes("unsubscribe"),
    "useChatRealtime must unsubscribe from Pusher channels on cleanup"
  );
});
