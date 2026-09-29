'use server';

import { db } from "@/lib/db";
import { getSession } from "./auth";
import { deleteMemberPhoto, uploadMemberPhoto } from "@/lib/storage";
import type { Member } from "@/types/household";
import { verifyOtp } from "@/actions/otp";
import { hashGovtId, maskAadhaar, maskGovtId } from "@/lib/privacy";

export interface UpdateProfileInput {
  memberId: string;
  fullName: string;
  fatherName?: string;
  photoUrl?: string | null;
  dob?: string | null;
  gender?: string;
  maritalStatus?: string;
  companyName?: string;
  anniversaryDate?: string;
  currentCity?: string;
  currentCountry?: string;
  postalCode?: string | null;
  state?: string | null;
  fullAddress?: string | null;
  profession?: string;
  professionTitle?: string;
  professionDescription?: string;
  bio?: string;
  relationToHead?: "self" | "spouse" | "son" | "daughter" | "parent" | "other";
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

  if (session.isActivated === false) {
    return { success: false, error: "Account activation required. Please verify OTP and set a password to edit profile details." };
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
  const isHead =
    session.role === "head" ||
    household.headUserId === session.userId ||
    household.verifiedContact === session.contact ||
    household.members?.some(
      (m) =>
        m.relationToHead === "self" &&
        (m.id === session.userId || m.phone === session.contact || m.email === session.contact)
    );

  if (!isSelf && (!isHead || existing.ownerLocked)) {
    return { success: false, error: "You do not have permission to modify this locked profile." };
  }

  // Father's name validation for Head and family members
  if (!input.fatherName || input.fatherName.trim().length < 2) {
    const isSpouseOrMarriedFemale = input.maritalStatus === "Married" && (input.gender === "Female" || existing.relationToHead === "spouse");
    const label = isSpouseOrMarriedFemale ? "Father's / Husband's Name (पिता / पति का नाम)" : "Father's Name (पिता का नाम)";
    return { success: false, error: `${label} is required.` };
  }

  let finalPhotoUrl = input.photoUrl;
  if (finalPhotoUrl && finalPhotoUrl.trim().startsWith("data:image/")) {
    finalPhotoUrl = await uploadMemberPhoto(finalPhotoUrl, {
      identifier: `member_${input.memberId}`,
    });
  }

  const success = await db.updateMemberProfile(input.memberId, {
    fullName: input.fullName.trim(),
    fatherName: input.fatherName?.trim() || undefined,
    photoUrl: input.photoUrl !== undefined ? (finalPhotoUrl && finalPhotoUrl.trim() ? finalPhotoUrl.trim() : null) : undefined,
    dob: input.dob !== undefined ? (input.dob && input.dob.trim() && input.dob !== "Not specified" ? input.dob.trim() : null) : undefined,
    gender: input.gender,
    maritalStatus: input.maritalStatus,
    companyName: input.companyName?.trim() || undefined,
    anniversaryDate: input.maritalStatus === "Married" && input.anniversaryDate ? input.anniversaryDate.trim() : undefined,
    currentCity: input.currentCity?.trim() || undefined,
    currentCountry: input.currentCountry?.trim() || "India",
    postalCode: input.postalCode,
    state: input.state,
    fullAddress: input.fullAddress,
    profession: input.professionTitle?.trim() || input.profession?.trim() || undefined,
    professionTitle: input.professionTitle?.trim() || undefined,
    professionDescription: input.professionDescription?.trim() || undefined,
    bio: input.bio?.trim() || undefined,
    visibility: input.visibility,
    relationToHead: existing.relationToHead === "self" ? "self" : input.relationToHead || existing.relationToHead,
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

  if (session.isActivated === false) {
    return { success: false, error: "Account activation required. Please verify OTP and set a password to edit family origin." };
  }

  const household = await db.getHouseholdByContact(session.contact);
  if (!household) {
    return { success: false, error: "Associated household not found." };
  }

  const isHead =
    session.role === "head" ||
    household.headUserId === session.userId ||
    household.verifiedContact === session.contact ||
    household.members?.some(
      (m) =>
        m.relationToHead === "self" &&
        (m.id === session.userId || m.phone === session.contact || m.email === session.contact)
    );
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

export async function updateIdentityDocuments(input: {
  memberId: string;
  otp: string;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  passportNumber?: string | null;
  govtIdNumber?: string | null;
}) {
  try {
    const session = await getSession();
    if (!session?.contact || session.isActivated === false) return { success: false, error: "An activated account is required." };
    const member = await db.getMemberById(input.memberId);
    if (!member) return { success: false, error: "Member profile not found." };
    const household = await db.getHouseholdByContact(session.contact) || await db.getHouseholdById(member.householdId);
    const isSelf = String(member.id) === String(session.userId) || member.email?.toLowerCase() === session.contact.toLowerCase();
    if (!isSelf && !(session.role === "head" && household?.id === member.householdId && !member.ownerLocked)) return { success: false, error: "You cannot change this member's identity documents." };
    const email = member.email?.includes("@") ? member.email.toLowerCase() : (session.contact.includes("@") ? session.contact.toLowerCase() : "");
    if (!email) return { success: false, error: "A registered email address is required for identity-document changes." };
    const otp = await verifyOtp({ recipient: email, otp: input.otp });
    if (!otp.success) return { success: false, error: otp.error || "Invalid or expired email OTP." };
    const cleanAadhaar = input.aadhaarNumber === undefined ? undefined : input.aadhaarNumber?.replace(/[^0-9]/g, "") || null;
  if (cleanAadhaar && cleanAadhaar.length !== 12) return { success: false, error: "Aadhaar must be 12 digits." };
  const pan = input.panNumber === undefined ? undefined : input.panNumber?.trim().toUpperCase() || null;
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return { success: false, error: "PAN format is invalid." };
  const passport = input.passportNumber === undefined ? undefined : input.passportNumber?.trim().toUpperCase() || null;
  if (passport && passport.length < 5) return { success: false, error: "Passport number is too short." };
  const govtId = input.govtIdNumber === undefined ? undefined : input.govtIdNumber?.trim().toUpperCase() || null;
  if (govtId && govtId.length < 3) return { success: false, error: "Government/tax ID is too short." };
  const success = await db.updateMemberIdentityDocuments(member.id, {
    aadhaarNumber: cleanAadhaar === undefined ? undefined : cleanAadhaar ? maskAadhaar(cleanAadhaar) : null,
    aadhaarHash: cleanAadhaar === undefined ? undefined : cleanAadhaar ? hashGovtId(cleanAadhaar) : null,
    panNumber: pan === undefined ? undefined : pan ? maskGovtId(pan) : null,
    passportNumber: passport === undefined ? undefined : passport ? maskGovtId(passport) : null,
    govtIdNumber: govtId === undefined ? undefined : govtId ? maskGovtId(govtId) : null,
  });
    return success ? { success: true, message: "Identity documents updated. This does not change admin verification." } : { success: false, error: "Unable to update identity documents." };
  } catch (err) {
    console.error("[ACTION ERROR] updateIdentityDocuments:", err);
    return { success: false, error: "Unable to update identity documents. Please try again." };
  }
}

export async function removeHouseholdMember(memberId: string) {
  try {
  const session = await getSession();
  if (!session?.contact || session.isActivated === false) return { success: false, error: "An activated account is required." };
  const household = await db.getHouseholdByContact(session.contact);
  const member = await db.getMemberById(memberId);
  const actingMember = await db.getMemberByContact(session.contact);
  const isHeadByMember = actingMember?.relationToHead === "self" && (actingMember.householdId === household?.id || String(actingMember.householdId) === String(household?.id));
  const isHeadBySession = session.role === "head" && (household?.verifiedContact?.toLowerCase() === session.contact.toLowerCase() || String(household?.headUserId) === String(session.userId) || !actingMember);
  const isHouseholdHead = Boolean(isHeadByMember || isHeadBySession);
  const targetHouseholdId = member?.householdId || member?.household_id;
  if (!household || !member || (household.id !== member.householdId && String(household.id) !== String(targetHouseholdId)) || !isHouseholdHead || member.ownerLocked || member.relationToHead === "self") return { success: false, error: "Only the Head may remove an unclaimed dependent." };
  if (member.photoUrl) await deleteMemberPhoto(member.photoUrl);
  return (await db.deleteMember(member.id)) ? { success: true } : { success: false, error: "Unable to remove member." };
  } catch (err) {
    console.error("[ACTION ERROR] removeHouseholdMember:", err);
    return { success: false, error: "Unable to remove member. Please try again." };
  }
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

  if (session.isActivated === false) {
    return { success: false, error: "Account activation required. Please verify OTP and set a password to add family members." };
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
  const emailPromise = input.email?.trim()
    ? db.checkContactExists(input.email.trim().toLowerCase())
    : Promise.resolve({ exists: false });
  const phonePromise = input.phone?.trim()
    ? db.checkContactExists(input.phone.trim())
    : Promise.resolve({ exists: false });

  const [emailCheck, phoneCheck] = await Promise.all([emailPromise, phonePromise]);

  if (emailCheck.exists) {
    return {
      success: false,
      error: `The email ${input.email!.trim().toLowerCase()} is already registered to another member or household in the directory.`
    };
  }

  if (phoneCheck.exists) {
    return {
      success: false,
      error: `The phone number ${input.phone!.trim()} is already registered to another member or household in the directory.`
    };
  }

  try {
    let finalPhotoUrl = input.photoUrl;
    if (finalPhotoUrl && finalPhotoUrl.trim().startsWith("data:image/")) {
      finalPhotoUrl = await uploadMemberPhoto(finalPhotoUrl, {
        identifier: `member_new_${Date.now()}`,
      });
    }

    const newMember = await db.addMemberToHousehold(household.id, {
      fullName: input.fullName.trim(),
      relationToHead: input.relationToHead.toLowerCase() as any,
      fatherName: input.fatherName.trim(),
      gender: input.gender || "Male",
      maritalStatus: input.maritalStatus || "Unmarried",
      dob: input.dob?.trim(),
      photoUrl: finalPhotoUrl,
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
    console.error("addFamilyMemberToHousehold error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while adding the family member. Please try again later.",
    };
  }
}

