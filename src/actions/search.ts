'use server';

import { db } from "../lib/db";
import { getSession } from "./auth";
import { sanitizeMemberProfile, extractBirthYear, calculateAge } from "@/lib/privacy";
import {
  sanitizeSearchString,
  sanitizeNameString,
  sanitizeAgeBound,
  sanitizeMaritalStatus,
} from "@/lib/sanitizer";
import { gotras } from "@/data/gotras";

// Valid canonical Gotras set for strict validation & SQLi prevention
const VALID_GOTRAS = new Set(gotras.map((g) => g.name.toLowerCase()));

// In-Memory Search Rate Limiter: Max 40 searches per minute per IP
const searchRateLimits = new Map<string, { count: number; expires: number }>();

function checkSearchRateLimit(ip: string): boolean {
  const now = Date.now();
  let record = searchRateLimits.get(ip);
  if (!record || now > record.expires) {
    record = { count: 0, expires: now + 60 * 1000 };
  }
  record.count += 1;
  searchRateLimits.set(ip, record);
  return record.count <= 40;
}

export interface SearchFilters {
  query?: string;
  name?: string;
  surname?: string;
  gotra?: string;
  profession?: string;
  location?: string;
  nativePlace?: string;
  minAge?: number | string;
  maxAge?: number | string;
  maritalStatus?: string;
  nearMe?: boolean;
}

