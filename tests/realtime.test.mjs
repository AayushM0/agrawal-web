import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Pusher 1: Pusher configuration helper exists and exports isPusherConfigured", () => {
  const helperPath = path.join(webRoot, "src/lib/pusher.ts");
  assert.ok(fs.existsSync(helperPath), "src/lib/pusher.ts must exist");
  const code = fs.readFileSync(helperPath, "utf8");
  assert.ok(code.includes("isPusherConfigured"), "must export isPusherConfigured");
  assert.ok(code.includes("PUSHER_APP_ID"), "must check PUSHER_APP_ID");
  assert.ok(code.includes("NEXT_PUBLIC_PUSHER_APP_KEY"), "must check NEXT_PUBLIC_PUSHER_APP_KEY");
});

test("Pusher 2: useChatRealtime hook encapsulates Pusher channel lifecycle", () => {
  const hookPath = path.join(webRoot, "src/hooks/useChatRealtime.ts");
  assert.ok(fs.existsSync(hookPath), "src/hooks/useChatRealtime.ts must exist");
  const code = fs.readFileSync(hookPath, "utf8");
  assert.ok(code.includes("getPusherClient"), "hook must use getPusherClient singleton");
  assert.ok(code.includes("private-chat-room-"), "hook must subscribe to private-chat-room channel");
  assert.ok(code.includes("private-user-"), "hook must subscribe to private-user channel");
  assert.ok(code.includes("unsubscribe"), "hook must clean up channels on unmount");
});

test("Pusher 3: Pusher auth route handles authentication and IDOR enforcement", () => {
  const routePath = path.join(webRoot, "src/app/api/pusher/auth/route.ts");
  assert.ok(fs.existsSync(routePath), "src/app/api/pusher/auth/route.ts must exist");
  const code = fs.readFileSync(routePath, "utf8");
  assert.ok(code.includes("getSession"), "must validate session cookie");
  assert.ok(code.includes("authorizeChannel"), "must authorize Pusher channel");
  assert.ok(code.includes("401"), "must return 401 on unauthenticated requests");
  assert.ok(code.includes("403"), "must return 403 on IDOR unauthorized requests");
});

test("Pusher 4: Messages dashboard hooks into useChatRealtime and suspends polling when live", () => {
  const pagePath = path.join(webRoot, "src/app/dashboard/messages/page.tsx");
  const code = fs.readFileSync(pagePath, "utf8");
  assert.ok(code.includes("useChatRealtime"), "messages page must import and call useChatRealtime");
  assert.ok(code.includes("isRealtimeConnected"), "messages page must track realtime connection state");
  assert.ok(code.includes("currentMemberId"), "messages page must provide member ID for notifications");
});

test("Pusher 5: chat server actions trigger Pusher events", () => {
  const chatActionsPath = path.join(webRoot, "src/actions/chat.ts");
  const code = fs.readFileSync(chatActionsPath, "utf8");
  assert.ok(code.includes("new-message"), "sendMessage must trigger new-message event");
  assert.ok(code.includes("incoming-message"), "sendMessage must trigger incoming-message event");
  assert.ok(code.includes("conversation-updated"), "respondToRequest must trigger conversation-updated event");
});
