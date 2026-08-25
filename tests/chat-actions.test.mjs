import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Issue 014: chat.ts exists, declares 'use server', and exports required actions", () => {
  const chatPath = path.join(webRoot, "src/actions/chat.ts");
  assert.ok(fs.existsSync(chatPath), "src/actions/chat.ts must exist");
  const code = fs.readFileSync(chatPath, "utf8");

  assert.ok(code.includes("'use server'") || code.includes('"use server"'), "chat.ts must declare 'use server'");
  assert.ok(code.includes("export async function sendMessage"), "Must export sendMessage");
  assert.ok(code.includes("export async function getConversations"), "Must export getConversations");
  assert.ok(code.includes("export async function getMessages"), "Must export getMessages");
  assert.ok(code.includes("export async function respondToRequest"), "Must export respondToRequest");
  assert.ok(code.includes("export async function reportConversation"), "Must export reportConversation");
});

test("Issue 014: Anti-fraud scanner accurately detects UPI IDs and bank account triggers", async () => {
  const { scanForFraud } = await import("../src/lib/anti-fraud.ts");
  
  const cleanMsg = scanForFraud("Namaste! We are looking forward to connecting about the upcoming community gathering.");
  assert.equal(cleanMsg.isFlagged, false, "Clean greeting must not be flagged");

  const upiMsg = scanForFraud("Please send payment of Rs 5000 to agrawal.trust@oksbi urgently");
  assert.equal(upiMsg.isFlagged, true, "UPI handle must be flagged");
  assert.ok(upiMsg.reason.includes("UPI"), "Flag reason must mention UPI");

  const bankMsg = scanForFraud("Transfer the funds to Account 987654321012 IFSC HDFC0001234");
  assert.equal(bankMsg.isFlagged, true, "IFSC/Bank pattern must be flagged");

  const scamKeywordMsg = scanForFraud("Guaranteed 200% return in 3 days! Join this crypto investment scheme now.");
  assert.equal(scamKeywordMsg.isFlagged, true, "Investment scam keyword must be flagged");
});
