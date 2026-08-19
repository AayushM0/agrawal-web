'use server';

import { db } from "../lib/db";
import type { Household, Member } from "../types/household";
import { gotras } from "../data/gotras";

export interface RegisterHouseholdInput {
  headName: string;
  verifiedContact: string;
  gotra: string;
  nativePlace: string;
  members: Omit<Member, "id" | "verifiedBySelf" | "ownerLocked">[];
  consentAccepted: boolean;
}

export async function registerHousehold(input: RegisterHouseholdInput) {
  // 1. Consent Validation
  if (!input.consentAccepted) {
    return { success: false, error: "Consent to Privacy Policy and Terms is required." };
  }

  // 2. 18 Gotras Validation
  const validGotra = gotras.some((g) => g.name.toLowerCase() === input.gotra.toLowerCase());
  if (!validGotra) {
    return { success: false, error: "Please select a valid Gotra from the 18 established Gotras." };
  }

  // 3. Unique Contact Check (Prevent duplicate households per TRD §2)
  const existing = await db.getHouseholdByContact(input.verifiedContact);
  if (existing) {
    return {
      success: false,
      error: "A household registration already exists under this verified contact number or email.",
    };
  }

  // 4. Create new Household with pending_review status
  const householdId = `h-${Date.now()}`;
  const householdCode = `AGR-2026-${Math.floor(100 + Math.random() * 900)}`;

  const structuredMembers: Member[] = input.members.map((m, idx) => ({
    ...m,
    id: `m-${Date.now()}-${idx}`,
    verifiedBySelf: idx === 0, // Head is self-verified on signup
    ownerLocked: idx === 0,
    visibility: m.visibility || {
      contactInfo: "members_only",
      dob: "hidden",
      photo: "public_to_members",
    },
  }));

  const newHousehold: Household = {
    id: householdId,
    householdCode,
    headUserId: `u-${Date.now()}`,
    headName: input.headName,
    nativePlace: input.nativePlace,
    gotra: input.gotra,
    status: "pending_review",
    verifiedContact: input.verifiedContact,
    consentAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    members: structuredMembers,
  };

  await db.createHousehold(newHousehold);

  return {
    success: true,
    householdCode,
    message: "Registration submitted successfully into community moderation queue.",
  };
}