export async function searchDirectory(filters: SearchFilters = {}) {
  try {
    let clientIp = "127.0.0.1";
    try {
      const { headers } = await import("next/headers");
      const reqHeaders = await headers();
      const forwardedFor = reqHeaders.get("x-forwarded-for");
      clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : reqHeaders.get("x-real-ip") || "127.0.0.1";
    } catch {}

    if (!checkSearchRateLimit(clientIp)) {
      return {
        success: false,
        error: "Rate limit exceeded. Please wait a moment before searching again.",
        count: 0,
        data: [],
      };
    }

    // 1. Strict Input Sanitization & Whitelist Validation for All Fields
    const cleanName = sanitizeNameString(filters.name, 40).toLowerCase();
    const cleanSurname = sanitizeNameString(filters.surname, 40).toLowerCase();

    const rawGotra = sanitizeSearchString(filters.gotra, 30).toLowerCase();
    const validGotra = rawGotra && rawGotra !== "all" && VALID_GOTRAS.has(rawGotra) ? rawGotra : null;

    const cleanProfession = sanitizeSearchString(filters.profession, 60).toLowerCase();
    const cleanLocation = sanitizeSearchString(filters.location, 60).toLowerCase();
    const validLocation = cleanLocation && cleanLocation !== "all" ? cleanLocation : null;

    const cleanNativePlace = sanitizeSearchString(filters.nativePlace, 60).toLowerCase();

    let cleanMinAge = sanitizeAgeBound(filters.minAge);
    let cleanMaxAge = sanitizeAgeBound(filters.maxAge);
    if (cleanMinAge !== null && cleanMaxAge !== null && cleanMinAge > cleanMaxAge) {
      [cleanMinAge, cleanMaxAge] = [cleanMaxAge, cleanMinAge];
    }

    const validMaritalStatus = sanitizeMaritalStatus(filters.maritalStatus);
    const cleanQuery = sanitizeSearchString(filters.query, 80).toLowerCase();

    const session = await getSession();
    const allMembers = await db.getAllMembers();

    // Filter only live approved households
    let results = allMembers.filter((m) => m.householdStatus === "live");

    // Exclude current logged-in member from directory results (hide self from search)
    if (session?.userId) {
      results = results.filter((m) => String(m.id) !== String(session.userId));
    }

    // Filter by Given Name
    if (cleanName) {
      results = results.filter((m) => {
        const full = (m.fullName || "").toLowerCase();
        return full.includes(cleanName);
      });
    }

    // Filter by Surname
    if (cleanSurname) {
      results = results.filter((m) => (m.fullName || "").toLowerCase().includes(cleanSurname));
    }

    // Filter by Gotra (Strict Whitelist Check)
    if (validGotra) {
      results = results.filter((m) => (m.gotra || "").toLowerCase() === validGotra);
    }

    // Filter by Profession / Specialization / Company
    if (cleanProfession) {
      results = results.filter(
        (m) =>
          (m.profession || "").toLowerCase().includes(cleanProfession) ||
          (m.professionTitle || "").toLowerCase().includes(cleanProfession) ||
          (m.professionDescription || "").toLowerCase().includes(cleanProfession) ||
          (m.companyName || "").toLowerCase().includes(cleanProfession)
      );
    }

    // Filter by Location (City, State, Country, Postal Code)
    if (validLocation) {
      results = results.filter(
        (m) =>
          (m.currentCity || "").toLowerCase().includes(validLocation) ||
          (m.state || "").toLowerCase().includes(validLocation) ||
          (m.currentCountry || "").toLowerCase().includes(validLocation) ||
          (m.postalCode || "").toLowerCase().includes(validLocation)
      );
    }

    // Filter by Native Place (Ancestral Village/City)
    if (cleanNativePlace) {
      results = results.filter((m) =>
        (m.nativePlace || "").toLowerCase().includes(cleanNativePlace)
      );
    }

    // Filter by Age Range (Biological calculation)
    if (cleanMinAge !== null || cleanMaxAge !== null) {
      results = results.filter((m) => {
        const age = calculateAge(m.dob);
        if (age === null) return false;
        if (cleanMinAge !== null && age < cleanMinAge) return false;
        if (cleanMaxAge !== null && age > cleanMaxAge) return false;
        return true;
      });
    }

    // Filter by Marital Status
    if (validMaritalStatus) {
      results = results.filter(
        (m) => (m.maritalStatus || "").toLowerCase() === validMaritalStatus
      );
    }

    // Filter by Legacy Free-Text Query (if supplied)
    if (cleanQuery) {
      results = results.filter(
        (m) =>
          (m.fullName || "").toLowerCase().includes(cleanQuery) ||
          (m.profession || "").toLowerCase().includes(cleanQuery) ||
          (m.professionTitle || "").toLowerCase().includes(cleanQuery) ||
          (m.companyName || "").toLowerCase().includes(cleanQuery) ||
          (m.nativePlace || "").toLowerCase().includes(cleanQuery) ||
          (m.currentCity || "").toLowerCase().includes(cleanQuery)
      );
    }

    // Privacy Protection at Query Boundary (TRD §6):
    // Strip raw phone, email, and exact DOB from list results regardless of member settings
    const safeListResults = results.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      relationToHead: m.relationToHead,
      gender: m.gender,
      maritalStatus: m.maritalStatus,
      currentCity: m.currentCity,
      currentCountry: m.currentCountry,
      profession: m.profession,
      professionTitle: m.professionTitle,
      companyName: m.companyName,
      photoUrl: m.visibility?.photo === "hidden" || m.visibility_photo === "hidden" ? undefined : m.photoUrl,
      gotra: m.gotra,
      birthYear: extractBirthYear(m.dob),
      age: calculateAge(m.dob),
      nativePlace: m.nativePlace,
      householdCode: m.householdCode,
      serialNo: m.serialNo,
      verifiedBySelf: m.verifiedBySelf,
      isGovtIdVerified: Boolean(m.aadhaarNumber || m.panNumber || m.passportNumber || m.govtIdNumber || m.isGovtIdVerified),
    }));

    // Enforce anti-scraping cap (max 60 results returned in single batch)
    const cappedResults = safeListResults.slice(0, 60);

    return {
      success: true,
      count: safeListResults.length,
      data: cappedResults,
    };
  } catch (err) {
    console.error("[DIRECTORY SEARCH ERROR]", err);
    // Generic error handling (Never leak 500 internals to client)
    return {
      success: false,
      error: "Unable to process directory search at this time.",
      count: 0,
      data: [],
    };
  }
}

export async function getMemberProfile(memberId: string) {
  if (!memberId || typeof memberId !== "string") {
    return { success: false, error: "Member ID required." };
  }
  const cleanId = memberId.trim();
  if (!/^[a-zA-Z0-9_-]{3,64}$/.test(cleanId)) {
    return { success: false, error: "Invalid member identifier format." };
  }
  try {
    const member = await db.getMemberById(cleanId);
    if (!member) {
      return { success: false, error: "Member profile not found." };
    }
    const session = await getSession();
    const safeProfile: any = sanitizeMemberProfile(member, session);
    try {
      const matProfile = await db.getMatrimonialProfileByMemberId(member.id);
      if (matProfile && matProfile.status === "active") {
        safeProfile.matrimonialProfileId = matProfile.id;
      }
    } catch {}
    return {
      success: true,
      data: safeProfile,
    };
  } catch (err) {
    console.error("[MEMBER PROFILE ERROR]", err);
    return {
      success: false,
      error: "Unable to load member profile.",
    };
  }
}
