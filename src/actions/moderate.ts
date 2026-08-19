'use server';

import { db } from "../lib/db";

export async function approveHousehold(householdId: string) {
  const updated = await db.updateHouseholdStatus(householdId, "live");
  if (!updated) return { success: false, error: "Household not found." };
  return { success: true, message: `Household ${updated.householdCode} is now LIVE in the directory.` };
}

export async function rejectHousehold(householdId: string, rejectionReason: string) {
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