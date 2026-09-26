"use server";

import { getSession } from "./session";
import { db } from "@/lib/db";
import type { CareerLevel, SeekingStatus, WorkplacePreference, PrimaryDomain } from "@/types/career";
import type { BusinessProfile, LinkedDirector } from "@/types/business";

/**
 * Format and sanitize external URLs to ensure absolute https:// protocol
 */
function normalizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return undefined;
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export interface AdminSearchMemberResult {
  id: string;
  householdId: string;
  fullName: string;
  serialNo?: string;
  gender: string;
  dob?: string;
  maritalStatus?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  currentCity?: string;
  state?: string;
  fatherName?: string;
  gotra: string;
  nativePlace?: string;
  householdCode?: string;
  householdSerialNo?: string;
  householdStatus: string;
  hasMatrimonyProfile: boolean;
  hasCareerProfile: boolean;
}

/**
 * Admin action: Universal search across community members for delegated profile creation.
 */
export async function searchMembersForAdminAction(
  query: string
): Promise<{ success: boolean; members: AdminSearchMemberResult[]; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session?.role !== "admin") {
      return { success: false, members: [], error: "Unauthorized: Administrator access required." };
    }

    const cleanQuery = (query || "").trim();
    const isBlank = cleanQuery.length === 0;
    const filterLike = `%${cleanQuery}%`;

    // Query members joined with households
    const pool = (db as any).getPool ? (db as any).getPool() : null;
    if (!pool) {
      // In-memory fallback
      const households = (await db.getHouseholds()) || [];
      const results: AdminSearchMemberResult[] = [];
      for (const h of households) {
        for (const m of h.members || []) {
          const match =
            isBlank ||
            m.fullName?.toLowerCase().includes(cleanQuery.toLowerCase()) ||
            m.serialNo?.toLowerCase().includes(cleanQuery.toLowerCase()) ||
            h.gotra?.toLowerCase().includes(cleanQuery.toLowerCase()) ||
            h.householdCode?.toLowerCase().includes(cleanQuery.toLowerCase()) ||
            m.phone?.includes(cleanQuery);
          if (match) {
            results.push({
              id: m.id,
              householdId: h.id,
              fullName: m.fullName,
              serialNo: m.serialNo,
              gender: m.gender || "male",
              dob: m.dob,
              maritalStatus: m.maritalStatus,
              phone: m.phone,
              email: m.email,
              photoUrl: m.photoUrl,
              currentCity: m.currentCity || h.city,
              state: m.state || h.state,
              fatherName: m.fatherName,
              gotra: h.gotra,
              nativePlace: h.nativePlace,
              householdCode: h.householdCode,
              householdSerialNo: h.serialNo,
              householdStatus: h.status,
              hasMatrimonyProfile: false,
              hasCareerProfile: false,
            });
          }
        }
      }
      return { success: true, members: results.slice(0, 30) };
    }

    const sql = `
      SELECT 
        m.id, 
        m.household_id as "householdId", 
        m.full_name as "fullName", 
        m.serial_no as "serialNo",
        m.gender, 
        m.dob, 
        m.marital_status as "maritalStatus", 
        m.phone, 
        m.email, 
        m.photo_url as "photoUrl",
        m.current_city as "currentCity", 
        m.state, 
        m.father_name as "fatherName",
        h.gotra, 
        h.native_place as "nativePlace", 
        h.household_code as "householdCode", 
        h.serial_no as "householdSerialNo",
        h.status as "householdStatus",
        EXISTS(SELECT 1 FROM matrimonial_profiles mp WHERE mp.member_id = m.id) as "hasMatrimonyProfile",
        EXISTS(SELECT 1 FROM career_profiles cp WHERE cp.member_id = m.id) as "hasCareerProfile"
      FROM members m
      JOIN households h ON m.household_id = h.id
      WHERE 
        ($1 = true OR 
         m.full_name ILIKE $2 OR 
         m.serial_no ILIKE $2 OR 
         m.phone ILIKE $2 OR 
         h.gotra ILIKE $2 OR 
         h.household_code ILIKE $2 OR
         h.serial_no ILIKE $2)
      ORDER BY m.full_name ASC
      LIMIT 30;
    `;

    const res = await pool.query(sql, [isBlank, filterLike]);
    const members: AdminSearchMemberResult[] = res.rows.map((r: any) => ({
      ...r,
      dob: r.dob ? (r.dob instanceof Date ? r.dob.toISOString().split("T")[0] : String(r.dob)) : undefined,
      hasMatrimonyProfile: Boolean(r.hasMatrimonyProfile),
      hasCareerProfile: Boolean(r.hasCareerProfile),
    }));

    return { success: true, members };
  } catch (err: any) {
    console.error("[ADMIN PROFILES ERROR] searchMembersForAdminAction:", err);
    return { success: false, members: [], error: "Failed to search community members." };
  }
}

