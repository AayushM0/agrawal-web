import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(__dirname, "../src/app/dashboard/messages/page.tsx");
const content = fs.readFileSync(pagePath, "utf8");

test("messages page: imports getSession from auth actions", () => {
  assert.ok(
    content.includes('import { getSession }') || content.includes('getSession,'),
    "messages page must import getSession to resolve the current member ID"
  );
});

test("messages page: passes currentMemberId to useChatRealtime hook", () => {
  assert.ok(
    content.includes("currentMemberId"),
    "messages page must pass currentMemberId to useChatRealtime for user notification channels"
  );
});

test("messages page: guards onNewMessage against conversation ID mismatch", () => {
  assert.ok(
    content.includes("incomingMsg.conversationId") || content.includes("incomingMsg.conversation_id"),
    "messages page must verify that incoming message matches selectedConv ID before appending"
  );
});

test("messages page: avoids destructive object replacement when merging conversation updates", () => {
  assert.ok(
    !content.includes("setSelectedConv((prev: any) => ({ ...prev, ...res.conversation }));"),
    "messages page must surgically update conversation properties without blowing away otherParticipant"
  );
});
