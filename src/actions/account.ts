'use server';

import { db } from "@/lib/db";
import { verifyOtp } from "@/actions/otp";
import { clearSession, getSession } from "@/actions/auth";

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

  // 2. Cascade delete household and permanently scrub all member PII (DPDP Compliance)
  const household = await db.getHouseholdByContact(input.verifiedContact);
  const targetId = household ? household.id : input.householdId;

  if (!targetId) {
    return { success: false, error: "Household account not found." };
  }

  // Execute hard permanent delete of household and all associated members from database
  await db.deleteHousehold(targetId);

  // Clear active session cookie if current user is deleting their own account
  const currentSession = await getSession();
  if (currentSession && (currentSession.contact === input.verifiedContact || currentSession.userId === targetId)) {
    await clearSession();
  }

  console.log(`[PRIVACY / DPDP COMPLIANCE] Household ${targetId} and all member PII permanently deleted.`);

  return {
    success: true,
    message: "Your household data and all associated member profiles have been permanently scrubbed and deleted from the directory.",
  };
}