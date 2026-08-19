import { Pool } from "pg";
import type { Household, Member } from "../types/household";
import { initialMockHouseholds } from "../data/mockMembers";

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

// In-memory fallback if DATABASE_URL is not set
class FallbackStore {
  private households: Map<string, Household> = new Map();
  constructor() {
    initialMockHouseholds.forEach((h) => this.households.set(h.id, JSON.parse(JSON.stringify(h))));
  }
  async getHouseholds(): Promise<Household[]> { return Array.from(this.households.values()); }
  async getHouseholdById(id: string): Promise<Household | null> { return this.households.get(id) || null; }
  async getHouseholdByContact(contact: string): Promise<Household | null> {
    for (const h of this.households.values()) {
      if (h.verifiedContact.trim() === contact.trim()) return h;
    }
    return null;
  }
  async createHousehold(household: Household): Promise<Household> {
    this.households.set(household.id, household);
    return household;
  }
  async updateHouseholdStatus(id: string, status: "pending_review" | "live" | "rejected", rejectionReason?: string): Promise<Household | null> {
    const h = this.households.get(id);
    if (!h) return null;
    h.status = status;
    if (rejectionReason) h.rejectionReason = rejectionReason;
    this.households.set(id, h);
    return h;
  }
  async getAllMembers(): Promise<any[]> {
    const results: any[] = [];
    for (const h of this.households.values()) {
      for (const m of h.members) {
        results.push({ ...m, householdCode: h.householdCode, gotra: h.gotra, nativePlace: h.nativePlace, householdStatus: h.status });
      }
    }
    return results;
  }
  async claimMember(memberId: string): Promise<boolean> {
    for (const h of this.households.values()) {
      const m = h.members.find((mem) => mem.id === memberId);
      if (m) { m.verifiedBySelf = true; m.ownerLocked = true; return true; }
    }
    return false;
  }
}

const fallbackStore = new FallbackStore();

