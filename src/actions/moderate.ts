'use server';

import { db } from "../lib/db";
import { getSession } from "./auth";
import { Household } from "@/types/household";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";
import { getBaseUrl, createUnifiedPassData } from "@/lib/pass";
import { sendTwilioSms } from "@/lib/telecom/twilio";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/turnstile";
import React from "react";

const sendSMS = sendTwilioSms;

async function getAdminIp(): Promise<string> {
  try {
    const h = await headers();
    return getClientIp(h);
  } catch {
    return "127.0.0.1";
  }
}

export async function sendWelcomeEmail(member: any, household: any, overrideEmail?: string): Promise<{ success: boolean; error?: any }> {
  const recipient = overrideEmail || member.email;
  if (!process.env.RESEND_API_KEY || !recipient) {
    console.warn("[RESEND EMAIL WARNING] RESEND_API_KEY or recipient email missing");
    return { success: false, error: "Missing RESEND_API_KEY or recipient email" };
  }

  try {
    const passData = createUnifiedPassData({ member, household });
    const buffer = await renderToBuffer(React.createElement(PassPDF, { passData }) as any);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>",
        to: recipient,
        subject: `Your Official ID (${passData.serialNo}) - Maharaja Agrasen Foundation`,
        text: `Welcome! Your membership is approved. Your assigned Serial Number is ${passData.serialNo}. Your official ID card is attached to this email.`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #e7e5e4; border-radius: 12px;">
            <h2 style="color: #9a3412; margin-top: 0;">Congratulations, ${member.fullName}!</h2>
            <p>Your Maharaja Agrasen Foundation membership has been verified and approved.</p>
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Assigned Serial Number:</strong> <code style="font-size: 16px; font-weight: bold; color: #9a3412;">${passData.serialNo}</code></p>
            </div>
            <p>Your official <strong>CR80 Printable Identity Pass (ID Card)</strong> with <em>अंतर्राष्ट्रीय अग्रवाल समाज</em> credentials has been generated and attached to this email as a PDF.</p>
            <p style="font-size: 12px; color: #78716c; margin-top: 24px; border-top: 1px solid #e7e5e4; padding-top: 12px;">
              Maharaja Agrasen Foundation Limited Singapore • One Community • One Platform
            </p>
          </div>
        `,
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
      return { success: false, error: err };
    }
    return { success: true };
  } catch (e: any) {
    console.error("Email failed:", e);
    return { success: false, error: e?.message || e };
  }
}

async function notifyHouseholdMembers(householdId: string, household: any) {
  const members = await db.getMembersByHousehold(householdId);
  const headMember = members.find((m) => m.relationToHead === "self") || members[0];
  const primarySerial = headMember?.serialNo || household.serialNo || household.householdCode;
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
        passData,
      };
    } catch (err) {
      console.error(`Failed to generate PDF pass for member ${member.fullName}:`, err);
      return null;
    }
  });

  const attachmentsResult = await Promise.all(attachmentPromises);
  const allAttachments = attachmentsResult.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  // 2. Identify primary email destination (Head email or verified household email)
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
          `<li><strong>#${idx + 1}: ${m.fullName}</strong> (${m.relationToHead === "self" ? "Head of Household" : m.relationToHead})${m.serialNo ? ` — Serial No: <code>${m.serialNo}</code>` : ""}</li>`
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
              from: process.env.RESEND_FROM_EMAIL || "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>",
              to: primaryEmail,
              subject: `Household Verified - Official ID Passes for All Members (${primarySerial}) - Maharaja Agrasen Foundation`,
              html: `
                <h2>Congratulations! Your Household is Approved</h2>
                <p>Your Maharaja Agrasen Foundation household registration has been verified and approved.</p>
                <p><strong>Assigned Serial Number:</strong> ${primarySerial}</p>
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
          const memberSerial = item.passData?.serialNo || item.member.serialNo || primarySerial;
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>",
              to: item.member.email,
              subject: `Your Official ID Card (${memberSerial}) - Maharaja Agrasen Foundation`,
              html: `
                <h2>Welcome, ${item.member.fullName}!</h2>
                <p>Your membership is approved. Your assigned Serial Number is <strong>${memberSerial}</strong>.</p>
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
        `Your Maharaja Agrasen Foundation household membership is approved! Serial No: ${primarySerial}. ID passes for all ${members.length} member(s) are ready at: ${passUrl}`
      )
    );
  }

  for (const member of members) {
    if (member.phone && member.phone !== primaryPhone) {
      const memberSerial = member.serialNo || primarySerial;
      notificationsToAwait.push(
        sendSMS(
          member.phone,
          `Welcome ${member.fullName}! Your Maharaja Agrasen Foundation ID pass (${memberSerial}) is approved. Access here: ${passUrl}`
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
  
  const ipAddress = await getAdminIp();
  await db.recordAdminAuditLog({
    adminId: session.userId || "admin",
    adminContact: session.contact || "admin",
    action: "APPROVE_HOUSEHOLD",
    targetType: "household",
    targetId: householdId,
    details: { householdCode: updated.householdCode },
    ipAddress,
  });

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
  
  const ipAddress = await getAdminIp();
  await db.recordAdminAuditLog({
    adminId: session.userId || "admin",
    adminContact: session.contact || "admin",
    action: "APPROVE_ALL_HOUSEHOLDS",
    targetType: "batch",
    targetId: "all",
    details: { count },
    ipAddress,
  });

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

  const ipAddress = await getAdminIp();
  await db.recordAdminAuditLog({
    adminId: session.userId || "admin",
    adminContact: session.contact || "admin",
    action: "REJECT_HOUSEHOLD",
    targetType: "household",
    targetId: householdId,
    details: { householdCode: updated.householdCode, reason: rejectionReason.trim() },
    ipAddress,
  });

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
    const ipAddress = await getAdminIp();
    await db.recordAdminAuditLog({
      adminId: session.userId || "admin",
      adminContact: session.contact || "admin",
      action: `RESOLVE_REPORT_${params.action.toUpperCase()}`,
      targetType: "message_report",
      targetId: params.reportId,
      details: { action: params.action, notes: params.notes },
      ipAddress,
    });
    return { success: true, message: `Report ${params.action} completed successfully.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resolve report." };
  }
}

export async function getAdminSupportInquiries() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required.", inquiries: [] };
  }
  try {
    const inquiries = await db.getSupportInquiries();
    return { success: true, inquiries };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch inquiries.", inquiries: [] };
  }
}

const VALID_INQUIRY_STATUSES = new Set(["open", "in_progress", "resolved"]);

export async function updateAdminInquiryStatus(params: {
  ticketId: string;
  status: "open" | "in_progress" | "resolved";
  notes?: string;
}) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  if (!VALID_INQUIRY_STATUSES.has(params.status)) {
    return { success: false, error: "Invalid status: must be open, in_progress, or resolved." };
  }
  try {
    const ok = await db.updateSupportInquiryStatus(params.ticketId, params.status, params.notes);
    if (!ok) {
      return { success: false, error: "Inquiry not found." };
    }
    const ipAddress = await getAdminIp();
    await db.recordAdminAuditLog({
      adminId: session.userId || "admin",
      adminContact: session.contact || "admin",
      action: `UPDATE_INQUIRY_STATUS`,
      targetType: "support_inquiry",
      targetId: params.ticketId,
      details: { status: params.status, notes: params.notes },
      ipAddress,
    });
    return { success: true, message: `Inquiry status updated to ${params.status}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update inquiry status." };
  }
}


