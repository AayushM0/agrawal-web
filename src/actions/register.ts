'use server';

import { db } from "../lib/db";
import type { Household, Member } from "../types/household";
import { gotras } from "../data/gotras";
import { normalizePhoneNumber } from "@/lib/phone";
import { createSession } from "./auth";

export interface RegisterHouseholdInput {
  headName: string;
  verifiedContact: string;
  gotra: string;
  nativePlace: string;
  members: Omit<Member, "id" | "verifiedBySelf" | "ownerLocked">[];
  consentAccepted: boolean;
}

const VALID_RELATIONS = new Set([
  "self", "spouse", "father", "mother", "son", "daughter",
  "brother", "sister", "daughter_in_law", "son_in_law",
  "grandson", "granddaughter", "other"
]);

const VALID_GENDERS = new Set(["Male", "Female", "Other"]);
const VALID_MARITAL = new Set(["Married", "Unmarried", "Widowed", "Divorced"]);

export async function registerHousehold(input: RegisterHouseholdInput) {
  // 1. Consent Validation
  if (!input.consentAccepted) {
    return { success: false, error: "Consent to Privacy Policy and Terms is required." };
  }

  // 2. Head details sanitization and validation
  const cleanHeadName = input.headName?.trim();
  const cleanNativePlace = input.nativePlace?.trim();

  if (!cleanHeadName || cleanHeadName.length < 2 || cleanHeadName.length > 100) {
    return { success: false, error: "Head of Household name must be between 2 and 100 characters." };
  }

  if (!cleanNativePlace || cleanNativePlace.length < 2 || cleanNativePlace.length > 100) {
    return { success: false, error: "Ancestral native place must be between 2 and 100 characters." };
  }

  // 3. 18 Gotras Validation
  const validGotra = gotras.some((g) => g.name.toLowerCase() === input.gotra?.toLowerCase());
  if (!validGotra) {
    return { success: false, error: "Please select a valid Gotra from the 18 established Gotras." };
  }

  // 4. Contact Normalization
  const isPhone = !input.verifiedContact.includes("@");
  const canonicalContact = isPhone 
    ? normalizePhoneNumber(input.verifiedContact) 
    : input.verifiedContact.trim().toLowerCase();

  if (!canonicalContact || canonicalContact.length < 5) {
    return { success: false, error: "A valid verified mobile number or email address is required." };
  }

  // 5. Unique Contact Check (Prevent duplicate households per TRD §2)
  const existing = await db.getHouseholdByContact(canonicalContact);
  if (existing) {
    return {
      success: false,
      error: "A household registration already exists under this verified contact number or email.",
    };
  }

  // 6. Member Sub-Fields Validation
  if (!Array.isArray(input.members) || input.members.length === 0) {
    return { success: false, error: "At least one family member (Head of Household) must be added." };
  }

  for (let i = 0; i < input.members.length; i++) {
    const m = input.members[i];
    const memberName = m.fullName?.trim();
    if (!memberName || memberName.length < 2 || memberName.length > 100) {
      return { success: false, error: `Member #${i + 1} name must be between 2 and 100 characters.` };
    }

    if (m.relationToHead && !VALID_RELATIONS.has(m.relationToHead.toLowerCase())) {
      return { success: false, error: `Invalid relation '${m.relationToHead}' for member #${i + 1}.` };
    }

    if (m.gender && !VALID_GENDERS.has(m.gender)) {
      return { success: false, error: `Invalid gender for member #${i + 1}.` };
    }

    if (m.maritalStatus && !VALID_MARITAL.has(m.maritalStatus)) {
      return { success: false, error: `Invalid marital status for member #${i + 1}.` };
    }
  }

  // 7. Create new Household with pending_review status
  const householdId = `h-${Date.now()}`;
  const householdCode = `AGR-2026-${Math.floor(100 + Math.random() * 900)}`;

  const structuredMembers: Member[] = input.members.map((m, idx) => ({
    ...m,
    fullName: m.fullName.trim(),
    relationToHead: (m.relationToHead?.toLowerCase() as any) || (idx === 0 ? "self" : "other"),
    currentCity: m.currentCity?.trim() || cleanNativePlace,
    currentCountry: m.currentCountry?.trim() || "India",
    profession: m.profession?.trim() || "",
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
    headName: cleanHeadName,
    nativePlace: cleanNativePlace,
    gotra: input.gotra,
    status: "pending_review",
    verifiedContact: canonicalContact,
    consentAcceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    members: structuredMembers,
  };

  await db.createHousehold(newHousehold);

  // Automatically establish logged-in session for the newly registered Head of Household
  await createSession({
    userId: newHousehold.headUserId,
    role: "head",
    contact: canonicalContact,
    householdStatus: "pending_review",
  });

  return {
    success: true,
    householdCode,
    message: "Registration submitted successfully into community moderation queue.",
  };
}