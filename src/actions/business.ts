'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import type { BusinessProfile, LinkedDirector, BusinessCustomField, BusinessSocialLinks } from "@/types/business";

export interface CreateBusinessProfileInput {
  businessName: string;
  legalName?: string;
  tagline?: string;
  industrySector: string;
  businessType: string;
  yearEstablished?: number;
  aboutBusiness: string;
  offeringsSummary?: string;
  registrationType?: string;
  registrationNumber?: string;
  country?: string;
  state: string;
  city: string;
  pincode?: string;
  addressLine?: string;
  websiteUrl?: string;
  socialLinks?: BusinessSocialLinks;
  photos?: string[];
  customFields?: BusinessCustomField[];
  linkedDirectors?: LinkedDirector[];
}

export interface BusinessFilterInput {
  query?: string;
  sector?: string;
  businessType?: string;
  country?: string;
  state?: string;
  city?: string;
  verifiedOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Sanitize business profile for public display, removing any private/internal credentials.
 */
export function sanitizeBusinessProfile(profile: BusinessProfile): BusinessProfile {
  return {
    ...profile,
    // Ensure array and object defaults
    photos: Array.isArray(profile.photos) ? profile.photos : [],
    customFields: Array.isArray(profile.customFields) ? profile.customFields : [],
    linkedDirectors: Array.isArray(profile.linkedDirectors)
      ? profile.linkedDirectors.map((d) => ({
          memberId: d.memberId,
          serialNo: d.serialNo,
          name: d.name,
          roleTitle: d.roleTitle,
          isPrimaryContact: Boolean(d.isPrimaryContact),
        }))
      : [],
    socialLinks: profile.socialLinks || {},
  };
}

/**
 * Create a new business profile anchored to the authenticated user's approved household.
 */
export async function createBusinessProfile(input: CreateBusinessProfileInput): Promise<{
  success: boolean;
  profile?: BusinessProfile;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to register an enterprise." };
  }

  if (session.householdStatus !== "live") {
    return { success: false, error: "Your household registration is pending administrative approval." };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household || !household.id) {
      return { success: false, error: "Unable to locate verified household record." };
    }

    // Check maximum business limit per household (quota: 5)
    const existingBusinesses = await db.getBusinessProfilesByHouseholdId(household.id);
    if (existingBusinesses.length >= 5) {
      return { success: false, error: "Maximum limit of 5 business profiles per household reached." };
    }

    // Validation
    const cleanName = input.businessName?.trim();
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "Business name must be at least 2 characters." };
    }

    const cleanSector = input.industrySector?.trim();
    if (!cleanSector) {
      return { success: false, error: "Please select an industry sector." };
    }

    const cleanType = input.businessType?.trim();
    if (!cleanType) {
      return { success: false, error: "Please select a business type." };
    }

    const cleanAbout = input.aboutBusiness?.trim();
    if (!cleanAbout || cleanAbout.length < 20) {
      return { success: false, error: "Please provide a detailed overview of the business (minimum 20 characters)." };
    }

    if (!input.state?.trim() || !input.city?.trim()) {
      return { success: false, error: "State and City are required." };
    }

    // Linked directors processing
    let directors: LinkedDirector[] = Array.isArray(input.linkedDirectors) ? input.linkedDirectors : [];
    if (directors.length === 0) {
      // Default primary contact to author member
      directors = [
        {
          memberId: session.userId,
          name: household.headName || "Founder / Director",
          roleTitle: "Proprietor / Director",
          isPrimaryContact: true,
        },
      ];
    } else {
      // Ensure at least one primary contact
      const hasPrimary = directors.some((d) => d.isPrimaryContact);
      if (!hasPrimary) {
        directors[0].isPrimaryContact = true;
      }
    }

    const newProfile = await db.createBusinessProfile({
      householdId: household.id,
      createdByMemberId: session.userId,
      status: "pending_review",
      rejectionReason: undefined,
      businessName: cleanName,
      legalName: input.legalName?.trim() || undefined,
      tagline: input.tagline?.trim() || undefined,
      industrySector: cleanSector,
      businessType: cleanType,
      yearEstablished: input.yearEstablished ? Number(input.yearEstablished) : undefined,
      aboutBusiness: cleanAbout,
      offeringsSummary: input.offeringsSummary?.trim() || undefined,
      registrationType: input.registrationType?.trim() || undefined,
      registrationNumber: input.registrationNumber?.trim() || undefined,
      isVerifiedBadge: false,
      country: input.country?.trim() || "India",
      state: input.state.trim(),
      city: input.city.trim(),
      pincode: input.pincode?.trim() || undefined,
      addressLine: input.addressLine?.trim() || undefined,
      websiteUrl: input.websiteUrl?.trim() || undefined,
      socialLinks: input.socialLinks || {},
      photos: Array.isArray(input.photos) ? input.photos.slice(0, 3) : [],
      customFields: Array.isArray(input.customFields) ? input.customFields : [],
      linkedDirectors: directors,
    });

    return { success: true, profile: sanitizeBusinessProfile(newProfile) };
  } catch (err: any) {
    console.error("[ACTION ERROR] createBusinessProfile:", err);
    return { success: false, error: err.message || "Failed to create business profile." };
  }
}

/**
 * Update an existing business profile with household tenant check.
 */
