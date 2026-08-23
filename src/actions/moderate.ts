'use server';

import { db } from "../lib/db";
import { getSession } from "./auth";
import { Household } from "@/types/household";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";
import React from "react";

async function sendSMS(phone: string, text: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from || !phone) return;

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
  for (const member of members) {
    if (member.phone) {
      await sendSMS(
        member.phone,
        `Your Maharaja Agrasen Foundation membership is approved! Your Serial No is ${serial}. Download your official ID pass here: https://agrasenvaishakhara.com/dashboard/pass`
      );
    }
    if (member.email) {
      await sendWelcomeEmail(member, household);
    }
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

