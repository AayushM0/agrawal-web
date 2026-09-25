'use server';

import { db } from "../lib/db";
import { getSession } from "./auth";
import { Household } from "@/types/household";
import type { BusinessProfile } from "@/types/business";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";
import { getBaseUrl, createUnifiedPassData } from "@/lib/pass";
import { sendTwilioSms } from "@/lib/telecom/twilio";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/turnstile";
import { enqueueEmail, drainEmailQueue } from "@/lib/email-queue";
import { dispatchResendEmail, escHtml } from "@/lib/email";
import React from "react";


async function getAdminIp(): Promise<string> {
  try {
    const h = await headers();
    return getClientIp(h);
  } catch {
    return "127.0.0.1";
  }
}

export async function sendWelcomeEmail(
  member: any,
  household: any,
  overrideEmail?: string
): Promise<{ success: boolean; error?: any; warning?: string }> {
  const recipient = overrideEmail || member.email;
  if (!process.env.RESEND_API_KEY || !recipient) {
    console.warn("[RESEND EMAIL WARNING] RESEND_API_KEY or recipient email missing");
    return { success: false, error: "Missing RESEND_API_KEY or recipient email" };
  }

  try {
    const passData = createUnifiedPassData({ member, household });
    const passUrl = `${getBaseUrl()}/dashboard/pass`;
    let buffer: Buffer | null = null;
    let pdfError: string | null = null;

    try {
      buffer = await renderToBuffer(React.createElement(PassPDF, { passData }) as any);
    } catch (err: any) {
      console.warn(`[PASS PDF WARNING] Failed to render PDF for welcome email (${member.fullName}):`, err);
      pdfError = err?.message || String(err);
    }

    const attachments = buffer
      ? [
          {
            filename: `ID_Card_${passData.fullName.replace(/\s+/g, "_")}.pdf`,
            content: buffer.toString("base64"),
          },
        ]
      : [];

    const result = await dispatchResendEmail({
      to: recipient,
      subject: `Your Official ID (${passData.serialNo}) - Maharaja Agrasen Foundation`,
      text: buffer
        ? `Welcome! Your membership is approved. Your assigned Serial Number is ${passData.serialNo}. Your official ID card is attached to this email.`
        : `Welcome! Your membership is approved. Your assigned Serial Number is ${passData.serialNo}. Your official ID card is accessible online at ${passUrl}.`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #e7e5e4; border-radius: 12px;">
          <h2 style="color: #9a3412; margin-top: 0;">Congratulations, ${escHtml(member.fullName)}!</h2>
          <p>Your Maharaja Agrasen Foundation membership has been verified and approved.</p>
          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Assigned Serial Number:</strong> <code style="font-size: 16px; font-weight: bold; color: #9a3412;">${escHtml(passData.serialNo)}</code></p>
          </div>
          ${
            buffer
              ? `<p>Your official <strong>CR80 Printable Identity Pass (ID Card)</strong> with <em>अंतर्राष्ट्रीय अग्रवाल समाज</em> credentials has been generated and attached to this email as a PDF.</p>`
              : `<p>Your official <strong>CR80 Printable Identity Pass (ID Card)</strong> with <em>अंतर्राष्ट्रीय अग्रवाल समाज</em> credentials is ready. You can view and download your pass directly on your dashboard: <a href="${passUrl}">${passUrl}</a></p>`
          }
          <p style="font-size: 12px; color: #78716c; margin-top: 24px; border-top: 1px solid #e7e5e4; padding-top: 12px;">
            Maharaja Agrasen Foundation Limited Singapore • One Community • One Platform
          </p>
        </div>
      `,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (!result.success) {
      console.error("[RESEND EMAIL ERROR]", result.error);
      return { success: false, error: result.error };
    }
    return { success: true, ...(pdfError ? { warning: pdfError } : {}) };
  } catch (e: any) {
    console.error("Email failed:", e);
    return { success: false, error: e?.message || e };
  }
}

export async function notifyHouseholdMembers(
  householdId: string,
  household: any
): Promise<{
  success: boolean;
  enqueuedCount: number;
  attachmentsCount: number;
  memberCount: number;
  errors: { memberName: string; error: string }[];
}> {
  const members = await db.getMembersByHousehold(householdId);
  const headMember = members.find((m) => m.relationToHead === "self") || members[0];
  const primarySerial = headMember?.serialNo || household.serialNo || household.householdCode;
  const passUrl = `${getBaseUrl()}/dashboard/pass`;

  const generationErrors: { memberName: string; error: string }[] = [];

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
    } catch (err: any) {
      console.error(`Failed to generate PDF pass for member ${member.fullName}:`, err);
      generationErrors.push({
        memberName: member.fullName,
        error: err?.message || String(err),
      });
      return null;
    }
  });

  const attachmentsResult = await Promise.all(attachmentPromises);
  const allAttachments = attachmentsResult.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  // If any generation errors occurred, record a structured audit log
  if (generationErrors.length > 0) {
    const session = await getSession();
    const ipAddress = await getAdminIp();
    await db.recordAdminAuditLog({
      adminId: session?.userId || "system",
      adminContact: session?.contact || "system",
      action: "PASS_GENERATION_WARNING",
      targetType: "household",
      targetId: householdId,
      details: {
        householdCode: household.householdCode,
        errors: generationErrors,
      },
      ipAddress,
    });
  }

  // 2. Identify primary email destination (Head email or verified household email)
  const primaryEmail =
    headMember?.email ||
    (household.verifiedContact?.includes("@") ? household.verifiedContact : null);

  let enqueuedCount = 0;

  // 3. Enqueue Primary Welcome Email (ALWAYS enqueued if primaryEmail exists, even if allAttachments.length === 0)
  if (primaryEmail) {
    const memberSummaryList = members
      .map(
        (m, idx) =>
          `<li><strong>#${idx + 1}: ${escHtml(m.fullName)}</strong> (${escHtml(m.relationToHead === "self" ? "Head of Household" : m.relationToHead)})${m.serialNo ? ` — Serial No: <code>${escHtml(m.serialNo)}</code>` : ""}</li>`
      )
      .join("");

    const hasAttachments = allAttachments.length > 0;

    const passInfoSection = hasAttachments
      ? `<p>Official ID cards for all <strong>${allAttachments.length} registered member(s)</strong> are attached to this email:</p>
         <ul>${memberSummaryList}</ul>`
      : `<p>Registered member(s) (${members.length}):</p>
         <ul>${memberSummaryList}</ul>
         <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
           <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Identity Passes Ready:</strong> Your official passes have been approved and can be viewed and downloaded directly on your household dashboard:</p>
           <p style="margin: 8px 0 0 0;"><a href="${passUrl}" style="color: #9a3412; font-weight: bold;">${passUrl}</a></p>
         </div>`;

    await enqueueEmail({
      recipientEmail: primaryEmail,
      recipientName: headMember?.fullName || household.headName,
      subject: `Household Verified - Official ID Passes for All Members (${primarySerial}) - Maharaja Agrasen Foundation`,
      htmlBody: `
        <h2>Congratulations! Your Household is Approved</h2>
        <p>Your Maharaja Agrasen Foundation household registration has been verified and approved.</p>
        <p><strong>Assigned Serial Number:</strong> ${escHtml(primarySerial)}</p>
        ${passInfoSection}
        <p>You can also log in to your household dashboard at any time to view and download live passes for all members: <a href="${passUrl}">${passUrl}</a></p>
      `,
      attachments: hasAttachments
        ? allAttachments.map((a) => ({
            filename: a.filename,
            content: a.content,
          }))
        : undefined,
      metadata: {
        type: "approval_pass_family",
        householdId,
        primarySerial,
        memberCount: members.length,
        attachmentsCount: allAttachments.length,
      },
    });
    enqueuedCount++;
  }

  // 4. Enqueue individual welcome email if a member has a distinct separate email
  const distinctEmailMembers = members.filter(
    (member) =>
      member.email &&
      primaryEmail &&
      member.email.toLowerCase() !== primaryEmail.toLowerCase()
  );

  for (const member of distinctEmailMembers) {
    const memberAttachment = allAttachments.find((a) => a.member.id === member.id);
    const memberSerial = memberAttachment?.passData?.serialNo || member.serialNo || primarySerial;

    const emailBody = memberAttachment
      ? `
        <h2>Welcome, ${escHtml(member.fullName)}!</h2>
        <p>Your membership is approved. Your assigned Serial Number is <strong>${escHtml(memberSerial)}</strong>.</p>
        <p>Your official ID card is attached to this email. You can also view it online at: <a href="${passUrl}">${passUrl}</a></p>
      `
      : `
        <h2>Welcome, ${escHtml(member.fullName)}!</h2>
        <p>Your membership is approved. Your assigned Serial Number is <strong>${escHtml(memberSerial)}</strong>.</p>
        <p>Your official ID card can be viewed and downloaded directly on your household dashboard: <a href="${passUrl}">${passUrl}</a></p>
      `;

    await enqueueEmail({
      recipientEmail: member.email,
      recipientName: member.fullName,
      subject: `Your Official ID Card (${memberSerial}) - Maharaja Agrasen Foundation`,
      htmlBody: emailBody,
      attachments: memberAttachment
        ? [{ filename: memberAttachment.filename, content: memberAttachment.content }]
        : undefined,
      metadata: {
        type: "approval_pass_member",
        householdId,
        memberId: member.id,
        memberSerial,
      },
    });
    enqueuedCount++;
  }

  // 5. Send SMS to household and member contacts in parallel
  const primaryPhone =
    headMember?.phone ||
    (!household.verifiedContact?.includes("@") ? household.verifiedContact : null);

  const notificationsToAwait: Promise<any>[] = [];

  if (primaryPhone) {
    notificationsToAwait.push(
      sendTwilioSms(
        primaryPhone,
        `Your Maharaja Agrasen Foundation household membership is approved! Serial No: ${primarySerial}. ID passes for all ${members.length} member(s) are ready at: ${passUrl}`
      )
    );
  }

  for (const member of members) {
    if (member.phone && member.phone !== primaryPhone) {
      const memberSerial = member.serialNo || primarySerial;
      notificationsToAwait.push(
        sendTwilioSms(
          member.phone,
          `Welcome ${member.fullName}! Your Maharaja Agrasen Foundation ID pass (${memberSerial}) is approved. Access here: ${passUrl}`
        )
      );
    }
  }

  // Wait for all SMS dispatches to complete concurrently
  if (notificationsToAwait.length > 0) {
    await Promise.all(notificationsToAwait);
  }

  // Paced drain of enqueued passes: for a single household approval, drain up to 6 items immediately within 6 seconds
  await drainEmailQueue({ maxItems: 6, timeoutMs: 6000 });

  return {
    success: true,
    enqueuedCount,
    attachmentsCount: allAttachments.length,
    memberCount: members.length,
    errors: generationErrors,
  };
}

export async function getModerationHouseholds(): Promise<Household[]> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return [];
  }
  const households = await db.getHouseholds();
  try {
    const warnings = await db.getRecentHouseholdWarnings();
    return households.map((h) => ({
      ...h,
      lastError: warnings[h.id] || h.lastError,
    }));
  } catch {
    return households;
  }
}

