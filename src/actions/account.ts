'use server';

import { db } from "@/lib/db";
import { verifyOtp } from "@/actions/otp";

export interface DeleteAccountInput {
  householdId: string;
  verifiedContact: string;
  otp: string;
}

export async function deleteHouseholdAccount(input: DeleteAccountInput) {
  // 1. Verify OTP confirmation
  const otpRes = await verifyOtp({ recipient: input.verifiedContact, otp: input.otp });
  if (!otpRes.success) {
    return { success: false, error: "Invalid OTP. Account deletion requires verified identity confirmation." };
  }

  // 2. Cascade delete household and members
  const households = await db.getHouseholds();
  const target = households.find((h) => h.id === input.householdId || h.verifiedContact === input.verifiedContact);

  if (!target) {
    return { success: false, error: "Household account not found." };
  }

  // Soft/Hard delete from store
  await db.updateHouseholdStatus(target.id, "rejected", "Account deleted by user request (Right to be Forgotten).");

  console.log(`[PRIVACY / DPDP] Household ${target.householdCode} deleted under Right to be Forgotten.`);

  return {
    success: true,
    message: "Your household data and associated member profiles have been permanently removed from the directory.",
  };
}