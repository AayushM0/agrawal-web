'use server';

import { db } from "../lib/db";
import { getSession } from "./auth";
import { Household } from "@/types/household";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";
import { getBaseUrl, createUnifiedPassData } from "@/lib/pass";
import React from "react";

async function sendSMS(phone: string, text: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID?.replace(/['"]/g, "").trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.replace(/['"]/g, "").trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.replace(/['"]/g, "").trim();

  if (!sid || !token || !from) {
    console.warn("[TWILIO SMS SKIP] Missing or incomplete Twilio configuration in environment variables:", {
      hasSid: !!sid,
      hasToken: !!token,
      hasFrom: !!from,
    });
    return;
  }

  if (!phone) {
    console.warn("[TWILIO SMS SKIP] Recipient phone number is empty.");
    return;
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      Body: text,
      From: from,
      To: phone,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[TWILIO SMS ERROR]", err);
    }
  } catch (e) {
    console.error("SMS failed:", e);
  }
}

async function sendWelcomeEmail(member: any, household: any) {
  if (!process.env.RESEND_API_KEY || !member.email) return;

  try {
    const passData = {
      fullName: member.fullName,
      gotra: household.gotra,
      householdCode: household.householdCode,
      serialNo: household.serialNo || household.householdCode,
      currentCity: member.currentCity,
      roleLabel: member.relationToHead,
      photoUrl: member.photoUrl,
      nativePlace: household.nativePlace,
      fatherName: member.fatherName,
    };

    const buffer = await renderToBuffer(React.createElement(PassPDF, { passData }) as any);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Maharaja Agrasen Foundation <onboarding@resend.dev>",
        to: member.email,
        subject: `Your Official ID (${passData.serialNo}) - Maharaja Agrasen Foundation`,
        html: `<p>Welcome! Your membership is approved. Your assigned Serial Number is <strong>${passData.serialNo}</strong>. Your official ID card is attached to this email.</p>`,
        attachments: [
          {
            filename: `ID_Card_${passData.fullName.replace(/\s+/g, "_")}.pdf`,
            content: buffer.toString("base64"),
          }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[RESEND EMAIL ERROR]", err);
    }
  } catch (e) {
    console.error("Email failed:", e);
  }
}

