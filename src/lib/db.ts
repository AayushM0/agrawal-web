import type { Household, Member } from "../types/household";
import { initialMockHouseholds } from "../data/mockMembers";

// In-Memory Database Store (with full schema fidelity for dev/serverless actions)
class DatabaseStore {
  private households: Map<string, Household> = new Map();

  constructor() {
    // Populate with initial verified households
    initialMockHouseholds.forEach((h) => this.households.set(h.id, JSON.parse(JSON.stringify(h))));
  }

  // Households
  async getHouseholds(): Promise<Household[]> {
    return Array.from(this.households.values());
  }

  async getHouseholdById(id: string): Promise<Household | null> {
    return this.households.get(id) || null;
  }

  async getHouseholdByContact(contact: string): Promise<Household | null> {
    for (const h of this.households.values()) {
      if (h.verifiedContact.trim() === contact.trim()) {
        return h;
      }
    }
    return null;
  }

  async createHousehold(household: Household): Promise<Household> {
    this.households.set(household.id, household);
    return household;
  }

  async updateHouseholdStatus(
    id: string,
    status: "pending_review" | "live" | "rejected",
    rejectionReason?: string
  ): Promise<Household | null> {
    const h = this.households.get(id);
    if (!h) return null;
    h.status = status;
    if (rejectionReason) h.rejectionReason = rejectionReason;
    this.households.set(id, h);
    return h;
  }

  // Members
  async getAllMembers(): Promise<(Member & { householdCode: string; gotra: string; nativePlace: string; householdStatus: string })[]> {
    const results: any[] = [];
    for (const h of this.households.values()) {
      for (const m of h.members) {
        results.push({
          ...m,
          householdCode: h.householdCode,
          gotra: h.gotra,
          nativePlace: h.nativePlace,
          householdStatus: h.status,
        });
      }
    }
    return results;
  }

  async claimMember(memberId: string): Promise<boolean> {
    for (const h of this.households.values()) {
      const m = h.members.find((mem) => mem.id === memberId);
      if (m) {
        m.verifiedBySelf = true;
        m.ownerLocked = true;
        return true;
      }
    }
    return false;
  }
}

// Global Singleton to maintain state across Server Actions in development
const globalForDb = globalThis as unknown as { dbStore?: DatabaseStore };
export const db = globalForDb.dbStore || new DatabaseStore();
if (process.env.NODE_ENV !== "production") globalForDb.dbStore = db;