export const db = {
  async getHouseholds(): Promise<Household[]> {
    if (!pool) return fallbackStore.getHouseholds();
    try {
      const res = await pool.query("SELECT * FROM households;");
      return res.rows.map(h => ({
        id: h.id,
        householdCode: h.household_code,
        headUserId: h.head_user_id,
        headName: h.head_name,
        nativePlace: h.native_place,
        gotra: h.gotra,
        status: h.status,
        verifiedContact: h.verified_contact,
        consentAcceptedAt: h.consent_accepted_at,
        createdAt: h.created_at,
        members: []
      }));
    } catch (e) {
      console.error("DB Error in getHouseholds:", e);
      return fallbackStore.getHouseholds();
    }
  },

  async deleteHousehold(id: string): Promise<boolean> {
    if (!pool) return true;
    try {
      await pool.query("DELETE FROM households WHERE id = $1;", [id]);
      return true;
    } catch (e) {
      console.error("DB Error in deleteHousehold:", e);
      return false;
    }
  },

  async getHouseholdByContact(contact: string): Promise<Household | null> {
    if (!pool) return fallbackStore.getHouseholdByContact(contact);
    try {
      const res = await pool.query(
        "SELECT * FROM households WHERE verified_contact = $1 LIMIT 1",
        [contact.trim()]
      );
      if (res.rows.length === 0) return null;
      const h = res.rows[0];
      return {
        id: h.id,
        householdCode: h.household_code,
        headUserId: h.head_user_id,
        headName: h.head_name,
        nativePlace: h.native_place,
        gotra: h.gotra,
        status: h.status,
        rejectionReason: h.rejection_reason || undefined,
        verifiedContact: h.verified_contact,
        consentAcceptedAt: h.consent_accepted_at,
        createdAt: h.created_at,
        members: [],
      };
    } catch (e) {
      console.error("DB Error in getHouseholdByContact, using fallback:", e);
      return fallbackStore.getHouseholdByContact(contact);
    }
  },

  async createHousehold(household: Household): Promise<Household> {
    if (!pool) return fallbackStore.createHousehold(household);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const insertHQuery = `
        INSERT INTO households (id, household_code, head_user_id, head_name, native_place, gotra, status, verified_contact, consent_accepted_at)
        VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `;
      const hRes = await client.query(insertHQuery, [
        household.householdCode,
        household.headName,
        household.nativePlace,
        household.gotra,
        household.status,
        household.verifiedContact,
        household.consentAcceptedAt || new Date().toISOString(),
      ]);
      const newHouseholdId = hRes.rows[0].id;

      for (const m of household.members) {
        const insertMQuery = `
          INSERT INTO members (
            household_id, full_name, relation_to_head, dob, gender, marital_status,
            current_city, current_country, profession_freetext, phone, email, bio,
            verified_by_self, owner_locked, visibility_contact, visibility_dob, visibility_photo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);
        `;
        await client.query(insertMQuery, [
          newHouseholdId,
          m.fullName,
          m.relationToHead,
          m.dob || "1990-01-01",
          m.gender,
          m.maritalStatus,
          m.currentCity,
          m.currentCountry,
          m.profession,
          m.phone || null,
          m.email || null,
          m.bio || null,
          m.verifiedBySelf || false,
          m.ownerLocked || false,
          m.visibility?.contactInfo || "members_only",
          m.visibility?.dob || "hidden",
          m.visibility?.photo || "public_to_members",
        ]);
      }

      await client.query("COMMIT");
      return { ...household, id: newHouseholdId };
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("DB Error in createHousehold, using fallback:", e);
      return fallbackStore.createHousehold(household);
    } finally {
      client.release();
    }
  },

  async getAllMembers(): Promise<any[]> {
    if (!pool) return fallbackStore.getAllMembers();
    try {
      const query = `
        SELECT 
          m.id, m.household_id, m.full_name as "fullName", m.relation_to_head as "relationToHead",
          m.dob, m.gender, m.marital_status as "maritalStatus", m.current_city as "currentCity",
          m.current_country as "currentCountry", m.profession_freetext as "profession",
          m.phone, m.email, m.photo_url as "photoUrl", m.bio, m.verified_by_self as "verifiedBySelf",
          m.owner_locked as "ownerLocked", m.visibility_contact, m.visibility_dob, m.visibility_photo,
          h.household_code as "householdCode", h.gotra, h.native_place as "nativePlace", h.status as "householdStatus"
        FROM members m
        JOIN households h ON m.household_id = h.id;
      `;
      const res = await pool.query(query);
      if (res.rows.length === 0) {
        // If DB is empty, use fallback records
        return fallbackStore.getAllMembers();
      }
      return res.rows.map(r => ({
        ...r,
        visibility: {
          contactInfo: r.visibility_contact,
          dob: r.visibility_dob,
          photo: r.visibility_photo,
        }
      }));
    } catch (e) {
      console.error("DB Error in getAllMembers, using fallback:", e);
      return fallbackStore.getAllMembers();
    }
  },

  async updateHouseholdStatus(id: string, status: "pending_review" | "live" | "rejected", rejectionReason?: string) {
    if (!pool) return fallbackStore.updateHouseholdStatus(id, status, rejectionReason);
    try {
      const res = await pool.query(
        "UPDATE households SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *;",
        [status, rejectionReason || null, id]
      );
      if (res.rows.length === 0) return fallbackStore.updateHouseholdStatus(id, status, rejectionReason);
      const h = res.rows[0];
      return {
        id: h.id,
        householdCode: h.household_code,
        headUserId: h.head_user_id,
        headName: h.head_name,
        nativePlace: h.native_place,
        gotra: h.gotra,
        status: h.status,
        verifiedContact: h.verified_contact,
        consentAcceptedAt: h.consent_accepted_at,
        createdAt: h.created_at,
        members: [],
      };
    } catch (e) {
      console.error("DB Error in updateHouseholdStatus, using fallback:", e);
      return fallbackStore.updateHouseholdStatus(id, status, rejectionReason);
    }
  },

  async claimMember(memberId: string): Promise<boolean> {
    if (!pool) return fallbackStore.claimMember(memberId);
    try {
      const res = await pool.query(
        "UPDATE members SET verified_by_self = true, owner_locked = true WHERE id = $1 RETURNING id;",
        [memberId]
      );
      if (res.rows.length === 0) return fallbackStore.claimMember(memberId);
      return true;
    } catch (e) {
      console.error("DB Error in claimMember, using fallback:", e);
      return fallbackStore.claimMember(memberId);
    }
  },
};