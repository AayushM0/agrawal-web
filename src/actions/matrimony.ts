'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { sanitizeSearchString, sanitizeNameString } from "@/lib/sanitizer";
import { gotras } from "@/data/gotras";
import type {
  MatrimonialProfile,
  MatrimonyFilter,
  CreateMatrimonialProfileInput,
  EligibleHouseholdMember,
} from "@/types/matrimony";

const VALID_GOTRAS = new Set(gotras.map((g) => g.name.toLowerCase()));

// Height helper to compute ft/in display string
function formatHeightDisplay(cm?: number): string {
  if (!cm || isNaN(cm)) return "";
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}' ${inches}" (${cm} cm)`;
}

// Notification Email Helper
async function sendMatrimonyNotificationEmail(payload: {
  to: string;
  subject: string;
  heading: string;
  bodyText: string;
  actionUrl?: string;
  actionText?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[MATRIMONY NOTIFICATION SIMULATION] To: ${payload.to} | Subject: ${payload.subject}`);
    return;
  }
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5d5be; border-radius: 12px; background: #fffcf8;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #800020; margin: 0; font-family: Georgia, serif;">Maharaja Agrasen Foundation</h2>
          <p style="color: #c9933b; font-weight: bold; margin: 4px 0 0 0; font-size: 13px;">अग्रवाल वैवाहिक मंच • Global Matrimony</p>
        </div>
        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #f3e8dc;">
          <h3 style="color: #2c1810; margin-top: 0;">${payload.heading}</h3>
          <p style="color: #55433c; font-size: 14px; line-height: 1.6;">${payload.bodyText}</p>
          ${
            payload.actionUrl
              ? `<div style="text-align: center; margin-top: 24px;">
                   <a href="${payload.actionUrl}" style="background: #800020; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block;">
                     ${payload.actionText || "View Details →"}
                   </a>
                 </div>`
              : ""
          }
        </div>
        <p style="font-size: 11px; color: #8c7368; text-align: center; margin-top: 20px;">
          This is an official automated security alert from Maharaja Agrasen Foundation. Please do not reply to this email.
        </p>
      </div>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Maharaja Agrasen Foundation <verify@maharajaagrasenfoundation.com>",
        to: payload.to,
        subject: payload.subject,
        html,
      }),
    });
  } catch (err) {
    console.error("[MATRIMONY EMAIL ERROR]", err);
  }
}

/**
 * Fetch eligible unmarried members from current user's approved household
 */
export async function getEligibleHouseholdMembers(): Promise<{
  success: boolean;
  members?: EligibleHouseholdMember[];
  householdGotra?: string;
  householdNativePlace?: string;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to manage matrimonial profiles." };
  }
  if (session.householdStatus !== "live") {
    return { success: false, error: "Your family registration is pending admin approval." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household) {
      return { success: false, error: "Household record not found." };
    }

    const existingProfiles = await db.getHouseholdMatrimonialProfiles(household.id);
    const profileByMemberId = new Map(existingProfiles.map((p) => [p.memberId, p]));

    const eligible: EligibleHouseholdMember[] = (household.members || [])
      .filter((m) => {
        const ms = (m.maritalStatus || "").toLowerCase();
        return ms !== "married";
      })
      .map((m) => {
        const p = profileByMemberId.get(m.id);
        return {
          id: m.id,
          fullName: m.fullName,
          relationToHead: m.relationToHead,
          gender: m.gender || "male",
          dob: m.dob || "",
          maritalStatus: m.maritalStatus || "Never Married",
          currentCity: m.currentCity || household.city || "",
          currentCountry: m.currentCountry || household.country || "India",
          profession: m.profession || "",
          professionTitle: m.professionTitle,
          companyName: m.companyName,
          phone: m.phone,
          email: m.email,
          photoUrl: m.photoUrl,
          serialNo: m.serialNo,
          hasMatrimonialProfile: Boolean(p),
          matrimonialProfileId: p?.id,
          matrimonialProfileStatus: p?.status,
        };
      });

    return {
      success: true,
      members: eligible,
      householdGotra: household.gotra,
      householdNativePlace: household.nativePlace,
    };
  } catch (err: any) {
    console.error("[ACTION ERROR] getEligibleHouseholdMembers:", err);
    return { success: false, error: err?.message || "Failed to load eligible family members." };
  }
}

/**
 * Create a new matrimonial profile
 */
export async function createMatrimonialProfile(input: CreateMatrimonialProfileInput): Promise<{
  success: boolean;
  profileId?: string;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to register a matrimonial profile." };
  }
  if (session.householdStatus !== "live") {
    return { success: false, error: "Access locked. Your family registration is pending admin approval." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household) {
      return { success: false, error: "Household record not found." };
    }

    // 1. Verify candidate belongs to creator's household
    const candidateMember = household.members?.find((m) => m.id === input.memberId);
    if (!candidateMember) {
      return {
        success: false,
        error: "Security Violation: You can only create matrimonial profiles for members of your own approved household.",
      };
    }

    // 2. Verify candidate is not already married
    if ((candidateMember.maritalStatus || "").toLowerCase() === "married") {
      return { success: false, error: "Matrimonial profiles can only be registered for unmarried, divorced, or widowed members." };
    }

    // 3. Verify no duplicate profile exists
    const existing = await db.getMatrimonialProfileByMemberId(input.memberId);
    if (existing) {
      return {
        success: false,
        error: `A matrimonial profile already exists for ${candidateMember.fullName}. Please manage the existing profile.`,
      };
    }

    // 4. Validate mandatory fields
    const fullName = sanitizeNameString(candidateMember.fullName || "");
    if (!fullName || fullName.length < 2) {
      return { success: false, error: "Candidate full name must be at least 2 characters." };
    }

    const gender = (candidateMember.gender || "").toLowerCase() === "female" ? "female" : "male";
    const dob = candidateMember.dob || input.dob;
    if (!dob) {
      return { success: false, error: "Date of Birth is required." };
    }

    if (!input.highestEducation || !input.highestEducation.trim()) {
      return { success: false, error: "Highest Education is required." };
    }
    if (!input.employmentSector || !input.employmentSector.trim()) {
      return { success: false, error: "Employment Sector is required." };
    }
    if (!input.occupationTitle || !input.occupationTitle.trim()) {
      return { success: false, error: "Occupation Title is required." };
    }
    if (!input.fatherName || !input.fatherName.trim()) {
      return { success: false, error: "Father's Name is required." };
    }
    if (!input.motherName || !input.motherName.trim()) {
      return { success: false, error: "Mother's Name is required." };
    }
    if (!input.contactPerson || !input.contactPhone) {
      return { success: false, error: "Contact person name and phone number are required." };
    }

    // Gotra from household
    const gotra = household.gotra || "Garg";
    const heightDisplay = input.heightDisplay || formatHeightDisplay(input.heightCm);

    // Photos: default to existing member photo if none provided
    let photos = input.photos || [];
    if (photos.length === 0 && candidateMember.photoUrl) {
      photos = [candidateMember.photoUrl];
    }
    if (photos.length > 3) {
      photos = photos.slice(0, 3);
    }

    // 5. Persist profile
    const profile = await db.createMatrimonialProfile({
      householdId: household.id,
      memberId: candidateMember.id,
      createdByUserId: session.userId,
      status: "active",
      gender,
      fullName,
      createdFor: input.createdFor || "Self",
      maritalStatus: input.maritalStatus || "Never Married",
      dob,
      placeOfBirth: input.placeOfBirth?.trim() || "",
      heightCm: input.heightCm,
      heightDisplay,
      weightBuild: input.weightBuild || "",
      complexion: input.complexion || "",
      bloodGroup: input.bloodGroup || "",
      motherTongue: input.motherTongue?.trim() || "Hindi",
      languagesSpoken: input.languagesSpoken || ["Hindi", "English"],
      diet: input.diet || "Vegetarian",
      smokeDrink: input.smokeDrink || "Non-Smoker / Non-Drinker",
      physicalStatus: input.physicalStatus || "Normal",
      aboutMe: input.aboutMe?.trim() || "",
      gotra,
      highestEducation: input.highestEducation.trim(),
      degreeName: input.degreeName?.trim() || "",
      collegeName: input.collegeName?.trim() || "",
      schoolingHonors: input.schoolingHonors?.trim() || "",
      employmentSector: input.employmentSector.trim(),
      occupationTitle: input.occupationTitle.trim(),
      companyName: input.companyName?.trim() || "",
      annualIncome: input.annualIncome?.trim() || "",
      workCity: input.workCity?.trim() || candidateMember.currentCity || household.city || "",
      workCountry: input.workCountry?.trim() || candidateMember.currentCountry || household.country || "India",
      willingToRelocate: input.willingToRelocate || "Yes",
      fatherName: input.fatherName.trim(),
      fatherMemberId: input.fatherMemberId || undefined,
      fatherOccupation: input.fatherOccupation?.trim() || "",
      motherName: input.motherName.trim(),
      motherMemberId: input.motherMemberId || undefined,
      motherOccupation: input.motherOccupation?.trim() || "",
      linkedSiblings: input.linkedSiblings || [],
      nativePlace: input.nativePlace?.trim() || household.nativePlace || "",
      familyLocation: input.familyLocation?.trim() || `${household.city || ""}, ${household.country || "India"}`,
      familyType: input.familyType || "Nuclear",
      familyValues: input.familyValues || "Traditional",
      familyFinancialStatus: input.familyFinancialStatus || "Upper Middle Class",
      aboutFamily: input.aboutFamily?.trim() || "",
      customFields: input.customFields || [],
      photos,
      partnerPreferences: input.partnerPreferences || {},
      contactPerson: input.contactPerson.trim(),
      contactRelation: input.contactRelation.trim(),
      contactPhone: input.contactPhone.trim(),
      secondaryPhone: input.secondaryPhone?.trim() || "",
      contactEmail: input.contactEmail?.trim() || candidateMember.email || "",
      residentialAddress: input.residentialAddress?.trim() || household.fullAddress || "",
      referencedBy: input.referencedBy?.trim() || undefined,
    });

    // 6. Asynchronous Notification Emails (Anti-Spoofing Alerts)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agrawal-web.vercel.app";

    // Alert candidate if they have an email on file
    if (candidateMember.email && candidateMember.email.includes("@")) {
      sendMatrimonyNotificationEmail({
        to: candidateMember.email,
        subject: "Your Matrimonial Profile is now Live on Maharaja Agrasen Foundation",
        heading: `Jai Shree Agrasen, ${candidateMember.fullName}!`,
        bodyText: `A matrimonial candidate profile has been registered for your account under the ${gotra} Gotra. You have full self-governance over this profile: you can review, update, or pause its visibility at any time from your personal dashboard.`,
        actionUrl: `${baseUrl}/matrimony/${profile.id}`,
        actionText: "View Your Matrimony Profile →",
      }).catch(() => {});
    }

    // Alert linked Father if email present
    if (input.fatherMemberId) {
      const father = household.members?.find((m) => m.id === input.fatherMemberId);
      if (father?.email && father.email.includes("@")) {
        sendMatrimonyNotificationEmail({
          to: father.email,
          subject: `You were linked on ${fullName}'s Matrimonial Profile`,
          heading: "Matrimonial Profile Family Linking",
          bodyText: `Your member profile has been linked as Father on ${fullName}'s newly registered matrimonial biodata. Members in the directory can now verify family lineage through your verified profile.`,
          actionUrl: `${baseUrl}/matrimony/${profile.id}`,
          actionText: "View Candidate Profile →",
        }).catch(() => {});
      }
    }

    // Alert linked Mother if email present
    if (input.motherMemberId) {
      const mother = household.members?.find((m) => m.id === input.motherMemberId);
      if (mother?.email && mother.email.includes("@")) {
        sendMatrimonyNotificationEmail({
          to: mother.email,
          subject: `You were linked on ${fullName}'s Matrimonial Profile`,
          heading: "Matrimonial Profile Family Linking",
          bodyText: `Your member profile has been linked as Mother on ${fullName}'s newly registered matrimonial biodata. Members in the directory can now verify family lineage through your verified profile.`,
          actionUrl: `${baseUrl}/matrimony/${profile.id}`,
          actionText: "View Candidate Profile →",
        }).catch(() => {});
      }
    }

    return { success: true, profileId: profile.id };
  } catch (err: any) {
    console.error("[ACTION ERROR] createMatrimonialProfile:", err);
    return { success: false, error: err?.message || "Failed to create matrimonial profile." };
  }
}

