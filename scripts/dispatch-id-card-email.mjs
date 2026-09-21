/**
 * scripts/dispatch-id-card-email.mjs
 *
 * Directly executes the actual ID card generation and approval email dispatch
 * using the real PassPDF component and createUnifiedPassData normalizer.
 *
 * Usage:
 *   node --env-file=.env.production.local scripts/dispatch-id-card-email.mjs
 */

import pg from "pg";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "./compiled/components/PassPDF.js";
import { createUnifiedPassData } from "./compiled/lib/pass.js";

const { Client } = pg;

async function main() {
  const targetEmail = "aayushmittal620@gmail.com";
  const serialNo = "MAFL-000-000-150";

  console.log(`\n======================================================`);
  console.log(`🚀 Triggering Official ID Card & Email Pipeline`);
  console.log(`Target Member: Ujjwal Garg (${serialNo})`);
  console.log(`Destination:   ${targetEmail}`);
  console.log(`======================================================\n`);

  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY is not defined in environment.");
    process.exit(1);
  }

  const connStr = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace("?pgbouncer=true", "")
    : "postgresql://localhost:5432/agrawal_dev";

  console.log("1. Fetching member & household from PostgreSQL database...");
  const client = new Client({ connectionString: connStr });
  await client.connect();

  const memberRes = await client.query(`
    SELECT
      m.id, m.full_name, m.email, m.phone, m.serial_no, m.father_name,
      m.dob, m.current_city, m.state, m.postal_code, m.full_address,
      m.profession_freetext, m.profession_title,
      m.aadhaar_number, m.pan_number, m.photo_url, m.relation_to_head,
      m.marital_status, m.gender, m.household_id,
      h.head_name, h.gotra, h.native_place, h.city AS household_city,
      h.household_code, h.serial_no AS household_serial_no
    FROM members m
    LEFT JOIN households h ON h.id = m.household_id
    WHERE m.serial_no = $1
    LIMIT 1
  `, [serialNo]);

  await client.end();

  if (memberRes.rows.length === 0) {
    console.error(`❌ Member with serial_no ${serialNo} not found in database.`);
    process.exit(1);
  }

  const row = memberRes.rows[0];
  console.log(`✓ Retrieved Member: ${row.full_name} (${row.serial_no})`);
  console.log(`  Gotra: ${row.gotra}`);
  console.log(`  City: ${row.current_city}`);
  console.log(`  Ancestral Origin: ${row.native_place}`);
  console.log(`  Father: ${row.father_name}`);

  const member = {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    serialNo: row.serial_no,
    fatherName: row.father_name,
    currentCity: row.current_city,
    nativePlace: row.native_place,
    gotra: row.gotra,
    relationToHead: row.relation_to_head || "self",
    maritalStatus: row.marital_status || "Single",
    gender: row.gender || "Male",
    photoUrl: row.photo_url,
    householdCode: row.household_code,
  };

  const household = {
    id: row.household_id,
    headName: row.head_name,
    gotra: row.gotra,
    nativePlace: row.native_place,
    city: row.household_city,
    householdCode: row.household_code,
    serialNo: row.household_serial_no,
  };

  console.log("\n2. Normalizing pass data via createUnifiedPassData()...");
  const passData = createUnifiedPassData({ member, household });
  console.log("   Normalized Pass Data:", JSON.stringify(passData, null, 2));

  console.log("\n3. Rendering real binary CR80 ID Card PDF via @react-pdf/renderer...");
  console.log("   Card layout includes: 'अंतर्राष्ट्रीय अग्रवाल समाज' & 'VALID FOR LIFETIME'");
  const buffer = await renderToBuffer(React.createElement(PassPDF, { passData }));
  console.log(`✓ PDF Generated successfully! Binary size: ${buffer.length} bytes (Starts with: ${buffer.subarray(0, 5).toString()})`);

  console.log("\n4. Dispatching actual approval email via Resend API...");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.maharajaagrasenfoundation.com";
  const passUrl = `${appUrl}/dashboard/pass`;

  const emailPayload = {
    from: process.env.RESEND_FROM_EMAIL || "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>",
    to: targetEmail,
    subject: `Your Official ID Card (${passData.serialNo}) - Maharaja Agrasen Foundation`,
    text: `Congratulations, ${member.fullName}!\n\nYour Maharaja Agrasen Foundation membership has been verified and approved.\nAssigned Serial Number: ${passData.serialNo}\n\nYour official CR80 Identity Pass with अंतर्राष्ट्रीय अग्रवाल समाज credentials is attached to this email as a PDF.\n\nYou can also view and download your pass online at: ${passUrl}\n\nMaharaja Agrasen Foundation Limited Singapore • One Community • One Platform`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2a1810; padding: 24px; border: 1px solid #e7e5e4; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #b45309; padding-bottom: 16px;">
          <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin: 0 0 4px 0;">Official Member Identity Pass</p>
          <h1 style="color: #7c2d12; font-size: 20px; margin: 0; font-family: Georgia, serif;">Maharaja Agrasen Foundation Limited Singapore</h1>
          <p style="font-size: 13px; color: #92400e; margin: 4px 0 0 0;">अंतर्राष्ट्रीय अग्रवाल समाज</p>
        </div>

        <h2 style="color: #9a3412; margin-top: 0; font-size: 18px;">Congratulations, ${member.fullName}!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #44403c;">Your Maharaja Agrasen Foundation membership has been verified and approved.</p>

        <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; font-weight: bold; color: #92400e; letter-spacing: 0.5px;">Official Serial Number (SNO)</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-family: monospace; font-weight: 800; color: #9a3412;">${passData.serialNo}</p>
        </div>

        <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.6;">
          <p style="margin: 0 0 8px 0;"><strong>Member Details on Card:</strong></p>
          <ul style="margin: 0; padding-left: 20px; color: #57534e;">
            <li><strong>Gotra:</strong> ${passData.gotra}</li>
            <li><strong>Current Location:</strong> ${passData.currentCity}</li>
            <li><strong>Ancestral Origin:</strong> ${passData.nativePlace}</li>
            <li><strong>Father:</strong> ${passData.fatherName || "N/A"}</li>
            <li><strong>Role:</strong> ${passData.roleLabel}</li>
          </ul>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
          📎 Your official <strong>CR80 Printable Identity Pass (ID Card)</strong> with <strong>अंतर्राष्ट्रीय अग्रवाल समाज</strong> credentials has been rendered and attached to this email as a PDF.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${passUrl}" style="background-color: #b45309; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 14px; display: inline-block;">
            View Pass on Dashboard &rarr;
          </a>
        </div>

        <div style="border-top: 1px solid #e7e5e4; padding-top: 16px; margin-top: 24px; text-align: center;">
          <p style="font-size: 12px; color: #78716c; margin: 0;">
            Maharaja Agrasen Foundation Limited Singapore • अंतर्राष्ट्रीय अग्रवाल समाज फाउंडेशन<br />
            एक समाज • एक मंच • एक परिवार
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `ID_Card_${passData.fullName.replace(/\s+/g, "_")}.pdf`,
        content: buffer.toString("base64"),
      },
    ],
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
    console.error("❌ Resend API Error:", res.status, resData);
    process.exit(1);
  }

  console.log("\n======================================================");
  console.log("🎉 SUCCESS! Email dispatched via Resend API");
  console.log("   Message ID:", resData.id);
  console.log("   Recipient: ", targetEmail);
  console.log("   Subject:   ", emailPayload.subject);
  console.log("   Attachment:", `ID_Card_${passData.fullName.replace(/\s+/g, "_")}.pdf (${buffer.length} bytes)`);
  console.log("======================================================\n");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