async function notifyHouseholdMembers(householdId: string, household: any) {
  const members = await db.getMembersByHousehold(householdId);
  const serial = household.serialNo || household.householdCode;
  const passUrl = `${getBaseUrl()}/dashboard/pass`;

  // 1. Generate ID Pass PDF buffer for every family member in parallel to prevent Vercel 10s Serverless timeout
  const attachmentPromises = members.map(async (member) => {
    const passData = createUnifiedPassData({ member, household });
    try {
      const buffer = await renderToBuffer(React.createElement(PassPDF, { passData }) as any);
      return {
        filename: `ID_Card_${member.fullName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
        content: buffer.toString("base64"),
        member,
      };
    } catch (err) {
      console.error("PDF generation failed for member:", member.fullName, err);
      return null;
    }
  });

  const attachmentsResult = await Promise.all(attachmentPromises);
  const allAttachments = attachmentsResult.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  // 2. Identify primary email destination (Head email or verified household email)
  const headMember = members.find((m) => m.relationToHead === "self");
  const primaryEmail =
    headMember?.email ||
    (household.verifiedContact && household.verifiedContact.includes("@")
      ? household.verifiedContact
      : null);

  const notificationsToAwait: Promise<any>[] = [];

  // 3. Send Primary Welcome Email with ALL Family Member ID Pass attachments
  if (process.env.RESEND_API_KEY && primaryEmail && allAttachments.length > 0) {
    const memberSummaryList = members
      .map(
        (m, idx) =>
          `<li><strong>#${idx + 1}: ${m.fullName}</strong> (${m.relationToHead === "self" ? "Head of Household" : m.relationToHead})</li>`
      )
      .join("");

    notificationsToAwait.push(
      (async () => {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Maharaja Agrasen Foundation <onboarding@resend.dev>",
              to: primaryEmail,
              subject: `Household Verified - Official ID Passes for All Members (${serial}) - Maharaja Agrasen Foundation`,
              html: `
                <h2>Congratulations! Your Household is Approved</h2>
                <p>Your Maharaja Agrasen Foundation household registration has been verified and approved.</p>
                <p><strong>Assigned Serial Number:</strong> ${serial}</p>
                <p>Official ID cards for all <strong>${members.length} registered member(s)</strong> are attached to this email:</p>
                <ul>${memberSummaryList}</ul>
                <p>You can also log in to your household dashboard at any time to view and download live passes for all members: <a href="${passUrl}">${passUrl}</a></p>
              `,
              attachments: allAttachments.map((a) => ({
                filename: a.filename,
                content: a.content,
              })),
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error("[RESEND EMAIL ERROR]", err);
          }
        } catch (e) {
          console.error("Primary household email dispatch failed:", e);
        }
      })()
    );
  }

  // 4. Send individual welcome email if a member has a distinct separate email (in parallel)
  if (process.env.RESEND_API_KEY) {
    const emailPromises = allAttachments
      .filter(
        (item) =>
          item.member.email &&
          primaryEmail &&
          item.member.email.toLowerCase() !== primaryEmail.toLowerCase()
      )
      .map(async (item) => {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Maharaja Agrasen Foundation <onboarding@resend.dev>",
              to: item.member.email,
              subject: `Your Official ID Card (${serial}) - Maharaja Agrasen Foundation`,
              html: `
                <h2>Welcome, ${item.member.fullName}!</h2>
                <p>Your membership under household <strong>${serial}</strong> is approved.</p>
                <p>Your official ID card is attached to this email. You can also view it online at: <a href="${passUrl}">${passUrl}</a></p>
              `,
              attachments: [{ filename: item.filename, content: item.content }],
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error(`[RESEND INDIVIDUAL EMAIL ERROR] for ${item.member.fullName}:`, err);
          }
        } catch (e) {
          console.error(`Individual member email dispatch failed for ${item.member.fullName}:`, e);
        }
      });
    
    notificationsToAwait.push(...emailPromises);
  }

  // 5. Send SMS to household and member contacts in parallel
  const primaryPhone =
    headMember?.phone ||
    (household.verifiedContact && !household.verifiedContact.includes("@")
      ? household.verifiedContact
      : null);

  if (primaryPhone) {
    notificationsToAwait.push(
      sendSMS(
        primaryPhone,
        `Your Maharaja Agrasen Foundation household membership is approved! Serial No: ${serial}. ID passes for all ${members.length} member(s) are ready at: ${passUrl}`
      )
    );
  }

  for (const member of members) {
    if (member.phone && member.phone !== primaryPhone) {
      notificationsToAwait.push(
        sendSMS(
          member.phone,
          `Welcome ${member.fullName}! Your Maharaja Agrasen Foundation ID pass (${serial}) is approved. Access here: ${passUrl}`
        )
      );
    }
  }

  // Wait for all email and SMS dispatches to complete concurrently
  if (notificationsToAwait.length > 0) {
    await Promise.all(notificationsToAwait);
  }
}

export async function getModerationHouseholds(): Promise<Household[]> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return [];
  }
  return await db.getHouseholds();
}

export async function approveHousehold(householdId: string) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  const updated = await db.updateHouseholdStatus(householdId, "live");
  if (!updated) return { success: false, error: "Household not found." };
  
  await notifyHouseholdMembers(householdId, updated);
  return { success: true, message: `Household ${updated.householdCode} is now LIVE in the directory.` };
}

export async function approveAllHouseholds() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  
  const pending = (await db.getHouseholds()).filter((h: any) => h.status === "pending_review");
  const count = await db.approveAllPendingHouseholds();
  
  for (const h of pending) {
    const updated = await db.getHouseholdById(h.id);
    await notifyHouseholdMembers(h.id, updated || h);
  }
  
  return {
    success: true,
    count,
    message: `Successfully approved all ${count} pending households.`,
  };
}

export async function rejectHousehold(householdId: string, rejectionReason: string) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  if (!rejectionReason || !rejectionReason.trim()) {
    return { success: false, error: "A valid rejection reason is required for dispute retention." };
  }
  const updated = await db.updateHouseholdStatus(householdId, "rejected", rejectionReason.trim());
  if (!updated) return { success: false, error: "Household not found." };
  return {
    success: true,
    message: `Household ${updated.householdCode} has been rejected and retained for records.`,
  };
}

export async function getMessageReports() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required.", reports: [] };
  }
  try {
    const reports = await db.getMessageReports();
    return { success: true, reports };
  } catch (err: any) {
    return { success: false, error: err.message, reports: [] };
  }
}

export async function resolveMessageReport(params: {
  reportId: string;
  action: "dismiss" | "warn" | "suspend_chat";
  notes?: string;
}) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  try {
    await db.resolveMessageReport(params.reportId, params.action, params.notes);
    return { success: true, message: `Report ${params.action} completed successfully.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resolve report." };
  }
}

