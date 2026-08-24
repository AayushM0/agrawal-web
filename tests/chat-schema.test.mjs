import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 013: Schema DDL contains conversations, messages, and message_reports tables", () => {
  const schemaSql = fs.readFileSync(path.join(webRoot, "src/db/schema.sql"), "utf8");

  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS conversations"), "Must contain conversations table");
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS messages"), "Must contain messages table");
  assert.ok(schemaSql.includes("CREATE TABLE IF NOT EXISTS message_reports"), "Must contain message_reports table");

  assert.ok(schemaSql.includes("initiator_id"), "Conversations must have initiator_id");
  assert.ok(schemaSql.includes("recipient_id"), "Conversations must have recipient_id");
  assert.ok(schemaSql.includes("status"), "Conversations must have status column");
  assert.ok(schemaSql.includes("message_body"), "Messages must have message_body");
  assert.ok(schemaSql.includes("is_flagged"), "Messages must have is_flagged column");
});

test("Issue 013: db.ts provides required data access methods for chat", () => {
  const dbCode = fs.readFileSync(path.join(webRoot, "src/lib/db.ts"), "utf8");

  assert.ok(dbCode.includes("getOrCreateConversation"), "db.ts must export getOrCreateConversation");
  assert.ok(dbCode.includes("getConversationsForMember"), "db.ts must export getConversationsForMember");
  assert.ok(dbCode.includes("getConversationById"), "db.ts must export getConversationById");
  assert.ok(dbCode.includes("updateConversationStatus"), "db.ts must export updateConversationStatus");
  assert.ok(dbCode.includes("insertMessage"), "db.ts must export insertMessage");
  assert.ok(dbCode.includes("getMessagesByConversation"), "db.ts must export getMessagesByConversation");
  assert.ok(dbCode.includes("markMessagesAsRead"), "db.ts must export markMessagesAsRead");
  assert.ok(dbCode.includes("createMessageReport"), "db.ts must export createMessageReport");
  assert.ok(dbCode.includes("pruneExpiredMessages"), "db.ts must export pruneExpiredMessages");
});
