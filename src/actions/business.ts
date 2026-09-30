'use server';

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { sendMessage } from "@/actions/chat";
import type { BusinessProfile, LinkedDirector, BusinessCustomField, BusinessSocialLinks, ProfileActorType } from "@/types/business";
import { sanitizeSocialLinks } from "@/lib/external-url";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
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

function actorFromSession(session: NonNullable<Awaited<ReturnType<typeof getSession>>>): { type: ProfileActorType; id: string } {
  return { type: session.role === "admin" ? "admin" : "member", id: session.userId };
}

async function assertBusinessManager(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  business: BusinessProfile
): Promise<boolean> {
  await db.ensureBusinessProfileManager(business);
  const actor = actorFromSession(session);
  return db.isProfileManager(business.id, actor.type, actor.id);
}

/**
 * Sanitize business profile for public display, ensuring array defaults and visible commercial contacts.
 */
function sanitizeBusinessProfile(profile: BusinessProfile): BusinessProfile {
  return {
    ...profile,
    // Ensure array and object defaults
    photos: Array.isArray(profile.photos) ? profile.photos : [],
    customFields: Array.isArray(profile.customFields) ? profile.customFields : [],
    linkedDirectors: Array.isArray(profile.linkedDirectors)
      ? profile.linkedDirectors.map((d) => ({
          source: d.source || (d.memberId ? "directory" : "manual"),
          memberId: d.memberId,
          serialNo: d.serialNo,
          name: d.name,
          roleTitle: d.roleTitle,
          isPrimaryContact: Boolean(d.isPrimaryContact),
          phone: d.phone,
          email: d.email,
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
    let directors: LinkedDirector[] = Array.isArray(input.linkedDirectors)
      ? input.linkedDirectors.map((director) => ({ ...director, source: director.source || (director.memberId ? "directory" : "manual") }))
      : [];
    if (directors.length === 0) {
      // Default primary contact to author member
      directors = [
        {
          source: "directory",
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

    const primaryDirector = directors.find((director) => director.isPrimaryContact);
    if (!primaryDirector?.memberId || primaryDirector.source !== "directory") {
      return { success: false, error: "Choose a directory member as the primary contact for business inquiries." };
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
      contactPhone: input.contactPhone?.trim() || undefined,
      contactEmail: input.contactEmail?.trim() || undefined,
      whatsappNumber: input.whatsappNumber?.trim() || undefined,
      isVerifiedBadge: false,
      country: input.country?.trim() || "India",
      state: input.state.trim(),
      city: input.city.trim(),
      pincode: input.pincode?.trim() || undefined,
      addressLine: input.addressLine?.trim() || undefined,
      websiteUrl: input.websiteUrl?.trim() || undefined,
      socialLinks: sanitizeSocialLinks(input.socialLinks),
      photos: Array.isArray(input.photos) ? input.photos.slice(0, 3) : [],
      customFields: Array.isArray(input.customFields) ? input.customFields : [],
      linkedDirectors: directors,
    });

    const actor = actorFromSession(session);
    await db.setBusinessProfileManager({
      businessId: newProfile.id,
      creatorActorType: actor.type,
      creatorActorId: actor.id,
      managerActorType: actor.type,
      managerActorId: actor.id,
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

    if (!(await assertBusinessManager(session, existing))) {
      return { success: false, error: "You are not authorized to edit this business profile." };
    }

    const nextInput = { ...input };
    if (input.linkedDirectors !== undefined) {
      const directors = Array.isArray(input.linkedDirectors)
        ? input.linkedDirectors.map((director) => ({ ...director, source: director.source || (director.memberId ? "directory" : "manual") }))
        : [];
      const primary = directors.find((director) => director.isPrimaryContact);
      if (!primary?.memberId || primary.source !== "directory") {
        return { success: false, error: "Keep one directory member as the primary business contact." };
      }
      nextInput.linkedDirectors = directors;
    }

    const updated = await db.updateBusinessProfile(
      id,
      {
        ...nextInput,
        ...(nextInput.socialLinks !== undefined ? { socialLinks: sanitizeSocialLinks(nextInput.socialLinks) } : {}),
        // If rejected, re-editing puts it back into review
        status: existing.status === "rejected" ? "pending_review" : existing.status,
      },
      undefined
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

    if (!(await assertBusinessManager(session, existing))) {
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

    if (!(await assertBusinessManager(session, existing))) {
      return { success: false, error: "You are not authorized to delete this business profile." };
    }

    const ok = await db.deleteBusinessProfile(id);
    return { success: ok };
  } catch (err: any) {
    console.error("[ACTION ERROR] deleteBusinessProfile:", err);
    return { success: false, error: err.message || "Error deleting business profile." };
  }
}

/** Invite an activated directory member to become the sole business manager. */
export async function createBusinessManagerHandover(params: {
  businessId: string;
  targetMemberId: string;
}): Promise<{ success: boolean; handoverId?: string; error?: string }> {
  const session = await getSession();
  if (!session?.userId) return { success: false, error: "Please log in to hand over this business." };
  if (!UUID_REGEX.test(params.businessId) || !params.targetMemberId.trim() || params.targetMemberId.trim().length > 64) {
    return { success: false, error: "Choose a valid directory member and business profile." };
  }
  try {
    const business = await db.getBusinessProfileById(params.businessId);
    if (!business || !(await assertBusinessManager(session, business))) {
      return { success: false, error: "You are not authorized to hand over this business." };
    }
    const target = await db.getMemberById(params.targetMemberId.trim());
    if (!target || !target.ownerLocked) {
      return { success: false, error: "The selected member must have an activated profile before accepting management." };
    }
    const actor = actorFromSession(session);
    if (actor.type === "member" && actor.id === target.id) {
      return { success: false, error: "You already manage this business." };
    }
    const handover = await db.createBusinessManagerHandover({
      businessId: business.id,
      initiatedByActorType: actor.type,
      initiatedByActorId: actor.id,
      targetMemberId: target.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return { success: true, handoverId: handover.id };
  } catch (err) {
    console.error("[ACTION ERROR] createBusinessManagerHandover:", err);
    return { success: false, error: "Unable to create the management handover." };
  }
}

export async function cancelBusinessManagerHandover(handoverId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.userId) return { success: false, error: "Please log in to cancel this handover." };
  if (!UUID_REGEX.test(handoverId)) return { success: false, error: "This handover is no longer available to cancel." };
  try {
    const actor = actorFromSession(session);
    const success = await db.cancelBusinessManagerHandover(handoverId, actor.type, actor.id);
    return success ? { success: true } : { success: false, error: "This handover is no longer available to cancel." };
  } catch (err) {
    console.error("[ACTION ERROR] cancelBusinessManagerHandover:", err);
    return { success: false, error: "Unable to cancel the management handover." };
  }
}

export async function acceptBusinessManagerHandover(handoverId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.userId || session.role === "admin") return { success: false, error: "Please sign in as the invited member to accept this handover." };
  if (!UUID_REGEX.test(handoverId)) return { success: false, error: "This handover is invalid, expired, or no longer pending." };
  try {
    const member = await db.getMemberById(session.userId);
    if (!member?.ownerLocked) return { success: false, error: "Your member profile must be activated before accepting management." };
    const success = await db.acceptBusinessManagerHandover(handoverId, member.id);
    return success ? { success: true } : { success: false, error: "This handover is invalid, expired, or no longer pending." };
  } catch (err) {
    console.error("[ACTION ERROR] acceptBusinessManagerHandover:", err);
    return { success: false, error: "Unable to accept the management handover." };
  }
}

export async function getMyPendingBusinessManagerHandovers(): Promise<{ handovers: Array<{ id: string; businessId: string; businessName: string; expiresAt: string }> }> {
  const session = await getSession();
  if (!session?.userId || session.role === "admin") return { handovers: [] };
  const member = await db.getMemberById(session.userId);
  if (!member?.ownerLocked) return { handovers: [] };
  const handovers = await db.getPendingBusinessManagerHandoversForTarget(member.id);
  const resolved = await Promise.all(handovers.map(async (handover) => {
    const business = await db.getBusinessProfileById(handover.resourceId);
    return business ? { id: handover.id, businessId: business.id, businessName: business.businessName, expiresAt: handover.expiresAt } : null;
  }));
  return { handovers: resolved.filter((item): item is NonNullable<typeof item> => item !== null) };
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
  isAuthenticated?: boolean;
}> {
  try {
    const profile = await db.getBusinessProfileById(id);
    if (!profile) return { profile: null };

    // Check if the current viewer is the explicitly assigned manager.
    let isOwner = false;
    const session = await getSession();
    if (session?.userId) isOwner = await assertBusinessManager(session, profile);

    // Only live profiles can be viewed by guests; owners can view pending/paused/rejected
    if (profile.status !== "live" && !isOwner) {
      return { profile: null };
    }

    return {
      profile: sanitizeBusinessProfile(profile),
      isOwner,
      isAuthenticated: Boolean(session?.userId),
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
    const actor = actorFromSession(session);
    const canCreate = household.status === "live" && businesses.length < 5;

    return {
      businesses: await Promise.all(businesses.map(async (business) => {
        const assignment = await db.ensureBusinessProfileManager(business);
        const pending = await db.getPendingBusinessManagerHandover(business.id);
        return {
          ...sanitizeBusinessProfile(business),
          canManage: assignment.managerActorType === actor.type && assignment.managerActorId === actor.id,
          pendingHandover: pending ? { id: pending.id, targetMemberId: pending.targetMemberId, expiresAt: pending.expiresAt } : undefined,
        };
      })),
      canCreate,
      householdStatus: household.status,
    };
  } catch (err) {
    console.error("[ACTION ERROR] getMyHouseholdBusinesses:", err);
    return { businesses: [], canCreate: false, error: "Failed to fetch household businesses" };
  }
}

/**
 * Initiate commercial chat inquiry with an enterprise's primary contact director.
 */
export async function initiateBusinessChat(params: {
  businessId: string;
  initialMessage?: string;
}): Promise<{
  success: boolean;
  conversationId?: string;
  isGuest?: boolean;
  isSelf?: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session || !session.userId) {
    return {
      success: false,
      isGuest: true,
      error: "Please log in to contact this enterprise.",
    };
  }

  try {
    const business = await db.getBusinessProfileById(params.businessId);
    if (!business || business.status !== "live") {
      return {
        success: false,
        error: "Business profile not found or is currently not active.",
      };
    }

    if (!business.linkedDirectors || business.linkedDirectors.length === 0) {
      return {
        success: false,
        error: "This enterprise has no linked contact directors registered.",
      };
    }

    const primaryDirector =
      business.linkedDirectors.find((d) => d.isPrimaryContact) || business.linkedDirectors[0];

    // Resolve caller's effective member ID
    let callerMemberId = session.userId;
    if (session.contact) {
      const member = await db.getMemberByContact(session.contact);
      if (member?.id) {
        callerMemberId = member.id;
      }
    }

    // Disallow self-messaging if caller is the primary contact director
    if (callerMemberId === primaryDirector.memberId) {
      return {
        success: false,
        isSelf: true,
        error: "You cannot message yourself or initiate an inquiry with your own business.",
      };
    }

    // Also check if caller belongs to the same household
    if (session.contact) {
      const callerHousehold = await db.getHouseholdByContact(session.contact);
      if (callerHousehold && callerHousehold.id === business.householdId) {
        return {
          success: false,
          isSelf: true,
          error: "You cannot message yourself or initiate an inquiry with your own household's business.",
        };
      }
    }

    // Get or create conversation with the primary contact director
    const primaryMemberId = primaryDirector.memberId;
    if (!primaryMemberId || primaryDirector.source !== "directory") {
      return { success: false, error: "This business does not have an available directory contact." };
    }
    const conversation = await db.getOrCreateConversation(callerMemberId, primaryMemberId);

    // Format contextual business inquiry tag
    const inquiryPrefix = `[Business Inquiry: ${business.businessName}]`;
    const messageContent = params.initialMessage?.trim()
      ? `${inquiryPrefix} ${params.initialMessage.trim()}`
      : `${inquiryPrefix} Namaste! I am interested in connecting regarding ${business.businessName}.`;

    const sendRes = await sendMessage({
      recipientMemberId: primaryMemberId,
      messageBody: messageContent,
      conversationId: conversation.id,
    });

    if (!sendRes.success && sendRes.error) {
      return {
        success: false,
        error: sendRes.error,
      };
    }

    return {
      success: true,
      conversationId: conversation.id,
    };
  } catch (err: any) {
    console.error("[ACTION ERROR] initiateBusinessChat:", err);
    return {
      success: false,
      error: err.message || "Failed to initiate commercial chat.",
    };
  }
}

