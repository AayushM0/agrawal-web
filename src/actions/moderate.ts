'use server';

import { db } from "../lib/db";
import { getSession } from "./auth";
import { Household } from "@/types/household";

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
  return { success: true, message: `Household ${updated.householdCode} is now LIVE in the directory.` };
}

export async function approveAllHouseholds() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return { success: false, error: "Unauthorized: Admin privileges required." };
  }
  const count = await db.approveAllPendingHouseholds();
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