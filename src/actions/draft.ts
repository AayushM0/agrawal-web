'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

export interface SaveDraftInput {
  email: string;
  phone: string;
  phoneDialCode?: string;
  headName?: string;
  currentStep?: number;
}

export async function saveRegistrationDraft(input: SaveDraftInput) {
  try {
    if (!input || !input.email || !input.phone) {
      return { success: false, error: "Email and phone are required" };
    }
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanPhone = input.phone.trim();
    if (!cleanEmail.includes("@") || cleanEmail.length < 5) {
      return { success: false, error: "Invalid email" };
    }
    if (cleanPhone.replace(/[^0-9]/g, "").length < 7) {
      return { success: false, error: "Invalid phone" };
    }

    const ok = await db.saveRegistrationDraft({
      email: cleanEmail,
      phone: cleanPhone,
      phoneDialCode: input.phoneDialCode || "+91",
      headName: input.headName,
      currentStep: input.currentStep || 2,
    });
    return { success: ok };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save draft" };
  }
}

export async function markRegistrationDraftCompleted(email: string, phone?: string) {
  try {
    if (!email) return { success: false };
    const ok = await db.markRegistrationDraftCompleted(email, phone);
    return { success: ok };
  } catch {
    return { success: false };
  }
}

export async function getIncompleteRegistrations() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized. Admin privileges required." };
    }
    const drafts = await db.getIncompleteRegistrations();
    return { success: true, drafts };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch incomplete registrations" };
  }
}