export async function getAdminAuditLogsAction(limit = 30) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required.", logs: [] };
  }
  try {
    const logs = await db.getAdminAuditLogs(limit);
    return { success: true, logs };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load audit logs", logs: [] };
  }
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

  const stats = await db.getEmailQueueStats();

  return {
    success: true,
    count,
    pendingEmails: stats.pending,
    message: `Successfully approved all ${count} pending households. ${stats.pending > 0 ? `${stats.pending} pass emails enqueued in background.` : "Passes dispatched."}`,
  };
}

export type ResendHouseholdPassResult = {
  success: boolean;
  message?: string;
  error?: string;
  enqueuedCount?: number;
  attachmentsCount?: number;
  memberCount?: number;
  errors?: { memberName: string; error: string }[];
};

export async function resendHouseholdPassAction(householdId: string): Promise<ResendHouseholdPassResult> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }

  const household = await db.getHouseholdById(householdId);
  if (!household) {
    return { success: false, error: "Household not found." };
  }

  const notifyResult = await notifyHouseholdMembers(householdId, household);

  const ipAddress = await getAdminIp();
  await db.recordAdminAuditLog({
    adminId: session.userId || "admin",
    adminContact: session.contact || "admin",
    action: "RESEND_HOUSEHOLD_PASSES",
    targetType: "household",
    targetId: householdId,
    details: {
      householdCode: household.householdCode,
      enqueuedCount: notifyResult.enqueuedCount,
      attachmentsCount: notifyResult.attachmentsCount,
      errors: notifyResult.errors,
    },
    ipAddress,
  });

  if (notifyResult.enqueuedCount > 0) {
    return {
      ...notifyResult,
      success: true as const,
      message: `Enqueued ${notifyResult.enqueuedCount} pass email(s) for delivery.${
        notifyResult.errors.length > 0
          ? ` (Note: ${notifyResult.errors.length} pass PDF(s) failed generation and fallback links were dispatched).`
          : ""
      }`,
    };
  }

  return {
    ...notifyResult,
    success: false as const,
    error: `No email could be enqueued for household ${household.householdCode}. (Checked: ${household.verifiedContact || "no contact"}).`,
  };
}

