'use server';

import { db } from "@/lib/db";
import { getSession } from "./auth";
import type { Member } from "@/types/household";

export interface UpdateProfileInput {
  memberId: string;
  fullName: string;
  fatherName?: string;
  photoUrl?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  companyName?: string;
  anniversaryDate?: string;
  currentCity?: string;
  currentCountry?: string;
  profession?: string;
  professionTitle?: string;
  professionDescription?: string;
  bio?: string;
  visibility?: {
    contactInfo: "members_only" | "hidden";
    dob: "members_only" | "hidden";
    photo: "public_to_members" | "hidden";
  };
}

export async function saveMemberProfile(input: UpdateProfileInput) {
  const session = await getSession();
  if (!session || !session.contact) {
    return { success: false, error: "You must be signed in to edit profile details." };
  }

  if (!input.memberId) {
    return { success: false, error: "Member ID is required." };
  }

  if (!input.fullName || input.fullName.trim().length < 2) {
    return { success: false, error: "Full Name must be at least 2 characters." };
  }

  const existing = await db.getMemberById(input.memberId);
  if (!existing) {
    return { success: false, error: "Member profile not found." };
  }

  // Permission Check:
  // If user is Head: Can edit if member belongs to their household and is not locked by another individual (unless it is themselves).
  // If user is Claimed Member: Can edit their own profile.
  const household = await db.getHouseholdByContact(session.contact);
  if (!household) {
    return { success: false, error: "Associated family household could not be located." };
  }

  const isSelf = existing.id === session.userId || (existing.phone && existing.phone === session.contact) || (existing.email && existing.email === session.contact) || (household.headUserId === session.userId && existing.relationToHead === "self");
  const isHead = household.headUserId === session.userId || household.verifiedContact === session.contact;

  if (!isSelf && (!isHead || existing.ownerLocked)) {
    return { success: false, error: "You do not have permission to modify this locked profile." };
  }

  // Father's name validation for Head and family members
  if (!input.fatherName || input.fatherName.trim().length < 2) {
    const isSpouseOrMarriedFemale = input.maritalStatus === "Married" && (input.gender === "Female" || existing.relationToHead === "spouse");
    const label = isSpouseOrMarriedFemale ? "Father's / Husband's Name (पिता / पति का नाम)" : "Father's Name (पिता का नाम)";
    return { success: false, error: `${label} is required.` };
  }

  const success = await db.updateMemberProfile(input.memberId, {
    fullName: input.fullName.trim(),
    fatherName: input.fatherName?.trim() || undefined,
    photoUrl: input.photoUrl,
    dob: input.dob?.trim() || undefined,
    gender: input.gender,
    maritalStatus: input.maritalStatus,
    companyName: input.companyName?.trim() || undefined,
    anniversaryDate: input.maritalStatus === "Married" && input.anniversaryDate ? input.anniversaryDate.trim() : undefined,
    currentCity: input.currentCity?.trim() || undefined,
    currentCountry: input.currentCountry?.trim() || "India",
    profession: input.professionTitle?.trim() || input.profession?.trim() || undefined,
    professionTitle: input.professionTitle?.trim() || undefined,
    professionDescription: input.professionDescription?.trim() || undefined,
    bio: input.bio?.trim() || undefined,
    visibility: input.visibility,
    relationToHead: existing.relationToHead,
  });

  if (!success) {
    return { success: false, error: "Failed to update profile details." };
  }

  return {
    success: true,
    message: "Profile updated successfully!",
  };
}

export async function saveHouseholdInfo(householdId: string, updates: { nativePlace?: string; gotra?: string }) {
  const session = await getSession();
  if (!session || !session.contact) {
    return { success: false, error: "You must be signed in to edit household details." };
  }

  const household = await db.getHouseholdByContact(session.contact);
  if (!household) {
    return { success: false, error: "Associated household not found." };
  }

  const isHead = household.headUserId === session.userId || household.verifiedContact === session.contact;
  if (!isHead && session.role !== "admin") {
    return { success: false, error: "Only Head of Household or Admin can modify family origin/gotra." };
  }

  const success = await db.updateHouseholdProfile(householdId, {
    nativePlace: updates.nativePlace?.trim(),
    gotra: updates.gotra?.trim(),
  });

  if (!success) {
    return { success: false, error: "Failed to update family origin." };
  }

  return {
    success: true,
    message: "Family details updated successfully!",
  };
}

