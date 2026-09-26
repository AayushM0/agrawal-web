'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import type {
  CareerProfile,
  CreateCareerProfileInput,
  UpdateCareerProfileInput,
  CareerFilter,
} from "@/types/career";

/**
 * Sanitize candidate profile for public display, masking confidential details.
 */
function sanitizeCareerProfile(profile: CareerProfile): CareerProfile {
  return {
    ...profile,
    // Confidential Mode: mask current company if requested by the candidate
    currentCompany: profile.isConfidentialMode ? "Confidential Enterprise" : profile.currentCompany,
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    preferredLocations: Array.isArray(profile.preferredLocations) ? profile.preferredLocations : [],
  };
}

/**
 * Create or update an individual member's career profile.
 */
export async function createCareerProfileAction(input: CreateCareerProfileInput): Promise<{
  success: boolean;
  profile?: CareerProfile;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to build a career profile." };
  }

  if (session.householdStatus !== "live") {
    return { success: false, error: "Your household registration is pending administrative approval." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household || !household.id) {
      return { success: false, error: "Unable to locate verified household record." };
    }

    const memberId = input.memberId?.trim();
    if (!memberId) {
      return { success: false, error: "Please select a household member for this profile." };
    }

    // Verify selected member belongs to this household
    const member = household.members?.find((m: any) => m.id === memberId);
    if (!member) {
      return { success: false, error: "The selected member does not belong to your household." };
    }

    // Validations
    const headline = input.headline?.trim();
    if (!headline || headline.length < 5) {
      return { success: false, error: "Professional headline must be at least 5 characters." };
    }

    if (!input.primaryDomain?.trim()) {
      return { success: false, error: "Please select your primary industry domain." };
    }

    if (!input.careerLevel?.trim()) {
      return { success: false, error: "Please select your career seniority level." };
    }

    const cleanSkills = Array.isArray(input.skills)
      ? input.skills.map((s) => s.trim()).filter(Boolean)
      : [];

    const cleanLocations = Array.isArray(input.preferredLocations)
      ? input.preferredLocations.map((l) => l.trim()).filter(Boolean)
      : [];

    const created = await db.createCareerProfile({
      householdId: household.id,
      memberId,
      headline,
      careerLevel: input.careerLevel,
      primaryDomain: input.primaryDomain,
      currentCompany: input.currentCompany?.trim() || undefined,
      currentDesignation: input.currentDesignation?.trim() || undefined,
      yearsOfExperience: typeof input.yearsOfExperience === "number" ? Math.max(0, input.yearsOfExperience) : 0,
      educationHighest: input.educationHighest?.trim() || undefined,
      educationInstitution: input.educationInstitution?.trim() || undefined,
      skills: cleanSkills,
      seekingStatus: input.seekingStatus || "open_to_offers",
      preferredLocations: cleanLocations,
      workplacePreference: input.workplacePreference || "flexible",
      resumeUrl: input.resumeUrl?.trim() || undefined,
      bio: input.bio?.trim() || undefined,
      linkedinUrl: input.linkedinUrl?.trim() || undefined,
      portfolioUrl: input.portfolioUrl?.trim() || undefined,
      isMentorAvailable: Boolean(input.isMentorAvailable),
      isConfidentialMode: Boolean(input.isConfidentialMode),
    });

    return {
      success: true,
      profile: sanitizeCareerProfile(created),
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] createCareerProfileAction:", err);
    return { success: false, error: err.message || "Failed to create career profile." };
  }
}

/**
 * Fetch a single career profile by its ID.
 */
export async function getCareerProfileByIdAction(id: string): Promise<{
  success: boolean;
  profile?: CareerProfile;
  error?: string;
}> {
  try {
    const profile = await db.getCareerProfileById(id);
    if (!profile) {
      return { success: false, error: "Career profile not found." };
    }
    return {
      success: true,
      profile: sanitizeCareerProfile(profile),
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getCareerProfileByIdAction:", err);
    return { success: false, error: "Failed to fetch career profile." };
  }
}

/**
 * Fetch a career profile by member ID.
 */
export async function getCareerProfileByMemberIdAction(memberId: string): Promise<{
  success: boolean;
  profile?: CareerProfile | null;
  error?: string;
}> {
  try {
    const profile = await db.getCareerProfileByMemberId(memberId);
    return {
      success: true,
      profile: profile ? sanitizeCareerProfile(profile) : null,
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getCareerProfileByMemberIdAction:", err);
    return { success: false, error: "Failed to fetch career profile by member." };
  }
}

/**
 * Fetch public live career profiles matching filters.
 */
export async function getLiveCareerProfilesAction(filter: CareerFilter = {}): Promise<{
  success: boolean;
  profiles: CareerProfile[];
  total: number;
  error?: string;
}> {
  try {
    const { profiles, total } = await db.getLiveCareerProfiles(filter);
    return {
      success: true,
      profiles: profiles.map(sanitizeCareerProfile),
      total,
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] getLiveCareerProfilesAction:", err);
    return { success: false, profiles: [], total: 0, error: "Failed to fetch live career profiles." };
  }
}

/**
 * Update an existing career profile.
 */
export async function updateCareerProfileAction(
  id: string,
  updates: UpdateCareerProfileInput
): Promise<{ success: boolean; profile?: CareerProfile; error?: string }> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to edit your profile." };
  }

  try {
    const existing = await db.getCareerProfileById(id);
    if (!existing) {
      return { success: false, error: "Career profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || household.id !== existing.householdId) {
      return { success: false, error: "You are not authorized to edit this profile." };
    }

    const updated = await db.updateCareerProfile(id, updates);
    return {
      success: true,
      profile: updated ? sanitizeCareerProfile(updated) : undefined,
    };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] updateCareerProfileAction:", err);
    return { success: false, error: err.message || "Failed to update profile." };
  }
}

/**
 * Toggle visibility of a career profile between live and paused.
 */
export async function toggleCareerProfileVisibilityAction(id: string): Promise<{
  success: boolean;
  newStatus?: "live" | "paused";
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const existing = await db.getCareerProfileById(id);
    if (!existing) {
      return { success: false, error: "Profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || household.id !== existing.householdId) {
      return { success: false, error: "Unauthorized." };
    }

    const nextStatus = existing.status === "live" ? "paused" : "live";
    await db.updateCareerProfile(id, { status: nextStatus });
    return { success: true, newStatus: nextStatus };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] toggleCareerProfileVisibilityAction:", err);
    return { success: false, error: "Failed to toggle profile visibility." };
  }
}

/**
 * Delete a career profile.
 */
export async function deleteCareerProfileAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const existing = await db.getCareerProfileById(id);
    if (!existing) {
      return { success: false, error: "Profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || household.id !== existing.householdId) {
      return { success: false, error: "Unauthorized." };
    }

    const deleted = await db.deleteCareerProfile(id);
    return { success: deleted };
  } catch (err: any) {
    console.error("[CAREER ACTION ERROR] deleteCareerProfileAction:", err);
    return { success: false, error: "Failed to delete profile." };
  }
}