export async function getEmailQueueStatusAction() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  try {
    const [stats, recentLogs] = await Promise.all([
      db.getEmailQueueStats(),
      db.getRecentEmailQueueLogs(30),
    ]);
    return { success: true, stats, recentLogs };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch email queue status" };
  }
}

export async function retryFailedEmailsAction() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  try {
    const count = await db.retryFailedEmailQueueItems();
    const drainResult = await drainEmailQueue({ maxItems: 10, timeoutMs: 6000 });

    const ipAddress = await getAdminIp();
    await db.recordAdminAuditLog({
      adminId: session.userId || "admin",
      adminContact: session.contact || "admin",
      action: "RETRY_FAILED_EMAILS",
      targetType: "email_queue",
      targetId: "failed_batch",
      details: { resetCount: count, drained: drainResult.processed },
      ipAddress,
    });

    return {
      success: true,
      resetCount: count,
      drainedCount: drainResult.processed,
      message: `Reset ${count} failed email(s) back to queue. Processed ${drainResult.succeeded} immediately.`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to retry emails" };
  }
}

export async function drainEmailQueueAction(maxItems = 8): Promise<{
  success: boolean;
  processed?: number;
  succeeded?: number;
  failed?: number;
  remainingPending?: number;
  errors?: string[];
  error?: string;
}> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  try {
    const result = await drainEmailQueue({ maxItems, timeoutMs: 6000 });
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to drain email queue" };
  }
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
    console.error("getMessageReports error:", err);
    return { success: false, error: "Failed to load message reports. Please try again.", reports: [] };
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
    console.error("resolveMessageReport error:", err);
    return { success: false, error: "Failed to resolve report. Please try again." };
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
    console.error("getAdminSupportInquiries error:", err);
    return { success: false, error: "Failed to fetch inquiries. Please try again.", inquiries: [] };
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
    console.error("updateAdminInquiryStatus error:", err);
    return { success: false, error: "Failed to update inquiry status. Please try again." };
  }
}

