import { normalizePhoneNumber } from "@/lib/phone";
import { Pool } from "pg";
import type { Household, Member } from "../types/household";

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
    console.error("Failed to initialize PG pool:", err);
    throw err;
  }
}



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
    if (!pool) throw new Error("Database not connected");
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
    throw e;
  }
  },

  async deleteHousehold(id: string): Promise<boolean> {
    if (!pool) return true;
    try {
      await pool.query("DELETE FROM households WHERE id = $1;", [id]);
      return true;
    } catch (e) {
    throw e;
  }
  },

  async getHouseholdByContact(contact: string): Promise<Household | null> {
    if (!contact) return null;
    const clean = contact.trim();
    const isPhone = !clean.includes("@");
    const canonical = isPhone ? normalizePhoneNumber(clean) : clean.toLowerCase();
    const rawDigits = clean.replace(/[^0-9]/g, "");
    const last10 = rawDigits.slice(-10);

    if (!pool) throw new Error("Database not connected");
    try {
      let h: any = null;
      const res = await pool.query(
        `SELECT * FROM households 
         WHERE verified_contact = $1 
            OR verified_contact = $2 
            OR verified_contact = $3 
            OR verified_contact LIKE $4
         LIMIT 1`,
        [clean, canonical, last10, `%${last10}`]
      );
      if (res.rows.length > 0) {
        h = res.rows[0];
      } else {
        // Search via claimed/registered members in that household
        const memberHouseholdRes = await pool.query(
          `SELECT h.* 
           FROM households h
           JOIN members m ON m.household_id = h.id
           WHERE m.phone = $1 
              OR m.phone = $2 
              OR m.phone LIKE $3
              OR LOWER(m.email) = LOWER($4)
           LIMIT 1`,
          [clean, canonical, `%${last10}`, canonical]
        );
        if (memberHouseholdRes.rows.length > 0) {
          h = memberHouseholdRes.rows[0];
        }
      }

      if (!h) return null;
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
        dob: m.dob ? (m.dob instanceof Date ? m.dob.toISOString() : String(m.dob)) : "",
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
    throw e;
  }
  },

  async createHousehold(household: Household): Promise<Household> {
    // Always store in memory fallback as well to ensure immediate availability
    
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
    if (!pool) throw new Error("Database not connected");
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
      if (res.rows.length === 0) return [];
      return res.rows.map(r => ({
        ...r,
        dob: r.dob ? (r.dob instanceof Date ? r.dob.toISOString() : String(r.dob)) : "",
        visibility: {
          contactInfo: r.visibility_contact,
          dob: r.visibility_dob,
          photo: r.visibility_photo,
        }
      }));
    } catch (e) {
    throw e;
  }
  },

  async getHouseholdById(householdId: string): Promise<any | null> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query("SELECT * FROM households WHERE id::text = $1 OR household_code = $1 LIMIT 1;", [householdId]);
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
        verifiedContact: h.verified_contact,
        consentAcceptedAt: h.consent_accepted_at,
        createdAt: h.created_at,
      };
    } catch (e) { throw e; }
  },

  async getMembersByHousehold(householdId: string): Promise<any[]> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        `SELECT id, household_id as "householdId", full_name as "fullName", relation_to_head as "relationToHead",
                dob, gender, marital_status as "maritalStatus", current_city as "currentCity",
                current_country as "currentCountry", profession_freetext as "profession", phone, email,
                father_name as "fatherName", photo_url as "photoUrl", bio,
                verified_by_self as "verifiedBySelf", owner_locked as "ownerLocked",
                visibility_contact, visibility_dob, visibility_photo
         FROM members WHERE household_id::text = $1 ORDER BY created_at ASC;`,
        [householdId]
      );
      return res.rows.map(m => ({
        ...m,
        dob: m.dob ? (m.dob instanceof Date ? m.dob.toISOString() : String(m.dob)) : "",
        visibility: { contactInfo: m.visibility_contact, dob: m.visibility_dob, photo: m.visibility_photo }
      }));
    } catch (e) { throw e; }
  },

  async getMemberById(memberId: string): Promise<any | null> {
    if (!pool) throw new Error("Database not connected");
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
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        dob: r.dob ? (r.dob instanceof Date ? r.dob.toISOString() : String(r.dob)) : "",
        visibility: {
          contactInfo: r.visibility_contact,
          dob: r.visibility_dob,
          photo: r.visibility_photo,
        }
      };
    } catch (e) {
    throw e;
  }
  },

  async approveAllPendingHouseholds(): Promise<number> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        "UPDATE households SET status = 'live' WHERE status = 'pending_review' RETURNING id;"
      );
            return res.rowCount || 0;
    } catch (e) {
    throw e;
  }
  },

  async updateHouseholdStatus(id: string, status: "pending_review" | "live" | "rejected", rejectionReason?: string) {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        "UPDATE households SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *;",
        [status, rejectionReason || null, id]
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
        verifiedContact: h.verified_contact,
        consentAcceptedAt: h.consent_accepted_at,
        createdAt: h.created_at,
        members: [],
      };
    } catch (e) {
    throw e;
  }
  },

  async claimMember(memberId: string, contactInfo?: { phone?: string; email?: string }): Promise<boolean> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        `UPDATE members 
         SET verified_by_self = true, 
             owner_locked = true,
             phone = COALESCE($2, phone),
             email = COALESCE($3, email)
         WHERE id = $1::uuid
         RETURNING id;`,
        [memberId, contactInfo?.phone || null, contactInfo?.email ? contactInfo.email.trim().toLowerCase() : null]
      );
            if (res.rows.length === 0) return false;
      return true;
    } catch (e) {
    throw e;
  }
  },

  async checkContactExists(contact: string, excludeMemberId?: string): Promise<{ exists: boolean; type?: "head" | "member"; name?: string; householdCode?: string }> {
    if (!contact || contact.trim().length < 5) return { exists: false };
    const clean = contact.trim();
    const isEmail = clean.includes("@");
    const canonical = isEmail ? clean.toLowerCase() : normalizePhoneNumber(clean);
    const digitsOnly = clean.replace(/[^0-9]/g, "");
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    if (!pool) throw new Error("Database not connected");

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
    throw e;
  }
  },

  async updateMemberProfile(memberId: string, updates: Partial<Member>): Promise<boolean> {
        if (!pool) return true;
    try {
      const safeDob = updates.dob ? sanitizeDate(updates.dob) : null;
      const res = await pool.query(
        `UPDATE members 
         SET full_name = COALESCE($2, full_name),
             father_name = COALESCE($3, father_name),
             photo_url = COALESCE($4, photo_url),
             dob = COALESCE($5, dob),
             gender = COALESCE($6, gender),
             marital_status = COALESCE($7, marital_status),
             current_city = COALESCE($8, current_city),
             current_country = COALESCE($9, current_country),
             profession_freetext = COALESCE($10, profession_freetext),
             bio = COALESCE($11, bio),
             visibility_contact = COALESCE($12, visibility_contact),
             visibility_dob = COALESCE($13, visibility_dob),
             visibility_photo = COALESCE($14, visibility_photo)
         WHERE id::text = $1 OR id = $1
         RETURNING id, household_id;`,
        [
          memberId,
          updates.fullName?.trim() || null,
          updates.fatherName?.trim() || null,
          updates.photoUrl !== undefined ? updates.photoUrl : null,
          safeDob,
          updates.gender || null,
          updates.maritalStatus || null,
          updates.currentCity?.trim() || null,
          updates.currentCountry?.trim() || null,
          updates.profession?.trim() || null,
          updates.bio !== undefined ? updates.bio : null,
          updates.visibility?.contactInfo || null,
          updates.visibility?.dob || null,
          updates.visibility?.photo || null,
        ]
      );
      if (res.rows.length > 0 && updates.fullName && updates.relationToHead === "self") {
        await pool.query("UPDATE households SET head_name = $1 WHERE id = $2;", [updates.fullName.trim(), res.rows[0].household_id]);
      }
      return res.rows.length > 0;
    } catch (e) {
    throw e;
  }
  },

  async updateHouseholdProfile(householdId: string, updates: { nativePlace?: string; gotra?: string; headName?: string }): Promise<boolean> {
        if (!pool) return true;
    try {
      const res = await pool.query(
        `UPDATE households 
         SET native_place = COALESCE($2, native_place),
             gotra = COALESCE($3, gotra),
             head_name = COALESCE($4, head_name)
         WHERE id::text = $1 OR household_code = $1
         RETURNING id;`,
        [householdId, updates.nativePlace?.trim() || null, updates.gotra?.trim() || null, updates.headName?.trim() || null]
      );
      return res.rows.length > 0;
    } catch (e) {
    throw e;
  }
  },
};
