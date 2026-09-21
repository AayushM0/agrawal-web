/**
 * test-email-notification.mjs
 *
 * Fires a real Resend email exactly as sendMessageRequestNotificationEmail() does.
 * Looks up Ujjwal Garg (serial_no MAFL-000-000-150) from the DB, then sends to
 * aayushmittal620@gmail.com.
 *
 * Usage:
 *   node --env-file=.env.production.local scripts/test-email-notification.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 1. DB connection ─────────────────────────────────────────────────────────
const connStr = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("?pgbouncer=true", "")
  : "postgresql://localhost:5432/agrawal_dev";

console.log("\n🔍 Connecting to DB:", connStr.replace(/:\/\/[^@]*@/, "://<creds>@"));

const client = new Client({ connectionString: connStr });
await client.connect();

// ── 2. Look up Ujjwal Garg (member 150) ─────────────────────────────────────
//    serial_no stores the MAFL string e.g. 'MAFL-000-000-150'
const senderRes = await client.query(`
  SELECT m.id, m.full_name, m.email, m.serial_no, m.current_city, h.gotra, h.native_place
  FROM members m
  LEFT JOIN households h ON h.id = m.household_id
  WHERE m.serial_no = 'MAFL-000-000-150'
  LIMIT 1
`);

// ── 3. Look up Aayush Mittal ─────────────────────────────────────────────────
const recipientRes = await client.query(`
  SELECT id, full_name, email, serial_no
  FROM members
  WHERE email = 'aayushmittal620@gmail.com'
  LIMIT 1
`);

await client.end();

// ── 4. Build input ───────────────────────────────────────────────────────────
let sender;
if (senderRes.rows.length === 0) {
  console.warn("⚠  MAFL-000-000-150 not found in this DB — using hardcoded fallback data.");
  sender = {
    id: "n/a",
    full_name: "Ujjwal Garg",
    email: "ujjwal.garg@gmail.com",
    serial_no: "MAFL-000-000-150",
    current_city: "Jaipur",
    gotra: "Garg",
    native_place: "Agroha",
  };
} else {
  sender = senderRes.rows[0];
}

const recipient = recipientRes.rows[0];

console.log("\n✅ Sender:");
console.log(`   ${sender.full_name} (${sender.serial_no}) — City: ${sender.current_city}, Gotra: ${sender.gotra}`);

if (!recipient) {
  console.warn("⚠  aayushmittal620@gmail.com not found in this DB — will still send to that address.\n");
} else {
  console.log(`\n✅ Recipient in DB: ${recipient.full_name} (${recipient.serial_no})`);
}

const recipientEmail = "aayushmittal620@gmail.com";
const recipientName = recipient?.full_name ?? "Aayush Mittal";
const fakeConversationId = "test-conv-" + Date.now();

// ── 5. Env / API config ───────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://maharajaagrasenfoundation.com";

if (!RESEND_API_KEY) {
  console.error(
    "\n❌ RESEND_API_KEY is not set — run with:\n" +
    "   node --env-file=.env.production.local scripts/test-email-notification.mjs\n"
  );
  process.exit(1);
}

// ── 6. Build email payload ────────────────────────────────────────────────────
const senderGotraStr = sender.gotra ? `Gotra: ${sender.gotra}` : "";
const senderCityStr = sender.current_city ? `Location: ${sender.current_city}` : "";
const senderMeta = [senderGotraStr, senderCityStr].filter(Boolean).join(" • ");
const chatUrl = `${APP_URL}/dashboard/messages?conv=${encodeURIComponent(fakeConversationId)}`;
const messagePreview =
  "Namaste! I came across your profile in the MAFL community directory and would love to connect. I am based in Jaipur and looking to expand my community network.";

const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Message Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #faf6f0; color: #2a1810;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #ebd8be; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(217, 83, 30, 0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #d9531e 0%, #b83f12 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
          Maharaja Agrasen Foundation
        </h1>
        <p style="color: #fde08b; margin: 6px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
          Community Directory &amp; Matrimony
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <p style="font-size: 15px; margin: 0 0 16px 0; color: #422b22;">
          Namaste <b>${recipientName}</b>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; color: #422b22;">
          You have received a new connection message request from <b>${sender.full_name}</b>${senderMeta ? ` (${senderMeta})` : ""}:
        </p>
        <div style="background-color: #fffdfa; border-left: 4px solid #d9531e; border-top: 1px solid #f2e4d0; border-right: 1px solid #f2e4d0; border-bottom: 1px solid #f2e4d0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; font-style: italic; color: #5a3d31; line-height: 1.6;">
            &ldquo;${messagePreview}&rdquo;
          </p>
        </div>
        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="${chatUrl}" target="_blank" style="background-color: #d9531e; color: #ffffff; display: inline-block; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(217, 83, 30, 0.25);">
            View Request &amp; Respond &rarr;
          </a>
        </div>
        <div style="background-color: #fcf8f2; border: 1px solid #f0dfc8; border-radius: 12px; padding: 14px 18px; margin-top: 24px;">
          <p style="margin: 0; font-size: 12px; color: #7a5e52; line-height: 1.5;">
            🔒 <b>Your Privacy is Protected:</b> Your mobile number, personal email, and residential address remain strictly private. The sender can only see what you choose to share after you accept this request. You can accept, decline, or block this request at any time.
          </p>
        </div>
        <p style="font-size: 11px; color: #9b8479; margin-top: 20px; text-align: center;">
          ⚙️ <em>This is a TEST email dispatched from the local dev script — not triggered by actual user action.</em>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #fdfaf7; border-top: 1px solid #f0dfc8; padding: 20px; text-align: center;">
        <p style="font-size: 11px; color: #8e7266; margin: 0;">
          Maharaja Agrasen Foundation Limited Singapore &bull; One Community &bull; One Platform
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── 7. Fire the Resend API call ───────────────────────────────────────────────
console.log("\n📧 Firing Resend API call...");
console.log("   To:     ", recipientEmail);
console.log("   From:   ", RESEND_FROM_EMAIL);
console.log("   Subject:", `[TEST] New Message Request from ${sender.full_name} on Maharaja Agrasen Foundation`);
console.log();

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: RESEND_FROM_EMAIL,
    to: recipientEmail,
    subject: `[TEST] New Message Request from ${sender.full_name} on Maharaja Agrasen Foundation`,
    text: `Namaste ${recipientName},\n\nYou have received a new connection request from ${sender.full_name}${senderMeta ? ` (${senderMeta})` : ""}.\n\nMessage preview:\n"${messagePreview}"\n\nLog in to your dashboard to view and respond:\n${chatUrl}\n\nYour contact details remain strictly hidden until you choose to accept.\n\n-- This is a test email from the dev script.`,
    html: emailHtml,
  }),
});

const responseBody = await res.json().catch(() => ({}));

if (res.ok) {
  console.log("✅ Email dispatched successfully via Resend!");
  console.log("   Resend email ID:", responseBody.id);
  console.log("   Check inbox at: ", recipientEmail);
  console.log("   (may land in spam if domain not fully verified — check both tabs)\n");
} else {
  console.error("❌ Resend API error:");
  console.error("   Status:", res.status);
  console.error("   Body:", JSON.stringify(responseBody, null, 2));
  process.exit(1);
}
