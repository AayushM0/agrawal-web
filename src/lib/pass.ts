/**
 * Base URL and Pass Formatting Utilities
 * Resolves current deployment domain and unifies pass data construction for 100% PDF parity across Email and Web.
 */

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://agrawal-web.vercel.app";
}

export function formatRoleLabel(relationToHead?: string): string {
  if (!relationToHead) return "Member";
  const r = relationToHead.toLowerCase().trim();
  if (r === "self") return "Head of Household";
  if (r === "spouse") return "Spouse";
  if (r === "son") return "Son";
  if (r === "daughter") return "Daughter";
  if (r === "parent") return "Parent";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export interface PassDataInput {
  member: any;
  household?: any;
}

export function createUnifiedPassData({ member, household }: PassDataInput) {
  const serialNo =
    member.serialNo ||
    household?.serialNo ||
    member.householdCode ||
    household?.householdCode ||
    "MAFL-2026-IND-00001";

  const gotra = member.gotra || household?.gotra || "Garg";
  const householdCode = member.householdCode || household?.householdCode || serialNo;
  const currentCity =
    member.currentCity || household?.city || household?.nativePlace || member.nativePlace || "Delhi";
  const nativePlace = member.nativePlace || household?.nativePlace || currentCity;
  const fatherName = member.fatherName || household?.headName || undefined;

  return {
    fullName: member.fullName,
    gotra,
    householdCode,
    serialNo,
    currentCity,
    roleLabel: formatRoleLabel(member.relationToHead),
    photoUrl: member.photoUrl,
    nativePlace,
    fatherName,
  };
}