// -------------------------------------------------------------
// 1. ADMIN CREATE MATRIMONIAL PROFILE
// -------------------------------------------------------------
export interface AdminCreateMatrimonyInput {
  memberId: string;
  highestEducation: string;
  degreeName?: string;
  collegeName?: string;
  employmentSector: string;
  occupationTitle: string;
  companyName?: string;
  annualIncome?: string;
  workCity?: string;
  workCountry?: string;
  fatherName: string;
  fatherOccupation?: string;
  motherName: string;
  motherOccupation?: string;
  nativePlace?: string;
  familyLocation?: string;
  familyValues?: string;
  aboutMe?: string;
  aboutFamily?: string;
  heightCm?: number;
  diet?: string;
  photos?: string[];
  partnerPreferences?: any;
}

export async function adminCreateMatrimonyProfileAction(
  input: AdminCreateMatrimonyInput
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session?.role !== "admin") {
      return { success: false, error: "Unauthorized: Administrator access required." };
    }

    if (!input.memberId) {
      return { success: false, error: "Please select a candidate member." };
    }

    const member = await db.getMemberById(input.memberId);
    if (!member) {
      return { success: false, error: "Selected member record was not found in directory." };
    }

    // Check duplicate
    const existing = await db.getMatrimonialProfileByMemberId(input.memberId);
    if (existing) {
      return {
        success: false,
        error: `A matrimonial profile already exists for ${member.fullName}. Profile ID: ${existing.id}`,
      };
    }

    // Required fields check
    if (!input.highestEducation?.trim()) {
      return { success: false, error: "Highest Education is required." };
    }
    if (!input.employmentSector?.trim()) {
      return { success: false, error: "Employment Sector is required." };
    }
    if (!input.occupationTitle?.trim()) {
      return { success: false, error: "Occupation Title is required." };
    }
    if (!input.fatherName?.trim()) {
      return { success: false, error: "Father's Name is required." };
    }
    if (!input.motherName?.trim()) {
      return { success: false, error: "Mother's Name is required." };
    }

    const profile = await db.createMatrimonialProfile({
      householdId: member.household_id || member.householdId,
      memberId: member.id,
      createdByUserId: session.userId || "admin",
      status: "active",
      gender: member.gender || "male",
      fullName: member.fullName,
      createdFor: "Community Admin Delegated",
      maritalStatus: member.maritalStatus || "Never Married",
      dob: member.dob || "2000-01-01",
      gotra: member.gotra,
      nativePlace: input.nativePlace || member.nativePlace,
      highestEducation: input.highestEducation.trim(),
      degreeName: input.degreeName?.trim() || null,
      collegeName: input.collegeName?.trim() || null,
      employmentSector: input.employmentSector.trim(),
      occupationTitle: input.occupationTitle.trim(),
      companyName: input.companyName?.trim() || null,
      annualIncome: input.annualIncome?.trim() || null,
      workCity: input.workCity?.trim() || member.currentCity,
      workCountry: input.workCountry?.trim() || "Singapore",
      fatherName: input.fatherName.trim(),
      fatherOccupation: input.fatherOccupation?.trim() || null,
      motherName: input.motherName.trim(),
      motherOccupation: input.motherOccupation?.trim() || null,
      familyLocation: input.familyLocation?.trim() || member.currentCity,
      familyValues: input.familyValues || "Moderate",
      aboutMe: input.aboutMe?.trim() || null,
      aboutFamily: input.aboutFamily?.trim() || null,
      heightCm: input.heightCm || 170,
      diet: input.diet || "Vegetarian",
      photos: input.photos && input.photos.length > 0 ? input.photos : (member.photoUrl ? [member.photoUrl] : []),
      partnerPreferences: input.partnerPreferences || {},
      contactPerson: member.fullName,
      contactPhone: member.phone || "",
      contactEmail: member.email || "",
      residentialAddress: member.fullAddress || member.currentCity,
    });

    await db.recordAdminAuditLog({
      adminId: session.userId || "admin",
      adminContact: session.contact || "admin",
      action: "ADMIN_CREATE_MATRIMONY_PROFILE",
      targetType: "matrimonial_profile",
      targetId: profile.id,
      details: `Admin created matrimonial profile for member ${member.fullName} (${member.id})`,
    });

    return { success: true, profileId: profile.id };
  } catch (err: any) {
    console.error("[ADMIN PROFILES ERROR] adminCreateMatrimonyProfileAction:", err);
    return { success: false, error: err.message || "Failed to create matrimonial profile." };
  }
}

