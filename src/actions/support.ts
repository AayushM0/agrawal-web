'use server';

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { sanitizeSearchString } from "@/lib/sanitizer";

export interface SubmitInquiryInput {
  name: string;
  email: string;
  category: string;
  message: string;
}

export interface SubmitInquiryResponse {
  success: boolean;
  ticketId?: string;
  message?: string;
  error?: string;
}

const VALID_CATEGORIES = new Set([
  "Registration Moderation",
  "Profile Claiming",
  "Gotra Question",
  "Privacy Concern",
  "Technical Glitch",
  "Other Issue",
]);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeSubject(str: string): string {
  return str.replace(/[\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

async function getClientIp(): Promise<string> {
  try {
    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim().slice(0, 45);
    }
    return (reqHeaders.get("x-real-ip") || "127.0.0.1").slice(0, 45);
  } catch {
    return "127.0.0.1";
  }
}

async function dispatchInquiryEmails(inquiry: {
  ticketId: string;
  name: string;
  email: string;
  category: string;
  message: string;
  createdAt: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>";
  const secretariatEmail = "contact@maharajaagrasenfoundation.com";

  const safeName = escapeHtml(inquiry.name);
  const safeEmail = escapeHtml(inquiry.email);
  const safeCategory = escapeHtml(inquiry.category);
  const safeMessage = escapeHtml(inquiry.message);
  const safeTicket = escapeHtml(inquiry.ticketId);

  const subjectName = sanitizeSubject(inquiry.name);
  const subjectCategory = sanitizeSubject(inquiry.category);

  // 1. Email notification to Foundation Secretariat / Administrators
  const adminPromise = fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: secretariatEmail,
      reply_to: inquiry.email,
      subject: `[New Inquiry #${inquiry.ticketId}] ${subjectCategory} — ${subjectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2d9c8; border-radius: 12px; padding: 24px; background-color: #fffdf8;">
          <h2 style="color: #b8381e; margin-top: 0;">New Community Inquiry Received</h2>
          <p style="font-size: 14px; color: #4a3e36;">A new inquiry has been submitted through the portal support desk.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold; width: 130px; color: #7a6e65;">Ticket ID:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #b8381e;">#${safeTicket}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold; color: #7a6e65;">Name:</td>
              <td style="padding: 8px 0; color: #2a201b;">${safeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold; color: #7a6e65;">Email Address:</td>
              <td style="padding: 8px 0; color: #2a201b;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold; color: #7a6e65;">Category:</td>
              <td style="padding: 8px 0; color: #2a201b;">${safeCategory}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #7a6e65;">Submitted At:</td>
              <td style="padding: 8px 0; color: #2a201b;">${new Date(inquiry.createdAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} (SGT)</td>
            </tr>
          </table>

          <div style="background-color: #f7f1e5; border-left: 4px solid #b8381e; padding: 14px 16px; border-radius: 6px; margin-top: 16px;">
            <p style="margin: 0; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #7a6e65; margin-bottom: 6px;">Message Content:</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2a201b; white-space: pre-wrap;">${safeMessage}</p>
          </div>
          
          <p style="font-size: 11px; color: #9c8e82; margin-top: 24px; text-align: center;">
            Maharaja Agrasen Foundation Limited Singapore • Support Desk Operations
          </p>
        </div>
      `,
    }),
  }).catch((err) => {
    console.error("[RESEND SECRETARIAT ALERT ERROR]:", err);
  });

  // 2. Automated acknowledgment receipt to the user
  const userPromise = fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: inquiry.email,
      subject: `Support Ticket Received [#${inquiry.ticketId}] — Maharaja Agrasen Foundation`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2d9c8; border-radius: 12px; padding: 24px; background-color: #fffdf8;">
          <h2 style="color: #b8381e; margin-top: 0;">Namaste, ${safeName} 🙏</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4a3e36;">
            Thank you for contacting the <strong>Maharaja Agrasen Foundation Limited Singapore</strong>. We have received your inquiry and our Secretariat team has been notified.
          </p>

          <div style="background-color: #f7f1e5; border: 1px solid #e2d9c8; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Ticket Reference:</strong> <span style="color: #b8381e; font-weight: bold;">#${safeTicket}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Issue Category:</strong> ${safeCategory}</p>
            <p style="margin: 0; font-size: 13px;"><strong>Expected Response:</strong> Within 1 to 2 business days</p>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #4a3e36;">
            If your query requires immediate assistance regarding an urgent matter, you may also connect directly via our official WhatsApp helpline:
          </p>
          <p style="margin: 16px 0;">
            <a href="https://wa.me/6592774444" style="background-color: #25D366; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block;">
              💬 WhatsApp: +65 9277 4444
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #e2d9c8; margin: 24px 0;" />
          <p style="font-size: 11px; color: #9c8e82; text-align: center; margin: 0;">
            Maharaja Agrasen Foundation Limited Singapore<br />
            One Community • One Platform • One Global Family<br />
            🌐 <a href="https://maharajaagrasenfoundation.com" style="color: #b8381e;">maharajaagrasenfoundation.com</a>
          </p>
        </div>
      `,
    }),
  }).catch((err) => {
    console.error("[RESEND USER RECEIPT ERROR]:", err);
  });

  await Promise.allSettled([adminPromise, userPromise]);
}

export async function submitSupportInquiry(input: SubmitInquiryInput): Promise<SubmitInquiryResponse> {
  const cleanName = input.name?.trim();
  const cleanEmail = input.email?.trim().toLowerCase();
  const cleanCategory = input.category?.trim() || "Other Issue";
  const cleanMessage = input.message?.trim();

  // 1. Validation
  if (!cleanName || cleanName.length < 2 || cleanName.length > 150) {
    return {
      success: false,
      error: "Please enter your full name (between 2 and 150 characters).",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || cleanEmail.length < 5 || cleanEmail.length > 255 || !emailRegex.test(cleanEmail)) {
    return {
      success: false,
      error: "Please enter a valid email address.",
    };
  }

  const substantiveMessage = cleanMessage ? cleanMessage.replace(/\s+/g, " ").trim() : "";
  if (!substantiveMessage || substantiveMessage.length < 10) {
    return {
      success: false,
      error: "Please provide detailed inquiry information (minimum 10 characters).",
    };
  }

  if (cleanMessage.length > 3000) {
    return {
      success: false,
      error: "Inquiry message cannot exceed 3,000 characters.",
    };
  }

  // 2. Abuse Defense & Rate Limiting
  const clientIp = await getClientIp();
  const rateCheck = await db.checkSupportRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.error || "Rate limit exceeded. Please try again later.",
    };
  }

  // 3. Persist to PostgreSQL
  try {
    const inquiry = await db.createSupportInquiry({
      name: cleanName,
      email: cleanEmail,
      category: VALID_CATEGORIES.has(cleanCategory) ? cleanCategory : "Other Issue",
      message: cleanMessage,
      ipAddress: clientIp,
    });

    // 4. Trigger Email Alerts in Background
    dispatchInquiryEmails(inquiry).catch((err) => {
      console.warn("Background email dispatch notice:", err);
    });

    return {
      success: true,
      ticketId: inquiry.ticketId,
      message: `Your inquiry has been successfully registered under ticket #${inquiry.ticketId}. Our Secretariat will respond within 1-2 business days.`,
    };
  } catch (err: any) {
    console.error("[SUPPORT ACTION ERROR]:", err);
    return {
      success: false,
      error: "We could not save your inquiry at this moment. Please reach us on WhatsApp (+65 9277 4444) or try again shortly.",
    };
  }
}