/**
 * Search matrimonial profiles with directory-style filtering
 */
export async function searchMatrimonialProfiles(filters: MatrimonyFilter = {}): Promise<{
  success: boolean;
  profiles: MatrimonialProfile[];
  totalCount: number;
  isGuest?: boolean;
  isPendingApproval?: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, profiles: [], totalCount: 0, isGuest: true, error: "Authentication required" };
  }
  if (session.householdStatus !== "live") {
    return { success: false, profiles: [], totalCount: 0, isPendingApproval: true, error: "Approval pending" };
  }

  try {
    const sanitizedFilters: MatrimonyFilter = {
      gender: filters.gender,
      name: filters.name ? sanitizeSearchString(filters.name) : undefined,
      gotra: filters.gotra && VALID_GOTRAS.has(filters.gotra.toLowerCase()) ? filters.gotra : undefined,
      location: filters.location ? sanitizeSearchString(filters.location) : undefined,
      minAge: filters.minAge,
      maxAge: filters.maxAge,
      minHeightCm: filters.minHeightCm,
      maxHeightCm: filters.maxHeightCm,
      highestEducation: filters.highestEducation,
      employmentSector: filters.employmentSector,
      maritalStatus: filters.maritalStatus,
      nativePlace: filters.nativePlace ? sanitizeSearchString(filters.nativePlace) : undefined,
      page: filters.page || 1,
      limit: filters.limit || 50,
    };

    const res = await db.getMatrimonialProfiles(sanitizedFilters);
    return {
      success: true,
      profiles: res.profiles,
      totalCount: res.totalCount,
    };
  } catch (err: any) {
    console.error("[ACTION ERROR] searchMatrimonialProfiles:", err);
    return { success: false, profiles: [], totalCount: 0, error: "Failed to search matrimonial profiles." };
  }
}

