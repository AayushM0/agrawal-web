import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Realtime 1: Supabase client library and helper exist", () => {
  const clientPath = path.join(webRoot, "src/lib/supabaseClient.ts");
  assert.ok(fs.existsSync(clientPath), "src/lib/supabaseClient.ts must exist");
  const code = fs.readFileSync(clientPath, "utf8");
  assert.ok(code.includes("getSupabaseBrowserClient"), "must export getSupabaseBrowserClient");
  assert.ok(code.includes("isSupabaseRealtimeAvailable"), "must export isSupabaseRealtimeAvailable");
});

test("Realtime 2: useChatRealtime hook encapsulates WebSocket channel lifecycle", () => {
  const hookPath = path.join(webRoot, "src/hooks/useChatRealtime.ts");
  assert.ok(fs.existsSync(hookPath), "src/hooks/useChatRealtime.ts must exist");
  const code = fs.readFileSync(hookPath, "utf8");
  assert.ok(code.includes("postgres_changes"), "hook must subscribe to postgres_changes");
  assert.ok(code.includes("table: \"messages\"") || code.includes("table: 'messages'"), "hook must listen on messages table");
  assert.ok(code.includes("removeChannel"), "hook must clean up channel on unmount");
});

test("Realtime 3: Schema DDL enables supabase_realtime publication on messages and conversations", () => {
  const schemaPath = path.join(webRoot, "src/db/schema.sql");
  const schemaCode = fs.readFileSync(schemaPath, "utf8");
  assert.ok(schemaCode.includes("ALTER PUBLICATION supabase_realtime ADD TABLE messages"), "schema.sql must add messages to supabase_realtime");
  assert.ok(schemaCode.includes("ALTER PUBLICATION supabase_realtime ADD TABLE conversations"), "schema.sql must add conversations to supabase_realtime");
});

test("Realtime 4: Messages dashboard hooks into useChatRealtime and suspends polling when live", () => {
  const pagePath = path.join(webRoot, "src/app/dashboard/messages/page.tsx");
  const code = fs.readFileSync(pagePath, "utf8");
  assert.ok(code.includes("useChatRealtime"), "messages page must import and call useChatRealtime");
  assert.ok(code.includes("isRealtimeConnected"), "messages page must track realtime connection state");
});
