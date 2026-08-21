'use server';

import { db } from "../lib/db";

export async function createClaimInvite(memberId: string) {
  const token = `CLM-2026-${memberId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  return {
    success: true,
    token,
    claimUrl: `https://agarwal-directory.org/claim?token=${token}`,
  };
}

export async function verifyMemberClaim(memberId: string) {
  const updated = await db.claimMember(memberId);
  if (!updated) {
    return { success: false, error: "Member profile not found." };
  }
  return {
    success: true,
    message: "Member profile successfully claimed and locked for independent management.",
  };
}