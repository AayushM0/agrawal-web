'use server';

import { db } from "../lib/db";
import { getSession } from "./auth";
import { sanitizeMemberProfile } from "@/lib/privacy";

export interface SearchFilters {
  query?: string;
  gotra?: string;
  location?: string;
  nearMe?: boolean;
}

export async function searchDirectory(filters: SearchFilters) {
  const allMembers = await db.getAllMembers();

  // Filter only live approved households
  let results = allMembers.filter((m) => m.householdStatus === "live");

  // Filter by Gotra
  if (filters.gotra && filters.gotra !== "All") {
    results = results.filter((m) => m.gotra.toLowerCase() === filters.gotra!.toLowerCase());
  }

  // Filter by Location
  if (filters.location && filters.location !== "All") {
    const loc = filters.location.toLowerCase();
    results = results.filter(
      (m) =>
        m.currentCity.toLowerCase().includes(loc) ||
        m.currentCountry.toLowerCase().includes(loc)
    );
  }

  // Filter by Free-Text Query (matching name, profession, native place, city)
  if (filters.query && filters.query.trim()) {
    const q = filters.query.toLowerCase().trim();
    results = results.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.profession.toLowerCase().includes(q) ||
        m.nativePlace.toLowerCase().includes(q) ||
        m.currentCity.toLowerCase().includes(q)
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
    photoUrl: m.visibility.photo === "public_to_members" ? m.photoUrl : undefined,
    gotra: m.gotra,
    nativePlace: m.nativePlace,
    householdCode: m.householdCode,
    verifiedBySelf: m.verifiedBySelf,
  }));

  return {
    success: true,
    count: safeListResults.length,
    data: safeListResults,
  };
}

export async function getMemberProfile(memberId: string) {
  if (!memberId) return { success: false, error: "Member ID required." };
  const member = await db.getMemberById(memberId);
  if (!member) {
    return { success: false, error: "Member profile not found." };
  }
  const session = await getSession();
  const safeProfile = sanitizeMemberProfile(member, session);
  return {
    success: true,
    data: safeProfile,
  };
}
