'use server';

import { db } from "@/lib/db";
import { verifyOtp } from "@/actions/otp";
import { clearSession, getSession } from "@/actions/auth";
import { deleteMemberPhoto } from "@/lib/storage";

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

  // 2. Resolve household and enforce strict contact binding (Anti-IDOR)
  const household = (await db.getHouseholdById(input.householdId)) || (await db.getHouseholdByContact(input.verifiedContact));
  if (!household) {
    return { success: false, error: "Household account not found." };
  }
  if (household.verifiedContact !== input.verifiedContact) {
    return { success: false, error: "Unauthorized: Verified contact does not match this household record." };
  }
  const targetId = household.id;

  // 3. Purge physical member photos from storage
  const members = await db.getMembersByHousehold(targetId);
  await Promise.allSettled(
    members
      .filter((m: any) => m.photoUrl)
      .map((m: any) => deleteMemberPhoto(m.photoUrl))
  );

  // 4. Execute hard permanent delete of household and all associated members from database
  await db.deleteHousehold(targetId);

  // 5. Clear active session cookie if current user is deleting their own account
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