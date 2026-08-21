'use server';

import { db } from "../lib/db";
import { normalizePhoneNumber } from "@/lib/phone";
import { verifyOtp } from "./otp";
import { createSession } from "./auth";

function parseMemberIdFromToken(token: string): string | null {
  if (!token || !token.trim()) return null;
  const clean = token.trim();
  
  // Format: CLM_<memberId>_<random>
  if (clean.startsWith("CLM_")) {
    const parts = clean.split("_");
    if (parts.length >= 2 && parts[1]) {
      return parts[1];
    }
  }

  // Format: CLM-2026-<memberId>-<random>
  if (clean.startsWith("CLM-2026-")) {
    const withoutPrefix = clean.replace("CLM-2026-", "");
    const lastDash = withoutPrefix.lastIndexOf("-");
    if (lastDash > 0) {
      return withoutPrefix.substring(0, lastDash);
    }
    return withoutPrefix;
  }

  return clean;
}

export async function createClaimInvite(memberId: string) {
  if (!memberId || !memberId.trim()) {
    return { success: false, error: "Member ID is required." };
  }
  const token = `CLM_${memberId.trim()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  return {
    success: true,
    token,
    claimPath: `/claim?token=${token}`,
    claimUrl: `/claim?token=${token}`,
  };
}

export async function getClaimMemberDetails(token: string) {
  const memberId = parseMemberIdFromToken(token);
  if (!memberId) {
    return { success: false, error: "Invalid claim token format." };
  }

  const member = await db.getMemberById(memberId);
  if (!member) {
    return { success: false, error: "Member profile not found for this invite link." };
  }

  return {
    success: true,
    member: {
      id: member.id,
      fullName: member.fullName,
      relationToHead: member.relationToHead,
      fatherName: member.fatherName,
      householdCode: member.householdCode,
      gotra: member.gotra,
      currentCity: member.currentCity,
      alreadyClaimed: !!member.ownerLocked,
      existingPhone: member.phone || null,
      existingEmail: member.email || null,
    },
  };
}

export async function checkContactAvailability(contact: string, excludeMemberId?: string) {
  if (!contact || contact.trim().length < 5) {
    return { available: true };
  }
  const existsResult = await db.checkContactExists(contact, excludeMemberId);
  return {
    available: !existsResult.exists,
    conflict: existsResult.exists ? existsResult : null,
  };
}

export interface VerifyMemberClaimInput {
  token: string;
  contact: string;
  otp: string;
}

export async function verifyMemberClaim(input: VerifyMemberClaimInput | string) {
  // Support both legacy string memberId and rich VerifyMemberClaimInput object
  let token = typeof input === "string" ? input : input.token;
  let contact = typeof input === "object" ? input.contact : "";
  let otp = typeof input === "object" ? input.otp : "";

  const memberId = parseMemberIdFromToken(token);
  if (!memberId) {
    return { success: false, error: "Invalid claim token." };
  }

  const member = await db.getMemberById(memberId);
  if (!member) {
    return { success: false, error: "Member profile not found." };
  }

  if (member.ownerLocked) {
    return { success: false, error: "This profile has already been claimed and locked." };
  }

  // If contact and OTP are provided, verify them
  let isPhone = true;
  let canonicalContact = contact.trim();
  if (contact && otp) {
    isPhone = !contact.includes("@");
    canonicalContact = isPhone ? normalizePhoneNumber(contact) : contact.trim().toLowerCase();

    // 1. Check duplicate across other households/members
    const checkDup = await db.checkContactExists(canonicalContact, memberId);
    if (checkDup.exists) {
      return {
        success: false,
        error: `This ${isPhone ? "mobile number" : "email"} is already registered in the directory (${checkDup.name ? `associated with ${checkDup.name}` : `#${checkDup.householdCode}`}).`,
      };
    }

    // 2. Verify OTP cryptographically
    const otpRes = await verifyOtp({ recipient: canonicalContact, otp });
    if (!otpRes.success) {
      return { success: false, error: otpRes.error || "Invalid OTP verification passcode." };
    }
  }

  const updated = await db.claimMember(memberId, {
    phone: isPhone && canonicalContact ? canonicalContact : undefined,
    email: !isPhone && canonicalContact ? canonicalContact : undefined,
  });

  if (!updated) {
    return { success: false, error: "Failed to update member claim status." };
  }

  // Establish user session for the newly claimed member
  if (canonicalContact) {
    await createSession({
      userId: memberId,
      role: "head",
      contact: canonicalContact,
      householdStatus: member.householdStatus || "live",
    });
  }

  return {
    success: true,
    message: "Member profile successfully claimed and locked for independent management.",
  };
}