/**
 * Fetch all pending business profiles for moderation queue.
 */
export async function getPendingBusinessProfilesAction(): Promise<{
  success: boolean;
  profiles: BusinessProfile[];
  error?: string;
}> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required.", profiles: [] };
  }
  try {
    const profiles = await db.getPendingBusinessProfiles();
    return { success: true, profiles };
  } catch (err: any) {
    console.error("getPendingBusinessProfilesAction error:", err);
    return { success: false, error: "Failed to load pending businesses.", profiles: [] };
  }
}

/**
 * Approve business profile, publishing it live and optionally granting verified badge.
 */
export async function approveBusinessProfileAction(params: {
  businessId: string;
  awardVerifiedBadge?: boolean;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  try {
    const ok = await db.setBusinessProfileStatus(
      params.businessId,
      "live",
      undefined,
      Boolean(params.awardVerifiedBadge)
    );
    if (!ok) {
      return { success: false, error: "Business profile not found or update failed." };
    }

    const ipAddress = await getAdminIp();
    await db.recordAdminAuditLog({
      adminId: session.userId || "admin",
      adminContact: session.contact || "admin",
      action: "APPROVE_BUSINESS",
      targetType: "business",
      targetId: params.businessId,
      details: { awardVerifiedBadge: Boolean(params.awardVerifiedBadge) },
      ipAddress,
    });

    return {
      success: true,
      message: `Business enterprise successfully approved and published live${
        params.awardVerifiedBadge ? " with Verified Enterprise Badge" : ""
      }.`,
    };
  } catch (err: any) {
    console.error("approveBusinessProfileAction error:", err);
    return { success: false, error: err.message || "Failed to approve business." };
  }
}

/**
 * Reject business profile with a mandatory reason for owner feedback.
 */
export async function rejectBusinessProfileAction(params: {
  businessId: string;
  rejectionReason: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  if (!params.rejectionReason || !params.rejectionReason.trim()) {
    return { success: false, error: "A valid rejection reason is required for audit records." };
  }

  try {
    const ok = await db.setBusinessProfileStatus(
      params.businessId,
      "rejected",
      params.rejectionReason.trim()
    );
    if (!ok) {
      return { success: false, error: "Business profile not found or update failed." };
    }

    const ipAddress = await getAdminIp();
    await db.recordAdminAuditLog({
      adminId: session.userId || "admin",
      adminContact: session.contact || "admin",
      action: "REJECT_BUSINESS",
      targetType: "business",
      targetId: params.businessId,
      details: { reason: params.rejectionReason.trim() },
      ipAddress,
    });

    return {
      success: true,
      message: "Business application rejected with feedback logged.",
    };
  } catch (err: any) {
    console.error("rejectBusinessProfileAction error:", err);
    return { success: false, error: err.message || "Failed to reject business." };
  }
}



