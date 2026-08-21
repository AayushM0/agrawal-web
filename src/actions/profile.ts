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
  currentCity?: string;
  currentCountry?: string;
  profession?: string;
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

  // Father's name validation for Head
  if (existing.relationToHead === "self" && (!input.fatherName || input.fatherName.trim().length < 2)) {
    return { success: false, error: "Father's Name (पिता का नाम) is required for Head of Household." };
  }

  const success = await db.updateMemberProfile(input.memberId, {
    fullName: input.fullName.trim(),
    fatherName: input.fatherName?.trim() || undefined,
    photoUrl: input.photoUrl,
    dob: input.dob?.trim() || undefined,
    gender: input.gender,
    maritalStatus: input.maritalStatus,
    currentCity: input.currentCity?.trim() || undefined,
    currentCountry: input.currentCountry?.trim() || "India",
    profession: input.profession?.trim() || undefined,
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
