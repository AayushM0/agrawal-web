import type { Member, Household } from "../types/household";

export const initialMockHouseholds: Household[] = [];

export const allMockMembers = initialMockHouseholds.flatMap((h) =>
  h.members.map((m) => ({
    ...m,
    householdCode: h.householdCode,
    gotra: h.gotra,
    nativePlace: h.nativePlace,
    householdStatus: h.status
  }))
);