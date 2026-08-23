'use server';

import { db } from "../lib/db";
import { getSession } from "./auth";
import { Household } from "@/types/household";
import twilio from "twilio";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";
import React from "react";

const twilioClient = process.env.TWILIO_ACCOUNT_SID 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendSMS(phone: string, text: string) {
  if (!twilioClient) return;
  try {
    await twilioClient.messages.create({
      body: text,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
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
        subject: "Your Official ID - Maharaja Agrasen Foundation",
        html: "<p>Welcome! Your membership is approved. Your official ID card is attached to this email.</p>",
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

export async function getModerationHouseholds(): Promise<Household[]> {
  return await db.getHouseholds();
}

export async function approveHousehold(householdId: string) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  const updated = await db.updateHouseholdStatus(householdId, "live");
  if (!updated) return { success: false, error: "Household not found." };
  
  // Triggers
  const members = await db.getMembersByHousehold(householdId);
  for (const member of members) {
    if (member.phone) {
      await sendSMS(member.phone, `Your Maharaja Agrasen Foundation membership is approved! Download your official ID here: https://yourdomain.com/dashboard/pass`);
    }
    if (member.email) {
      await sendWelcomeEmail(member, updated);
    }
  }

  return { success: true, message: `Household ${updated.householdCode} is now LIVE in the directory.` };
}

export async function approveAllHouseholds() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  
  const pendingHouseholds = await db.getHouseholds();
  const householdsToApprove = pendingHouseholds.filter((h: any) => h.status === "pending_review");
  
  const count = await db.approveAllPendingHouseholds();
  
  for (const h of householdsToApprove) {
    const updated = await db.getHouseholdById(h.id);
    const members = await db.getMembersByHousehold(h.id);
    for (const member of members) {
      if (member.phone) {
        await sendSMS(member.phone, `Your Maharaja Agrasen Foundation membership is approved! Download your official ID here: https://yourdomain.com/dashboard/pass`);
      }
      if (member.email) {
        await sendWelcomeEmail(member, updated);
      }
    }
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