export async function updateBusinessProfile(
  id: string,
  input: Partial<CreateBusinessProfileInput>
): Promise<{ success: boolean; profile?: BusinessProfile; error?: string }> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to edit your business profile." };
  }

  try {
    const existing = await db.getBusinessProfileById(id);
    if (!existing) {
      return { success: false, error: "Business profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || existing.householdId !== household.id) {
      return { success: false, error: "You are not authorized to edit this business profile." };
    }

    const updated = await db.updateBusinessProfile(
      id,
      {
        ...input,
        // If rejected, re-editing puts it back into review
        status: existing.status === "rejected" ? "pending_review" : existing.status,
      },
      household.id
    );

    if (!updated) {
      return { success: false, error: "Failed to update business profile." };
    }

    return { success: true, profile: sanitizeBusinessProfile(updated) };
  } catch (err: any) {
    console.error("[ACTION ERROR] updateBusinessProfile:", err);
    return { success: false, error: err.message || "Error updating business profile." };
  }
}

/**
 * 1-click toggle between live and paused visibility.
 */
export async function toggleBusinessVisibility(id: string): Promise<{
  success: boolean;
  status?: "live" | "paused";
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to manage business visibility." };
  }

  try {
    const existing = await db.getBusinessProfileById(id);
    if (!existing) {
      return { success: false, error: "Business profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || existing.householdId !== household.id) {
      return { success: false, error: "You are not authorized to modify this business." };
    }

    if (existing.status === "pending_review") {
      return { success: false, error: "Business is pending administrative review and cannot be paused yet." };
    }

    if (existing.status === "rejected") {
      return { success: false, error: "Business application was rejected. Please edit and resubmit for review." };
    }

    const nextStatus = existing.status === "live" ? "paused" : "live";
    const ok = await db.setBusinessProfileStatus(id, nextStatus);
    if (!ok) {
      return { success: false, error: "Failed to update visibility state." };
    }

    return { success: true, status: nextStatus };
  } catch (err: any) {
    console.error("[ACTION ERROR] toggleBusinessVisibility:", err);
    return { success: false, error: err.message || "Failed to toggle visibility." };
  }
}

/**
 * Delete a business profile with household ownership verification.
 */
export async function deleteBusinessProfile(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: "Please log in to delete this listing." };
  }

  try {
    const existing = await db.getBusinessProfileById(id);
    if (!existing) {
      return { success: false, error: "Business profile not found." };
    }

    const household = await db.getHouseholdByContact(session.contact);
    if (!household || existing.householdId !== household.id) {
      return { success: false, error: "You are not authorized to delete this business profile." };
    }

    const ok = await db.deleteBusinessProfile(id, household.id);
    return { success: ok };
  } catch (err: any) {
    console.error("[ACTION ERROR] deleteBusinessProfile:", err);
    return { success: false, error: err.message || "Error deleting business profile." };
  }
}

/**
 * Retrieve public live business profiles with faceted filtering.
 */
export async function getLiveBusinessProfiles(filters: BusinessFilterInput = {}): Promise<{
  profiles: BusinessProfile[];
  totalCount: number;
}> {
  try {
    const result = await db.getLiveBusinessProfiles(filters);
    return {
      profiles: result.profiles.map(sanitizeBusinessProfile),
      totalCount: result.totalCount,
    };
  } catch (err) {
    console.error("[ACTION ERROR] getLiveBusinessProfiles:", err);
    return { profiles: [], totalCount: 0 };
  }
}

/**
 * Retrieve business profile by ID for showcase page.
 */
export async function getBusinessProfileById(id: string): Promise<{
  profile: BusinessProfile | null;
  isOwner?: boolean;
}> {
  try {
    const profile = await db.getBusinessProfileById(id);
    if (!profile) return { profile: null };

    // Check if the current viewer owns the business
    let isOwner = false;
    const session = await getSession();
    if (session?.contact) {
      const household = await db.getHouseholdByContact(session.contact);
      if (household && household.id === profile.householdId) {
        isOwner = true;
      }
    }

    // Only live profiles can be viewed by guests; owners can view pending/paused/rejected
    if (profile.status !== "live" && !isOwner) {
      return { profile: null };
    }

    return {
      profile: sanitizeBusinessProfile(profile),
      isOwner,
    };
  } catch (err) {
    console.error("[ACTION ERROR] getBusinessProfileById:", err);
    return { profile: null };
  }
}

/**
 * Retrieve all businesses belonging to the current user's household (for dashboard).
 */
export async function getMyHouseholdBusinesses(): Promise<{
  businesses: BusinessProfile[];
  canCreate: boolean;
  householdStatus?: string;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { businesses: [], canCreate: false, error: "Not authenticated" };
  }

  try {
    const household = await db.getHouseholdByContact(session.contact);
    if (!household) {
      return { businesses: [], canCreate: false, error: "Household not found" };
    }

    const businesses = await db.getBusinessProfilesByHouseholdId(household.id);
    const canCreate = household.status === "live" && businesses.length < 5;

    return {
      businesses: businesses.map(sanitizeBusinessProfile),
      canCreate,
      householdStatus: household.status,
    };
  } catch (err) {
    console.error("[ACTION ERROR] getMyHouseholdBusinesses:", err);
    return { businesses: [], canCreate: false, error: "Failed to fetch household businesses" };
  }
}
