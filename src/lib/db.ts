import { Pool } from "pg";
import type { Household, Member } from "../types/household";
import { initialMockHouseholds } from "../data/mockMembers";

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 4000,
    keepAlive: true,
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
  async approveAllPendingHouseholds(): Promise<number> {
    let count = 0;
    for (const h of this.households.values()) {
      if (h.status === "pending_review") {
        h.status = "live";
        count++;
      }
    }
    return count;
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
  async getMemberById(memberId: string): Promise<any | null> {
    const all = await this.getAllMembers();
    return all.find((m) => m.id === memberId) || null;
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
      if (process.env.NODE_ENV === "production") throw e;
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
      const mRes = await pool.query(
        `SELECT id, household_id as "householdId", full_name as "fullName", relation_to_head as "relationToHead",
                dob, gender, marital_status as "maritalStatus", current_city as "currentCity",
                current_country as "currentCountry", profession_freetext as "profession", phone, email, bio,
                verified_by_self as "verifiedBySelf", owner_locked as "ownerLocked",
                visibility_contact, visibility_dob, visibility_photo
         FROM members WHERE household_id = $1 ORDER BY created_at ASC;`,
        [h.id]
      );
      const members = mRes.rows.map(m => ({
        ...m,
        visibility: {
          contactInfo: m.visibility_contact,
          dob: m.visibility_dob,
          photo: m.visibility_photo,
        }
      }));
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
        members,
      };
    } catch (e) {
      console.error("DB Error in getHouseholdByContact:", e);
      if (process.env.NODE_ENV === "production") throw e;
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
      const dbHouseholdId = hRes.rows[0].id;

      for (const m of household.members) {
        const insertMQuery = `
          INSERT INTO members (
            id, household_id, full_name, relation_to_head, dob, gender, marital_status,
            current_city, current_country, profession_freetext, phone, email, bio,
            visibility_contact, visibility_dob, visibility_photo, verified_by_self, owner_locked
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          );
        `;
        await client.query(insertMQuery, [
          dbHouseholdId,
          m.fullName,
          m.relationToHead,
          m.dob && m.dob.trim() ? m.dob : null,
          m.gender,
          m.maritalStatus,
          m.currentCity || household.nativePlace,
          m.currentCountry || "India",
          m.profession || null,
          m.phone || null,
          m.email || null,
          m.bio || null,
          m.visibility?.contactInfo || "members_only",
          m.visibility?.dob || "hidden",
          m.visibility?.photo || "public_to_members",
          m.verifiedBySelf || false,
          m.ownerLocked || false,
        ]);
      }

      await client.query("COMMIT");
      return { ...household, id: dbHouseholdId };
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("DB Error in createHousehold:", e);
      if (process.env.NODE_ENV === "production") throw e;
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
      return res.rows.map(r => ({
        ...r,
        visibility: {
          contactInfo: r.visibility_contact,
          dob: r.visibility_dob,
          photo: r.visibility_photo,
        }
      }));
    } catch (e) {
      console.error("DB Error in getAllMembers:", e);
      if (process.env.NODE_ENV === "production") throw e;
      return [];
    }
  },

  async getMemberById(memberId: string): Promise<any | null> {
    if (!pool) return fallbackStore.getMemberById(memberId);
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
        JOIN households h ON m.household_id = h.id
        WHERE m.id = $1 OR m.id::text = $1;
      `;
      const res = await pool.query(query, [memberId]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        visibility: {
          contactInfo: r.visibility_contact,
          dob: r.visibility_dob,
          photo: r.visibility_photo,
        }
      };
    } catch (e) {
      console.error("DB Error in getMemberById:", e);
      if (process.env.NODE_ENV === "production") throw e;
      return null;
    }
  },

  async approveAllPendingHouseholds(): Promise<number> {
    if (!pool) return fallbackStore.approveAllPendingHouseholds();
    try {
      const res = await pool.query(
        "UPDATE households SET status = 'live' WHERE status = 'pending_review' RETURNING id;"
      );
      return res.rowCount || 0;
    } catch (e) {
      console.error("DB Error in approveAllPendingHouseholds:", e);
      return 0;
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