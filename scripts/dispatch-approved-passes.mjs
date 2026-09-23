/**
 * scripts/dispatch-approved-passes.mjs
 *
 * Standalone, resilient execution script to generate official CR80 ID Card PDFs
 * and dispatch approval emails via Resend for the 3 households approved today:
 * 1. Yashwant Kisandas Agarwal (ykagarwal72@gmail.com, 4 members)
 * 2. Sunil Kumar (kumarsunil71831@gmail.com, 1 member)
 * 3. Umesh Kumar Gupta (umesh.gupta1358@gmail.com, 2 members)
 *
 * Usage:
 *   node --env-file=.env.production.local scripts/dispatch-approved-passes.mjs
 */

import dns from "node:dns";
// Force IPv4 resolution to prevent Node.js Undici IPv6 connect timeouts
dns.setDefaultResultOrder("ipv4first");

import pg from "pg";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "./compiled/components/PassPDF.js";
import { createUnifiedPassData } from "./compiled/lib/pass.js";

const { Client } = pg;

// Enforce rate-limit pacing (>= 650ms between Resend API dispatches to strictly stay under 2 req/sec)
let lastResendTime = 0;
async function waitForRateLimitPacing(minIntervalMs = 650) {
  const now = Date.now();
  const elapsed = now - lastResendTime;
  if (elapsed < minIntervalMs) {
    const delay = minIntervalMs - elapsed;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastResendTime = Date.now();
}

const TARGET_HOUSEHOLD_IDS = [
  "74c9538a-0c5e-448a-a2b0-fd120a6079ee", // Yashwant Kisandas Agarwal
  "ddcd992e-f1c9-426a-b39d-f88f46fb1ac2", // Sunil Kumar
  "07cc596a-2ff0-4f61-811e-175a882fa6bd", // Umesh Kumar Gupta
];

async function main() {
  console.log("================================================================================");
  console.log("🚀 Starting Retransmission of Official ID Passes for Approved Households");
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`Target Households: ${TARGET_HOUSEHOLD_IDS.length}`);
  console.log("================================================================================\n");

  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY is missing from environment.");
    process.exit(1);
  }

  const rawConn = process.env.DATABASE_URL || "postgresql://localhost:5432/agrawal_dev";
  const connStr = rawConn.replace("?pgbouncer=true", "");

  const client = new Client({ connectionString: connStr });
  await client.connect();
  console.log("✓ Connected to PostgreSQL database.\n");

  // Ensure email_queue table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS email_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      html_body TEXT NOT NULL,
      text_body TEXT,
      attachments JSONB,
      metadata JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 3,
      last_error TEXT,
      resend_id TEXT,
      scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_email_queue_status_sched ON email_queue(status, scheduled_for, created_at);
    CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at DESC);
    ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
  `);
  console.log("✓ email_queue table verified/created in database.\n");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.maharajaagrasenfoundation.com";
  const passUrl = `${appUrl}/dashboard/pass`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>";

  const transmissionResults = [];

  for (let i = 0; i < TARGET_HOUSEHOLD_IDS.length; i++) {
    const householdId = TARGET_HOUSEHOLD_IDS[i];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[Household ${i + 1}/${TARGET_HOUSEHOLD_IDS.length}] Processing Household ID: ${householdId}`);

    // 1. Fetch Household
    const hRes = await client.query(
      `SELECT id, head_name, gotra, native_place, city, household_code, serial_no, status, verified_contact
       FROM households
       WHERE id = $1
       LIMIT 1`,
      [householdId]
    );

    if (hRes.rows.length === 0) {
      console.error(`❌ Household not found: ${householdId}`);
      continue;
    }

    const h = hRes.rows[0];
    console.log(`✓ Household Found: ${h.head_name} (${h.household_code || "No code"}, Serial: ${h.serial_no || "N/A"})`);
    console.log(`  Gotra: ${h.gotra} | Native Place: ${h.native_place} | City: ${h.city}`);
    console.log(`  Status: ${h.status} | Verified Contact: ${h.verified_contact}`);

    // 2. Fetch Members
    const mRes = await client.query(
      `SELECT id, full_name, email, phone, serial_no, father_name, dob,
              current_city, state, postal_code, full_address,
              profession_freetext, profession_title, aadhaar_number,
              pan_number, photo_url, relation_to_head, marital_status, gender,
              household_id
       FROM members
       WHERE household_id = $1
       ORDER BY CASE WHEN relation_to_head = 'self' THEN 0 ELSE 1 END, id ASC`,
      [householdId]
    );

    const members = mRes.rows;
    console.log(`✓ Found ${members.length} registered member(s) in household.`);

    if (members.length === 0) {
      console.warn(`⚠️ No members found for household ${householdId}, skipping.`);
      continue;
    }

    // 3. Render binary PDF passes for all members
    const attachments = [];
    const memberPassList = [];

    for (const m of members) {
      const memberObj = {
        id: m.id,
        fullName: m.full_name,
        email: m.email,
        phone: m.phone,
        serialNo: m.serial_no,
        fatherName: m.father_name,
        currentCity: m.current_city,
        nativePlace: m.native_place || h.native_place,
        gotra: m.gotra || h.gotra,
        relationToHead: m.relation_to_head || "self",
        maritalStatus: m.marital_status || "Single",
        gender: m.gender || "Male",
        photoUrl: m.photo_url,
        householdCode: h.household_code,
      };

      const householdObj = {
        id: h.id,
        headName: h.head_name,
        gotra: h.gotra,
        nativePlace: h.native_place,
        city: h.city,
        householdCode: h.household_code,
        serialNo: h.serial_no,
      };

      const passData = createUnifiedPassData({ member: memberObj, household: householdObj });
      console.log(`  Rendering PDF for ${m.full_name} (Serial: ${passData.serialNo})...`);

      const pdfBuffer = await renderToBuffer(React.createElement(PassPDF, { passData }));
      console.log(`    ↳ Rendered ${pdfBuffer.length} bytes PDF.`);

      const safeFilename = `ID_Card_${m.full_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      attachments.push({
        filename: safeFilename,
        content: pdfBuffer.toString("base64"),
      });

      memberPassList.push({
        member: m,
        passData,
        safeFilename,
        buffer: pdfBuffer,
      });
    }

    // 4. Determine Primary Recipient Email
    const headMember = members.find((m) => m.relation_to_head === "self") || members[0];
    const primaryEmail =
      (headMember?.email && headMember.email.includes("@") ? headMember.email.trim() : null) ||
      (h.verified_contact && h.verified_contact.includes("@") ? h.verified_contact.trim() : null);

    if (!primaryEmail) {
      console.error(`❌ Could not determine valid primary email for household ${householdId}.`);
      continue;
    }

    const primarySerial = headMember?.serial_no || h.serial_no || h.household_code;
    const memberSummaryList = members
      .map(
        (m, idx) =>
          `<li style="margin-bottom: 6px;"><strong>#${idx + 1}: ${m.full_name}</strong> (${m.relation_to_head === "self" ? "Head of Household" : m.relation_to_head})${m.serial_no ? ` &mdash; Serial No: <code style="font-family: monospace; font-weight: bold; color: #9a3412;">${m.serial_no}</code>` : ""}</li>`
      )
      .join("");

    const subject = `Household Verified - Official ID Passes for All Members (${primarySerial}) - Maharaja Agrasen Foundation`;
    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2a1810; padding: 24px; border: 1px solid #e7e5e4; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #b45309; padding-bottom: 16px;">
          <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin: 0 0 4px 0;">Official Member Identity Pass</p>
          <h1 style="color: #7c2d12; font-size: 20px; margin: 0; font-family: Georgia, serif;">Maharaja Agrasen Foundation Limited Singapore</h1>
          <p style="font-size: 13px; color: #92400e; margin: 4px 0 0 0;">अंतर्राष्ट्रीय अग्रवाल समाज</p>
        </div>

        <h2 style="color: #9a3412; margin-top: 0; font-size: 18px;">Congratulations, ${headMember?.full_name || h.head_name}!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
          Your Maharaja Agrasen Foundation household registration has been successfully verified and approved.
        </p>

        <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; font-weight: bold; color: #92400e; letter-spacing: 0.5px;">Household Serial Number</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-family: monospace; font-weight: 800; color: #9a3412;">${primarySerial}</p>
        </div>

        <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.6;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #7c2d12;"><strong>Official ID cards for all ${members.length} registered member(s) are attached to this email:</strong></p>
          <ul style="margin: 0; padding-left: 20px; color: #57534e;">
            ${memberSummaryList}
          </ul>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
          📎 Each family member's official <strong>CR80 Printable Identity Pass (ID Card)</strong> with <strong>अंतर्राष्ट्रीय अग्रवाल समाज</strong> credentials is attached as an individual PDF.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${passUrl}" style="background-color: #b45309; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 14px; display: inline-block;">
            View Live Passes on Dashboard &rarr;
          </a>
        </div>

        <div style="border-top: 1px solid #e7e5e4; padding-top: 16px; margin-top: 24px; text-align: center;">
          <p style="font-size: 12px; color: #78716c; margin: 0;">
            Maharaja Agrasen Foundation Limited Singapore • अंतर्राष्ट्रीय अग्रवाल समाज फाउंडेशन<br />
            एक समाज • एक मंच • एक परिवार
          </p>
        </div>
      </div>
    `;

    const textBody = `Congratulations, ${headMember?.full_name || h.head_name}!\n\nYour Maharaja Agrasen Foundation household registration has been verified and approved.\nAssigned Serial Number: ${primarySerial}\n\nOfficial ID cards for all ${members.length} member(s) are attached to this email as individual PDFs.\n\nYou can also log in to your household dashboard at any time to view and download live passes for all members: ${passUrl}\n\nMaharaja Agrasen Foundation Limited Singapore • One Community • One Platform`;

    // 5. Enforce Pacing and Send to Primary Email via Resend
    console.log(`  Sending family pass email with ${attachments.length} attachments to: ${primaryEmail}...`);
    await waitForRateLimitPacing(650);

    const emailPayload = {
      from: fromEmail,
      to: primaryEmail,
      subject,
      text: textBody,
      html: htmlBody,
      attachments,
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`❌ Resend API Error (${res.status}):`, JSON.stringify(resData));
      transmissionResults.push({
        householdId,
        recipient: primaryEmail,
        success: false,
        status: res.status,
        error: resData,
      });
      continue;
    }

    const messageId = resData.id;
    console.log(`  ✅ SUCCESS! Resend Message ID: ${messageId}`);

    // 6. Record into email_queue table so Admin Queue Tab reflects success
    try {
      await client.query(
        `INSERT INTO email_queue (
           recipient_email, recipient_name, subject, html_body, text_body,
           attachments, metadata, status, attempts, resend_id, sent_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', 1, $8, NOW())`,
        [
          primaryEmail,
          headMember?.full_name || h.head_name,
          subject,
          htmlBody,
          textBody,
          JSON.stringify(attachments.map((a) => ({ filename: a.filename }))),
          JSON.stringify({
            type: "approval_pass_family",
            householdId,
            primarySerial,
            memberCount: members.length,
            manualRetransmission: true,
          }),
          messageId,
        ]
      );
      console.log(`  ✓ Recorded in email_queue table.`);
    } catch (dbErr) {
      console.warn(`  ⚠️ Failed to record in email_queue:`, dbErr?.message);
    }

    transmissionResults.push({
      householdId,
      headName: headMember?.full_name || h.head_name,
      recipient: primaryEmail,
      serialNo: primarySerial,
      memberCount: members.length,
      success: true,
      messageId,
      timestamp: new Date().toISOString(),
    });

    // 7. Check if any member has an individual distinct email
    const distinctEmailMembers = memberPassList.filter(
      (item) =>
        item.member.email &&
        item.member.email.toLowerCase() !== primaryEmail.toLowerCase() &&
        item.member.email.includes("@")
    );

    for (const item of distinctEmailMembers) {
      const memberEmail = item.member.email.trim();
      const memberSerial = item.passData.serialNo || primarySerial;
      console.log(`  Sending individual pass to member ${item.member.full_name} (${memberEmail})...`);

      await waitForRateLimitPacing(650);

      const indSubject = `Your Official ID Card (${memberSerial}) - Maharaja Agrasen Foundation`;
      const indHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2a1810; padding: 24px; border: 1px solid #e7e5e4; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #b45309; padding-bottom: 16px;">
            <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin: 0 0 4px 0;">Official Member Identity Pass</p>
            <h1 style="color: #7c2d12; font-size: 20px; margin: 0; font-family: Georgia, serif;">Maharaja Agrasen Foundation Limited Singapore</h1>
            <p style="font-size: 13px; color: #92400e; margin: 4px 0 0 0;">अंतर्राष्ट्रीय अग्रवाल समाज</p>
          </div>
          <h2 style="color: #9a3412; margin-top: 0; font-size: 18px;">Welcome, ${item.member.full_name}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #44403c;">Your Maharaja Agrasen Foundation membership has been verified and approved.</p>
          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; text-transform: uppercase; font-weight: bold; color: #92400e; letter-spacing: 0.5px;">Assigned Serial Number</p>
            <p style="margin: 4px 0 0 0; font-size: 20px; font-family: monospace; font-weight: 800; color: #9a3412;">${memberSerial}</p>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #44403c;">Your official <strong>CR80 Identity Pass</strong> is attached to this email as a PDF.</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${passUrl}" style="background-color: #b45309; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 14px; display: inline-block;">
              View Pass on Dashboard &rarr;
            </a>
          </div>
        </div>
      `;

      const indPayload = {
        from: fromEmail,
        to: memberEmail,
        subject: indSubject,
        text: `Welcome, ${item.member.full_name}!\n\nYour membership is approved with serial ${memberSerial}.\nYour official ID card is attached.`,
        html: indHtml,
        attachments: [
          {
            filename: item.safeFilename,
            content: item.buffer.toString("base64"),
          },
        ],
      };

      const indRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(indPayload),
      });

      const indResData = await indRes.json().catch(() => ({}));
      if (indRes.ok && indResData.id) {
        console.log(`    ↳ Individual email sent to ${memberEmail}! Resend ID: ${indResData.id}`);
        try {
          await client.query(
            `INSERT INTO email_queue (
               recipient_email, recipient_name, subject, html_body, text_body,
               attachments, metadata, status, attempts, resend_id, sent_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', 1, $8, NOW())`,
            [
              memberEmail,
              item.member.full_name,
              indSubject,
              indHtml,
              indPayload.text,
              JSON.stringify([{ filename: item.safeFilename }]),
              JSON.stringify({
                type: "approval_pass_individual",
                householdId,
                memberId: item.member.id,
                serialNo: memberSerial,
              }),
              indResData.id,
            ]
          );
        } catch (_) {}
      } else {
        console.warn(`    ⚠️ Failed individual email to ${memberEmail}:`, indResData);
      }
    }
  }

  await client.end();

  console.log("\n================================================================================");
  console.log("🏁 Retransmission Execution Summary");
  console.log("================================================================================");
  console.table(transmissionResults);

  const allPassed = transmissionResults.every((r) => r.success);
  if (allPassed && transmissionResults.length === TARGET_HOUSEHOLD_IDS.length) {
    console.log("\n🎉 ALL 3 APPROVED HOUSEHOLDS SUCCESSFULLY RETRANSMITTED!");
    process.exit(0);
  } else {
    console.error("\n❌ Some households failed transmission.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled fatal exception:", err);
  process.exit(1);
});