/**
 * Retrieve complete matrimonial profile details by ID
 */
export async function getMatrimonialProfileDetail(id: string): Promise<{
  success: boolean;
  profile?: MatrimonialProfile;
  canManage?: boolean;
  isGuest?: boolean;
  isPendingApproval?: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, isGuest: true, error: "Authentication required" };
  }
  if (session.householdStatus !== "live") {
    return { success: false, isPendingApproval: true, error: "Approval pending" };
  }

  try {
    const profile = await db.getMatrimonialProfileById(id);
    if (!profile) {
      return { success: false, error: "Matrimonial profile not found or has been removed." };
    }

    // Determine management permissions: Candidate, Household Head, or Admin
    const household = await db.getHouseholdByContact(session.contact);
    const canManage = canManageMatrimonialProfile(session, profile, household);

    // Gating check (OWASP A01): Paused or inactive profiles are only accessible to managers
    if (profile.status !== "active" && !canManage) {
      return { success: false, error: "This matrimonial profile is currently paused or inactive." };
    }

    return {
      success: true,
      profile,
      canManage,
    };
  } catch (err: any) {
    console.error("[ACTION ERROR] getMatrimonialProfileDetail:", err);
    return { success: false, error: "Failed to load candidate details." };
  }
}

/**
 * Helper to determine if the current session has management rights over a matrimonial profile
 */
