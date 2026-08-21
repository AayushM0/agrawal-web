import { normalizePhoneNumber } from "@/lib/phone";
import { Pool } from "pg";
import type { Household, Member } from "../types/household";
import { initialMockHouseholds } from "../data/mockMembers";

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 4000,
      keepAlive: true,
    });
  } catch (err) {
    console.warn("Failed to initialize PG pool, using fallback store:", err);
  }
}

// In-memory fallback if DATABASE_URL is not set or queries fail
class FallbackStore {
  private households: Map<string, Household> = new Map();
  constructor() {
    initialMockHouseholds.forEach((h) => this.households.set(h.id, JSON.parse(JSON.stringify(h))));
  }
  async getHouseholds(): Promise<Household[]> { return Array.from(this.households.values()); }
  async getHouseholdById(id: string): Promise<Household | null> { return this.households.get(id) || null; }
  async getHouseholdByContact(contact: string): Promise<Household | null> {
    if (!contact) return null;
    const clean = contact.trim().toLowerCase();
    const isPhone = !clean.includes("@");
    const canonical = isPhone ? normalizePhoneNumber(clean) : clean;
    const last10 = clean.replace(/[^0-9]/g, "").slice(-10);

    for (const h of this.households.values()) {
      const hClean = h.verifiedContact.trim().toLowerCase();
      const hLast10 = hClean.replace(/[^0-9]/g, "").slice(-10);
      if (hClean === clean || hClean === canonical || (last10 && hLast10 === last10)) {
        return h;
      }
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
    const clean = memberId?.trim();
    if (!clean) return null;
    return all.find((m) => 
      m.id === clean || 
      m.id?.toString() === clean || 
      m.householdCode === clean || 
      m.householdCode?.replace('#', '') === clean ||
      (m.householdId && m.householdId.toString() === clean)
    ) || null;
  }
  async claimMember(memberId: string, contactInfo?: { phone?: string; email?: string }): Promise<boolean> {
    for (const h of this.households.values()) {
      const m = h.members.find((mem) => mem.id === memberId || (mem as any).id?.toString() === memberId);
      if (m) { 
        m.verifiedBySelf = true; 
        m.ownerLocked = true;
        if (contactInfo?.phone) m.phone = contactInfo.phone;
        if (contactInfo?.email) m.email = contactInfo.email;
        return true; 
      }
    }
    return false;
  }
  async checkContactExists(contact: string, excludeMemberId?: string): Promise<{ exists: boolean; type?: "head" | "member"; name?: string; householdCode?: string }> {
    const clean = (contact || "").trim().toLowerCase();
    if (!clean || clean.length < 5) return { exists: false };
    const digits = clean.replace(/[^0-9]/g, "");

    for (const h of this.households.values()) {
      const hContact = (h.verifiedContact || "").trim().toLowerCase();
      const hDigits = hContact.replace(/[^0-9]/g, "");
      if (hContact === clean || (digits.length >= 10 && hDigits.endsWith(digits.slice(-10)))) {
        return { exists: true, type: "head", name: h.headName, householdCode: h.householdCode };
      }
      for (const m of h.members) {
        if (excludeMemberId && (m.id === excludeMemberId || (m as any).id?.toString() === excludeMemberId)) {
          continue;
        }
        const mEmail = (m.email || "").trim().toLowerCase();
        const mPhone = (m.phone || "").trim().toLowerCase();
        const mDigits = mPhone.replace(/[^0-9]/g, "");
        if (mEmail === clean || (digits.length >= 10 && mDigits.endsWith(digits.slice(-10)))) {
          return { exists: true, type: "member", name: m.fullName, householdCode: h.householdCode };
        }
      }
    }
    return { exists: false };
  }
}

const fallbackStore = new FallbackStore();

// Safe helper to sanitize dates for PostgreSQL DATE columns
function sanitizeDate(dob?: string): string {
  if (!dob || !dob.trim()) {
    return "1990-01-01";
  }
  const clean = dob.trim();
  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  // If it's a 4 digit year e.g. "1995"
  if (/^\d{4}$/.test(clean)) {
    return `${clean}-01-01`;
  }
  // If it's an age number e.g. "28"
  if (/^\d{1,3}$/.test(clean)) {
    const age = parseInt(clean, 10);
    const year = new Date().getFullYear() - age;
    return `${year}-01-01`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return "1990-01-01";
}

// Safe helper to map extended relations into schema member_relation enum
function sanitizeRelation(rel?: string): "self" | "spouse" | "son" | "daughter" | "parent" | "other" {
  if (!rel) return "other";
  const r = rel.toLowerCase();
  if (r === "self") return "self";
  if (r === "spouse") return "spouse";
  if (r === "son") return "son";
  if (r === "daughter") return "daughter";
  if (r === "father" || r === "mother" || r === "parent") return "parent";
  return "other";
}

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
      console.warn("DB Error in getHouseholds, falling back to local store:", e);
      return fallbackStore.getHouseholds();
    }
  },

  async deleteHousehold(id: string): Promise<boolean> {
    if (!pool) return true;
    try {
      await pool.query("DELETE FROM households WHERE id = $1;", [id]);
      return true;
    } catch (e) {
      console.warn("DB Error in deleteHousehold:", e);
      return false;
    }
  },

  async getHouseholdByContact(contact: string): Promise<Household | null> {
    if (!contact) return null;
    const clean = contact.trim();
    const isPhone = !clean.includes("@");
    const canonical = isPhone ? normalizePhoneNumber(clean) : clean.toLowerCase();
    const rawDigits = clean.replace(/[^0-9]/g, "");
    const last10 = rawDigits.slice(-10);

    if (!pool) return fallbackStore.getHouseholdByContact(contact);
    try {
      const res = await pool.query(
        `SELECT * FROM households 
         WHERE verified_contact = $1 
            OR verified_contact = $2 
            OR verified_contact = $3 
            OR verified_contact LIKE $4
         LIMIT 1`,
        [clean, canonical, last10, `%${last10}`]
      );
      if (res.rows.length === 0) return fallbackStore.getHouseholdByContact(contact);
      const h = res.rows[0];
      const mRes = await pool.query(
        `SELECT id, household_id as "householdId", full_name as "fullName", relation_to_head as "relationToHead",
                dob, gender, marital_status as "maritalStatus", current_city as "currentCity",
                current_country as "currentCountry", profession_freetext as "profession", phone, email,
                father_name as "fatherName", photo_url as "photoUrl", bio,
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
      console.warn("DB Error in getHouseholdByContact, falling back to local store:", e);
      return fallbackStore.getHouseholdByContact(contact);
    }
  },

  async createHousehold(household: Household): Promise<Household> {
    // Always store in memory fallback as well to ensure immediate availability
    await fallbackStore.createHousehold(household);

    if (!pool) return household;
    
    let client;
    try {
      client = await pool.connect();
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
        const safeDob = sanitizeDate(m.dob);
        const safeRel = sanitizeRelation(m.relationToHead);

        const insertMQuery = `
          INSERT INTO members (
            id, household_id, full_name, relation_to_head, dob, gender, marital_status,
            current_city, current_country, profession_freetext, phone, email, father_name, photo_url, bio,
            visibility_contact, visibility_dob, visibility_photo, verified_by_self, owner_locked
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          );
        `;
        await client.query(insertMQuery, [
          dbHouseholdId,
          m.fullName,
          safeRel,
          safeDob,
          m.gender || "Male",
          m.maritalStatus || "Unmarried",
          m.currentCity || household.nativePlace,
          m.currentCountry || "India",
          m.profession || "Not specified",
          m.phone || null,
          m.email || null,
          m.fatherName || null,
          m.photoUrl || null,
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
      if (client) {
        try { await client.query("ROLLBACK"); } catch {}
      }
      console.warn("DB Error in createHousehold, seamlessly saved to memory fallback:", e);
      return household;
    } finally {
      if (client) client.release();
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
          m.phone, m.email, m.father_name as "fatherName", m.photo_url as "photoUrl", m.bio, m.verified_by_self as "verifiedBySelf",
          m.owner_locked as "ownerLocked", m.visibility_contact, m.visibility_dob, m.visibility_photo,
          h.household_code as "householdCode", h.gotra, h.native_place as "nativePlace", h.status as "householdStatus"
        FROM members m
        JOIN households h ON m.household_id = h.id;
      `;
      const res = await pool.query(query);
      if (res.rows.length === 0) return fallbackStore.getAllMembers();
      return res.rows.map(r => ({
        ...r,
        visibility: {
          contactInfo: r.visibility_contact,
          dob: r.visibility_dob,
          photo: r.visibility_photo,
        }
      }));
    } catch (e) {
      console.warn("DB Error in getAllMembers, using fallback store:", e);
      return fallbackStore.getAllMembers();
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
          m.phone, m.email, m.father_name as "fatherName", m.photo_url as "photoUrl", m.bio, m.verified_by_self as "verifiedBySelf",
          m.owner_locked as "ownerLocked", m.visibility_contact, m.visibility_dob, m.visibility_photo,
          h.household_code as "householdCode", h.gotra, h.native_place as "nativePlace", h.status as "householdStatus"
        FROM members m
        JOIN households h ON m.household_id = h.id
        WHERE m.id::text = $1 OR h.household_code = $1 OR h.id::text = $1;
      `;
      const res = await pool.query(query, [memberId]);
      if (res.rows.length === 0) return fallbackStore.getMemberById(memberId);
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
      console.warn("DB Error in getMemberById, using fallback store:", e);
      return fallbackStore.getMemberById(memberId);
    }
  },

  async approveAllPendingHouseholds(): Promise<number> {
    if (!pool) return fallbackStore.approveAllPendingHouseholds();
    try {
      const res = await pool.query(
        "UPDATE households SET status = 'live' WHERE status = 'pending_review' RETURNING id;"
      );
      fallbackStore.approveAllPendingHouseholds();
      return res.rowCount || 0;
    } catch (e) {
      console.warn("DB Error in approveAllPendingHouseholds, using fallback store:", e);
      return fallbackStore.approveAllPendingHouseholds();
    }
  },

  async updateHouseholdStatus(id: string, status: "pending_review" | "live" | "rejected", rejectionReason?: string) {
    if (!pool) return fallbackStore.updateHouseholdStatus(id, status, rejectionReason);
    try {
      const res = await pool.query(
        "UPDATE households SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *;",
        [status, rejectionReason || null, id]
      );
      fallbackStore.updateHouseholdStatus(id, status, rejectionReason);
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
      console.warn("DB Error in updateHouseholdStatus, using fallback:", e);
      return fallbackStore.updateHouseholdStatus(id, status, rejectionReason);
    }
  },

  async claimMember(memberId: string, contactInfo?: { phone?: string; email?: string }): Promise<boolean> {
    if (!pool) return fallbackStore.claimMember(memberId, contactInfo);
    try {
      const res = await pool.query(
        `UPDATE members 
         SET verified_by_self = true, 
             owner_locked = true,
             phone = COALESCE($2, phone),
             email = COALESCE($3, email)
         WHERE id::text = $1 OR id = $1
         RETURNING id;`,
        [memberId, contactInfo?.phone || null, contactInfo?.email ? contactInfo.email.trim().toLowerCase() : null]
      );
      fallbackStore.claimMember(memberId, contactInfo);
      if (res.rows.length === 0) return fallbackStore.claimMember(memberId, contactInfo);
      return true;
    } catch (e) {
      console.warn("DB Error in claimMember, using fallback:", e);
      return fallbackStore.claimMember(memberId, contactInfo);
    }
  },

  async checkContactExists(contact: string, excludeMemberId?: string): Promise<{ exists: boolean; type?: "head" | "member"; name?: string; householdCode?: string }> {
    if (!contact || contact.trim().length < 5) return { exists: false };
    const clean = contact.trim();
    const isEmail = clean.includes("@");
    const canonical = isEmail ? clean.toLowerCase() : normalizePhoneNumber(clean);
    const digitsOnly = clean.replace(/[^0-9]/g, "");
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    if (!pool) return fallbackStore.checkContactExists(contact, excludeMemberId);

    try {
      // 1. Check in households (verified_contact)
      const hRes = await pool.query(
        `SELECT id, household_code, head_name, verified_contact 
         FROM households 
         WHERE verified_contact = $1 OR verified_contact = $2 OR verified_contact LIKE $3
         LIMIT 1;`,
        [clean, canonical, `%${last10}`]
      );
      if (hRes.rows.length > 0) {
        const h = hRes.rows[0];
        return { exists: true, type: "head", name: h.head_name, householdCode: h.household_code };
      }

      // 2. Check in members (phone or email)
      const mRes = await pool.query(
        `SELECT m.id, m.full_name, h.household_code 
         FROM members m 
         JOIN households h ON m.household_id = h.id 
         WHERE (m.phone = $1 OR m.phone = $2 OR m.phone LIKE $3 OR LOWER(m.email) = LOWER($4))
           AND ($5::text IS NULL OR m.id::text != $5)
         LIMIT 1;`,
        [clean, canonical, `%${last10}`, canonical, excludeMemberId || null]
      );
      if (mRes.rows.length > 0) {
        const m = mRes.rows[0];
        return { exists: true, type: "member", name: m.full_name, householdCode: m.household_code };
      }

      return { exists: false };
    } catch (e) {
      console.warn("DB Error in checkContactExists, using fallback store:", e);
      return fallbackStore.checkContactExists(contact, excludeMemberId);
    }
  },
};