export interface AddMemberInput {
  fullName: string;
  relationToHead: "spouse" | "son" | "daughter" | "parent" | "other";
  fatherName: string;
  gender: string;
  maritalStatus: string;
  dob?: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  profession?: string;
  professionTitle?: string;
  professionDescription?: string;
  companyName?: string;
  anniversaryDate?: string;
  currentCity?: string;
  currentCountry?: string;
  bio?: string;
}

export async function addHouseholdMember(input: AddMemberInput): Promise<{
  success: boolean;
  memberId?: string;
  member?: any;
  error?: string;
  message?: string;
}> {
  const session = await getSession();
  if (!session || !session.contact) {
    return { success: false, error: "Authentication required. Please sign in to add family members." };
  }

  const household = await db.getHouseholdByContact(session.contact);
  if (!household) {
    return { success: false, error: "Associated family household could not be located." };
  }

  const isHead = household.headUserId === session.userId || household.verifiedContact === session.contact;
  if (!isHead && session.role !== "admin") {
    return { success: false, error: "Only the Head of Household or Admin can add new family members." };
  }

  // 1. Relationship Validation (A01/A03) - cannot create duplicate 'self'
  const allowedRelations = ["spouse", "son", "daughter", "parent", "other"];
  if (!input.relationToHead || !allowedRelations.includes(input.relationToHead.toLowerCase())) {
    return { success: false, error: "Please select a valid relationship to head (cannot be 'self')." };
  }

  // 2. Name validation
  if (!input.fullName || input.fullName.trim().length < 2) {
    return { success: false, error: "Full Name must be at least 2 characters." };
  }
  if (input.fullName.trim().length > 100) {
    return { success: false, error: "Full Name cannot exceed 100 characters." };
  }

  // 3. Cultural Father's / Husband's Name Validation
  const isSpouseOrMarriedFemale = input.maritalStatus === "Married" && (input.gender === "Female" || input.relationToHead === "spouse");
  const label = isSpouseOrMarriedFemale ? "Father's / Husband's Name (पिता / पति का नाम)" : "Father's Name (पिता का नाम)";
  if (!input.fatherName || input.fatherName.trim().length < 2) {
    return { success: false, error: `${label} is required.` };
  }

  // 4. Contact Collision Guard (A07)
  if (input.email && input.email.trim()) {
    const cleanEmail = input.email.trim().toLowerCase();
    const contactCheck = await db.checkContactExists(cleanEmail);
    if (contactCheck.exists) {
      return {
        success: false,
        error: `The email ${cleanEmail} is already registered to another member or household in the directory.`
      };
    }
  }

  if (input.phone && input.phone.trim()) {
    const cleanPhone = input.phone.trim();
    const contactCheck = await db.checkContactExists(cleanPhone);
    if (contactCheck.exists) {
      return {
        success: false,
        error: `The phone number ${cleanPhone} is already registered to another member or household in the directory.`
      };
    }
  }

  try {
    const newMember = await db.addMemberToHousehold(household.id, {
      fullName: input.fullName.trim(),
      relationToHead: input.relationToHead.toLowerCase() as any,
      fatherName: input.fatherName.trim(),
      gender: input.gender || "Male",
      maritalStatus: input.maritalStatus || "Unmarried",
      dob: input.dob?.trim(),
      photoUrl: input.photoUrl,
      phone: input.phone?.trim(),
      email: input.email?.trim().toLowerCase(),
      profession: input.professionTitle?.trim() || input.profession?.trim() || "Not specified",
      professionTitle: input.professionTitle?.trim(),
      professionDescription: input.professionDescription?.trim(),
      companyName: input.companyName?.trim(),
      anniversaryDate: input.maritalStatus === "Married" && input.anniversaryDate ? input.anniversaryDate.trim() : undefined,
      currentCity: input.currentCity?.trim() || household.city || household.nativePlace,
      currentCountry: input.currentCountry?.trim() || household.country || "India",
      bio: input.bio?.trim(),
    });

    return {
      success: true,
      member: newMember,
      memberId: newMember.id,
      message: `${input.fullName.trim()} has been added to your household records successfully!`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to add family member to household.",
    };
  }
}

