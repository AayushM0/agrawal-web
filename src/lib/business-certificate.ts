import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { VerifiedBusinessCertificatePDF } from "@/components/VerifiedBusinessCertificatePDF";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email-queue";
import { escHtml } from "@/lib/email";
import type { BusinessCertificateIssuance, BusinessProfile } from "@/types/business";

type CertificateRecipient = { email: string; name?: string | null };

function certificateFilename(business: BusinessProfile): string {
  const safeName = (business.businessName || "business").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `MAFL_Business_Certificate_${safeName}.pdf`;
}

export async function renderBusinessCertificate(business: BusinessProfile, issuedAt?: string): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(React.createElement(VerifiedBusinessCertificatePDF, { business, issuedAt }) as any));
}

export async function getBusinessCertificateRecipients(business: BusinessProfile): Promise<CertificateRecipient[]> {
  const candidates: CertificateRecipient[] = [];
  if (business.contactEmail) candidates.push({ email: business.contactEmail });
  const primaryDirector = business.linkedDirectors?.find((director) => director.isPrimaryContact);
  if (primaryDirector?.email) candidates.push({ email: primaryDirector.email, name: primaryDirector.name });

  const assignment = await db.getBusinessProfileManager(business.id);
  if (assignment?.managerActorType === "member") {
    const manager = await db.getMemberById(assignment.managerActorId);
    if (manager?.email) candidates.push({ email: manager.email, name: manager.fullName });
  }

  const byEmail = new Map<string, CertificateRecipient>();
  for (const recipient of candidates) {
    const email = recipient.email?.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) byEmail.set(email, { ...recipient, email });
  }
  return [...byEmail.values()];
}

export async function queueBusinessCertificateDelivery(params: {
  business: BusinessProfile;
  issuance: BusinessCertificateIssuance;
  deliveryKind: "approval" | "resend";
}): Promise<{ queued: number; failures: string[] }> {
  const recipients = await getBusinessCertificateRecipients(params.business);
  if (!recipients.length) return { queued: 0, failures: ["No valid business contact or current-manager email is available."] };

  let attachment: string;
  try {
    attachment = (await renderBusinessCertificate(params.business, params.issuance.issuedAt)).toString("base64");
  } catch (error: any) {
    const message = error?.message || "Certificate PDF generation failed.";
    await Promise.all(recipients.map((recipient) => db.recordBusinessCertificateDelivery({
      issuanceId: params.issuance.id, recipientEmail: recipient.email, recipientName: recipient.name || null,
      deliveryKind: params.deliveryKind, failureReason: message,
    })));
    return { queued: 0, failures: [message] };
  }

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.maharajaagrasenfoundation.com"}/dashboard`;
  const subjectIdentifier = String(params.business.businessSerialNo || params.business.businessName || "Business").replace(/[\r\n]/g, " ").slice(0, 180);
  const subject = `Business Certificate: ${subjectIdentifier}`;
  const results = await Promise.all(recipients.map(async (recipient) => {
    const queued = await enqueueEmail({
      recipientEmail: recipient.email,
      recipientName: recipient.name || null,
      subject,
      htmlBody: `<p>Dear ${escHtml(recipient.name || "Member")},</p><p>Your MAFL business certificate for <strong>${escHtml(params.business.businessName)}</strong> is attached.</p><p>You can also download the current certificate from your authenticated dashboard: <a href="${dashboardUrl}">${dashboardUrl}</a></p>`,
      textBody: `Your MAFL business certificate for ${params.business.businessName} is attached. Download the current certificate from your authenticated dashboard: ${dashboardUrl}`,
      attachments: [{ filename: certificateFilename(params.business), content: attachment }],
      metadata: { kind: "business_certificate", businessId: params.business.id, issuanceId: params.issuance.id, deliveryKind: params.deliveryKind },
    });
    await db.recordBusinessCertificateDelivery({
      issuanceId: params.issuance.id, recipientEmail: recipient.email, recipientName: recipient.name || null,
      emailQueueId: queued.queueId || null, deliveryKind: params.deliveryKind, failureReason: queued.success ? null : (queued.error || "Email queue rejected delivery."),
    });
    return queued;
  }));
  return { queued: results.filter((result) => result.success).length, failures: results.filter((result) => !result.success).map((result) => result.error || "Email queue rejected delivery.") };
}

export { certificateFilename };