// -------------------------------------------------------------
// 2. ADMIN CREATE CAREER PROFILE
// -------------------------------------------------------------
export interface AdminCreateCareerInput {
  memberId: string;
  headline: string;
  careerLevel: CareerLevel;
  primaryDomain: string;
  currentCompany?: string;
  currentDesignation?: string;
  yearsOfExperience: number;
  educationHighest?: string;
  educationInstitution?: string;
  skills: string[];
  seekingStatus: SeekingStatus;
  preferredLocations?: string[];
  workplacePreference?: WorkplacePreference;
  portfolioUrl?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  bio?: string;
  isMentorAvailable?: boolean;
  isConfidentialMode?: boolean;
}

export async function adminCreateCareerProfileAction(
  input: AdminCreateCareerInput
): Promise<{ success: boolean; profile?: any; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session?.role !== "admin") {
      return { success: false, error: "Unauthorized: Administrator access required." };
    }

    if (!input.memberId) {
      return { success: false, error: "Please select a candidate member." };
    }

    const member = await db.getMemberById(input.memberId);
    if (!member) {
      return { success: false, error: "Selected member was not found." };
    }

    // Check duplicate
    const existing = await db.getCareerProfileByMemberId(input.memberId);
    if (existing) {
      return {
        success: false,
        error: `A career profile already exists for ${member.fullName}. Profile ID: ${existing.id}`,
      };
    }

    if (!input.headline || input.headline.trim().length < 5) {
      return { success: false, error: "Headline must be at least 5 characters." };
    }
    if (!input.primaryDomain) {
      return { success: false, error: "Please select a primary professional domain." };
    }

    const cleanSkills = Array.isArray(input.skills)
      ? input.skills.map((s) => s.trim()).filter(Boolean)
      : [];

    const cleanLocations = Array.isArray(input.preferredLocations)
      ? input.preferredLocations.map((l) => l.trim()).filter(Boolean)
      : [];

    const profile = await db.createCareerProfile({
      householdId: member.household_id || member.householdId,
      memberId: member.id,
      headline: input.headline.trim(),
      careerLevel: input.careerLevel || "mid_level",
      primaryDomain: input.primaryDomain as PrimaryDomain,
      currentCompany: input.currentCompany?.trim() || undefined,
      currentDesignation: input.currentDesignation?.trim() || undefined,
      yearsOfExperience: Math.max(0, Number(input.yearsOfExperience) || 0),
      educationHighest: input.educationHighest?.trim() || undefined,
      educationInstitution: input.educationInstitution?.trim() || undefined,
      skills: cleanSkills,
      seekingStatus: input.seekingStatus || "open_to_offers",
      preferredLocations: cleanLocations,
      workplacePreference: input.workplacePreference || "flexible",
      portfolioUrl: normalizeUrl(input.portfolioUrl),
      linkedinUrl: normalizeUrl(input.linkedinUrl),
      resumeUrl: normalizeUrl(input.resumeUrl),
      bio: input.bio?.trim() || undefined,
      isMentorAvailable: Boolean(input.isMentorAvailable),
      isConfidentialMode: Boolean(input.isConfidentialMode),
    });

    await db.recordAdminAuditLog({
      adminId: session.userId || "admin",
      adminContact: session.contact || "admin",
      action: "ADMIN_CREATE_CAREER_PROFILE",
      targetType: "career_profile",
      targetId: profile.id,
      details: `Admin created career profile for member ${member.fullName} (${member.id})`,
    });

    return { success: true, profile };
  } catch (err: any) {
    console.error("[ADMIN PROFILES ERROR] adminCreateCareerProfileAction:", err);
    return { success: false, error: err.message || "Failed to create career profile." };
  }
}