function canManageMatrimonialProfile(
  session: { userId?: string; contact?: string; role?: string },
  profile: MatrimonialProfile,
  household: any
): boolean {
  if (session.role === "admin") return true;
  const candidateMember = household?.members?.find((m: any) => m.id === profile.memberId);
  const isCandidate =
    session.userId === profile.memberId ||
    (candidateMember && (candidateMember.phone === session.contact || candidateMember.email === session.contact)) ||
    session.contact === profile.contactEmail;
  const isHouseholdHead = household ? household.id === profile.householdId : false;
  return Boolean(isCandidate || isHouseholdHead);
}

/**
 * Get all profiles belonging to current household
 */
export async function getMyHouseholdMatrimonialProfiles(): Promise<{
  success: boolean;
  profiles: MatrimonialProfile[];
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) return { success: false, profiles: [] };

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household) return { success: true, profiles: [] };

    const profiles = await db.getHouseholdMatrimonialProfiles(household.id);
    return { success: true, profiles };
  } catch (err: any) {
    console.error("[ACTION ERROR] getMyHouseholdMatrimonialProfiles:", err);
    return { success: false, profiles: [] };
  }
}

/**
 * Toggle active / paused status
 */
export async function updateMatrimonialProfileStatus(
  id: string,
  status: "active" | "paused" | "matched"
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.userId) return { success: false, error: "Unauthorized" };

  try {
    const profile = await db.getMatrimonialProfileById(id);
    if (!profile) return { success: false, error: "Profile not found" };

    const household = await db.getHouseholdByContact(session.contact);
    if (!canManageMatrimonialProfile(session, profile, household)) {
      return { success: false, error: "Unauthorized: You do not have permission to modify this profile." };
    }

    const householdConstraint = session.role === "admin" ? undefined : (household?.id || profile.householdId);
    const updated = await db.updateMatrimonialProfile(id, { status }, householdConstraint);
    return { success: Boolean(updated) };
  } catch (err: any) {
    console.error("[ACTION ERROR] updateMatrimonialProfileStatus:", err);
    return { success: false, error: err?.message || "Failed to update profile status" };
  }
}

/**
 * Delete a matrimonial profile
 */
export async function deleteMatrimonialProfile(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.userId) return { success: false, error: "Unauthorized" };

  try {
    const profile = await db.getMatrimonialProfileById(id);
    if (!profile) return { success: false, error: "Profile not found" };

    const household = await db.getHouseholdByContact(session.contact);
    if (!canManageMatrimonialProfile(session, profile, household)) {
      return { success: false, error: "Unauthorized: You do not have permission to delete this profile." };
    }

    const householdConstraint = session.role === "admin" ? undefined : (household?.id || profile.householdId);
    const res = await db.deleteMatrimonialProfile(id, householdConstraint);
    return { success: res };
  } catch (err: any) {
    console.error("[ACTION ERROR] deleteMatrimonialProfile:", err);
    return { success: false, error: err?.message || "Failed to delete matrimonial profile" };
  }
}