// -------------------------------------------------------------
// 3. ADMIN CREATE BUSINESS ENTERPRISE PROFILE
// -------------------------------------------------------------
export interface AdminCreateBusinessInput {
  createdByMemberId: string;
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
  awardVerifiedBadge?: boolean;
  country: string;
  state: string;
  city: string;
  pincode?: string;
  addressLine?: string;
  websiteUrl?: string;
  photos?: string[];
  linkedDirectors?: LinkedDirector[];
}

export async function adminCreateBusinessProfileAction(
  input: AdminCreateBusinessInput
): Promise<{ success: boolean; businessId?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session?.role !== "admin") {
      return { success: false, error: "Unauthorized: Administrator access required." };
    }

    if (!input.createdByMemberId) {
      return { success: false, error: "Please select a community member as primary owner/contact." };
    }

    const member = await db.getMemberById(input.createdByMemberId);
    if (!member) {
      return { success: false, error: "Selected member was not found." };
    }

    if (!input.businessName || input.businessName.trim().length < 2) {
      return { success: false, error: "Business name must be at least 2 characters." };
    }
    if (!input.industrySector) {
      return { success: false, error: "Please select an industry sector." };
    }
    if (!input.businessType) {
      return { success: false, error: "Please select a business type." };
    }
    if (!input.aboutBusiness || input.aboutBusiness.trim().length < 10) {
      return { success: false, error: "Please provide a description of at least 10 characters." };
    }

    const linkedDirectors: LinkedDirector[] = Array.isArray(input.linkedDirectors) && input.linkedDirectors.length > 0
      ? input.linkedDirectors
      : [
          {
            memberId: member.id,
            name: member.fullName,
            roleTitle: "Founder / Managing Director",
            isPrimaryContact: true,
            serialNo: member.serialNo,
          },
        ];

    const business = await db.createBusinessProfile({
      householdId: member.household_id || member.householdId,
      createdByMemberId: member.id,
      status: "live", // Admin creates it live directly
      businessName: input.businessName.trim(),
      legalName: input.legalName?.trim() || undefined,
      tagline: input.tagline?.trim() || undefined,
      industrySector: input.industrySector,
      businessType: input.businessType,
      yearEstablished: input.yearEstablished ? Number(input.yearEstablished) : undefined,
      aboutBusiness: input.aboutBusiness.trim(),
      offeringsSummary: input.offeringsSummary?.trim() || undefined,
      registrationType: input.registrationType || undefined,
      registrationNumber: input.registrationNumber?.trim() || undefined,
      isVerifiedBadge: Boolean(input.awardVerifiedBadge),
      country: input.country || member.currentCountry || "Singapore",
      state: input.state || member.state || "Central Singapore",
      city: input.city || member.currentCity || "Singapore",
      pincode: input.pincode?.trim() || undefined,
      addressLine: input.addressLine?.trim() || undefined,
      websiteUrl: normalizeUrl(input.websiteUrl),
      socialLinks: {},
      photos: Array.isArray(input.photos) ? input.photos.filter(Boolean) : [],
      customFields: [],
      linkedDirectors,
    });

    await db.recordAdminAuditLog({
      adminId: session.userId || "admin",
      adminContact: session.contact || "admin",
      action: "ADMIN_CREATE_BUSINESS_PROFILE",
      targetType: "business_profile",
      targetId: business.id,
      details: `Admin created business profile "${business.businessName}" (${business.id}) for member ${member.fullName}`,
    });

    return { success: true, businessId: business.id };
  } catch (err: any) {
    console.error("[ADMIN PROFILES ERROR] adminCreateBusinessProfileAction:", err);
    return { success: false, error: err.message || "Failed to create business profile." };
  }
}
