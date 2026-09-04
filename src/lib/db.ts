import { normalizePhoneNumber } from "@/lib/phone";
import { Pool } from "pg";
import type { Household, Member } from "../types/household";

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
    });
    pool.on("error", (err) => {
      console.warn("PostgreSQL idle client notice:", err.message);
    });

    // Proactively run schema migrations on pool initialization to ensure all tables exist
    pool.connect().then(async (client) => {
      try {
        await ensureSchema(client);
      } catch (err) {
        console.error("Failed to run schema migrations on pool startup:", err);
      } finally {
        client.release();
      }
    }).catch(err => {
      console.error("Failed to connect to database for startup migrations:", err);
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

let schemaEnsured = false;
async function ensureSchema(client: any) {
  if (schemaEnsured) return;
  try {
    await client.query(`
      ALTER TABLE households ADD COLUMN IF NOT EXISTS serial_no VARCHAR(32) UNIQUE;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
      ALTER TABLE households ADD COLUMN IF NOT EXISTS postal_code TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS full_address TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS pan_number TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS passport_number TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS govt_id_number TEXT;

      ALTER TABLE members ADD COLUMN IF NOT EXISTS profession_title TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS profession_description TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS company_name TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS anniversary_date TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS postal_code TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS full_address TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS passport_number TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS govt_id_number TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;

      ALTER TABLE households ADD COLUMN IF NOT EXISTS password_hash TEXT;

      CREATE TABLE IF NOT EXISTS login_attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          identifier VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          success BOOLEAN NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts (identifier, ip_address, created_at DESC);

      CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          initiator_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          recipient_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          last_message_at TIMESTAMPTZ DEFAULT NOW(),
          last_message_preview TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT unique_conversation_pair UNIQUE (initiator_id, recipient_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          recipient_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          message_body TEXT NOT NULL,
          is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
          flag_reason TEXT,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS message_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          reporter_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          reported_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          offending_message_id UUID REFERENCES messages(id),
          reason VARCHAR(50) NOT NULL,
          details TEXT,
          snapshot_data JSONB,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      DO $$ 
      BEGIN 
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
      EXCEPTION WHEN OTHERS THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS otp_rate_limits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ip_address VARCHAR(45) NOT NULL,
          recipient VARCHAR(150) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_ip_created ON otp_rate_limits(ip_address, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_recipient_created ON otp_rate_limits(recipient, created_at DESC);

      CREATE TABLE IF NOT EXISTS admin_login_attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ip_address VARCHAR(45) NOT NULL,
          success BOOLEAN NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_admin_login_ip_created ON admin_login_attempts(ip_address, created_at DESC);

      -- Enable RLS on all tables (Supabase advisor fix)
      ALTER TABLE households ENABLE ROW LEVEL SECURITY;
      ALTER TABLE members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

      -- Allow SELECT to anon for Realtime web-socket updates (restricted to Realtime-only by blocking PostgREST queries)
      DROP POLICY IF EXISTS "Allow Realtime conversations select" ON conversations;
      CREATE POLICY "Allow Realtime conversations select" ON conversations FOR SELECT TO anon USING (current_setting('request.path', true) IS NULL);

      DROP POLICY IF EXISTS "Allow Realtime messages select" ON messages;
      CREATE POLICY "Allow Realtime messages select" ON messages FOR SELECT TO anon USING (current_setting('request.path', true) IS NULL);
    `);
    schemaEnsured = true;
  } catch (err) {
    console.warn("Schema migration non-fatal:", err);
  }
}

async function generateNextSerialNo(client: any): Promise<string> {
  try {
    const countRes = await client.query("SELECT COUNT(*) as count FROM households;");
    const count = parseInt(countRes.rows[0]?.count || "0", 10) + 1;
    const part1 = String(Math.floor(count / 1000000) % 1000).padStart(3, "0");
    const part2 = String(Math.floor(count / 1000) % 1000).padStart(3, "0");
    const part3 = String(count % 1000).padStart(3, "0");
    return `MAFL-${part1}-${part2}-${part3}`;
  } catch {
    const rand = Math.floor(100000000 + Math.random() * 900000000).toString();
    return `MAFL-${rand.slice(0, 3)}-${rand.slice(3, 6)}-${rand.slice(6, 9)}`;
  }
}

export const db = {
  async getHouseholds(): Promise<Household[]> {
    if (!pool) throw new Error("Database not connected");
    try {
      const hRes = await pool.query("SELECT * FROM households ORDER BY created_at DESC;");
      const mRes = await pool.query(`
        SELECT id, household_id as "householdId", full_name as "fullName", relation_to_head as "relationToHead",
               dob, gender, marital_status as "maritalStatus", current_city as "currentCity",
               current_country as "currentCountry", postal_code as "postalCode", state, full_address as "fullAddress",
               profession_freetext as "profession", profession_title as "professionTitle", profession_description as "professionDescription",
               company_name as "companyName", anniversary_date as "anniversaryDate",
               phone, email, father_name as "fatherName", photo_url as "photoUrl", bio,
               aadhaar_number as "aadhaarNumber", pan_number as "panNumber", passport_number as "passportNumber", govt_id_number as "govtIdNumber",
               verified_by_self as "verifiedBySelf", owner_locked as "ownerLocked",
               visibility_contact, visibility_dob, visibility_photo
        FROM members ORDER BY (relation_to_head = 'self') DESC, created_at ASC;
      `);

      const membersByHId = new Map<string, Member[]>();
      for (const m of mRes.rows) {
        const hId = String(m.householdId);
        if (!membersByHId.has(hId)) {
          membersByHId.set(hId, []);
        }
        membersByHId.get(hId)!.push({
          ...m,
          dob: m.dob ? (m.dob instanceof Date ? m.dob.toISOString() : String(m.dob)) : "",
          visibility: {
            contactInfo: m.visibility_contact,
            dob: m.visibility_dob,
            photo: m.visibility_photo,
          }
        });
      }

      return hRes.rows.map(h => ({
        id: h.id,
        householdCode: h.household_code,
        serialNo: h.serial_no || h.household_code,
        headUserId: h.head_user_id,
        headName: h.head_name,
        nativePlace: h.native_place,
        gotra: h.gotra,
        country: h.country || "India",
        postalCode: h.postal_code || "",
        state: h.state || "",
        city: h.city || "",
        fullAddress: h.full_address || "",
        aadhaarNumber: h.aadhaar_number,
        panNumber: h.pan_number,
        passportNumber: h.passport_number,
        govtIdNumber: h.govt_id_number,
        status: h.status,
        rejectionReason: h.rejection_reason || undefined,
        verifiedContact: h.verified_contact,
        consentAcceptedAt: h.consent_accepted_at,
        createdAt: h.created_at,
        members: membersByHId.get(String(h.id)) || []
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
    const last10 = rawDigits.length >= 10 ? rawDigits.slice(-10) : (rawDigits.length >= 7 ? rawDigits : "");

    if (!pool) throw new Error("Database not connected");
    try {
      let h: any = null;
      if (!isPhone) {
        // Email lookup: exact match on verified_contact or member email
        const res = await pool.query(
          `SELECT * FROM households 
           WHERE LOWER(verified_contact) = LOWER($1)
           LIMIT 1`,
          [canonical]
        );
        if (res.rows.length > 0) {
          h = res.rows[0];
        } else {
          const memberHouseholdRes = await pool.query(
            `SELECT h.* 
             FROM households h
             JOIN members m ON m.household_id = h.id
             WHERE LOWER(m.email) = LOWER($1)
             LIMIT 1`,
            [canonical]
          );
          if (memberHouseholdRes.rows.length > 0) {
            h = memberHouseholdRes.rows[0];
          }
        }
      } else {
        // Phone lookup: exact or suffix matching only when digits are present
        const phoneLike = last10 ? `%${last10}` : canonical;
        const res = await pool.query(
          `SELECT * FROM households 
           WHERE verified_contact = $1 
              OR verified_contact = $2 
              OR (verified_contact LIKE $3 AND $3 != '%')
           LIMIT 1`,
          [clean, canonical, phoneLike]
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
                OR (m.phone LIKE $3 AND $3 != '%')
             LIMIT 1`,
            [clean, canonical, phoneLike]
          );
          if (memberHouseholdRes.rows.length > 0) {
            h = memberHouseholdRes.rows[0];
          }
        }
      }

      if (!h) return null;
      const mRes = await pool.query(
        `SELECT id, household_id as "householdId", full_name as "fullName", relation_to_head as "relationToHead",
                dob, gender, marital_status as "maritalStatus", current_city as "currentCity",
                current_country as "currentCountry", postal_code as "postalCode", state, full_address as "fullAddress",
                profession_freetext as "profession", profession_title as "professionTitle", profession_description as "professionDescription",
                company_name as "companyName", anniversary_date as "anniversaryDate",
                phone, email, father_name as "fatherName", photo_url as "photoUrl", bio,
                aadhaar_number as "aadhaarNumber", pan_number as "panNumber", passport_number as "passportNumber", govt_id_number as "govtIdNumber",
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
        serialNo: h.serial_no || h.household_code,
        headUserId: h.head_user_id,
        headName: h.head_name,
        nativePlace: h.native_place,
        gotra: h.gotra,
        country: h.country || "India",
        postalCode: h.postal_code || "",
        state: h.state || "",
        city: h.city || "",
        fullAddress: h.full_address || "",
        aadhaarNumber: h.aadhaar_number,
        panNumber: h.pan_number,
        passportNumber: h.passport_number,
        govtIdNumber: h.govt_id_number,
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
    if (!pool) return household;
    
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      await ensureSchema(client);
      
      const serialNo = household.serialNo || (await generateNextSerialNo(client));

      const insertHQuery = `
        INSERT INTO households (
          id, household_code, serial_no, head_user_id, head_name, native_place, gotra,
          country, postal_code, state, city, full_address,
          aadhaar_number, pan_number, passport_number, govt_id_number,
          status, verified_contact, consent_accepted_at, password_hash
        )
        VALUES (
          gen_random_uuid(), $1, $2, gen_random_uuid(), $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18
        )
        RETURNING id, serial_no;
      `;
      const hRes = await client.query(insertHQuery, [
        household.householdCode,
        serialNo,
        household.headName,
        household.nativePlace,
        household.gotra,
        household.country || "India",
        household.postalCode || null,
        household.state || null,
        household.city || null,
        household.fullAddress || null,
        household.aadhaarNumber || null,
        household.panNumber || null,
        household.passportNumber || null,
        household.govtIdNumber || null,
        household.status,
        household.verifiedContact,
        household.consentAcceptedAt || new Date().toISOString(),
        household.passwordHash || null,
      ]);
      const dbHouseholdId = hRes.rows[0].id;
      const actualSerialNo = hRes.rows[0].serial_no || serialNo;

      for (const m of household.members) {
        const safeDob = sanitizeDate(m.dob);
        const safeRel = sanitizeRelation(m.relationToHead);

        const insertMQuery = `
          INSERT INTO members (
            id, household_id, full_name, relation_to_head, dob, gender, marital_status,
            current_city, current_country, postal_code, state, full_address,
            profession_freetext, profession_title, profession_description,
            company_name, anniversary_date,
            phone, email, father_name, photo_url, bio,
            aadhaar_number, pan_number, passport_number, govt_id_number,
            visibility_contact, visibility_dob, visibility_photo, verified_by_self, owner_locked,
            password_hash
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16,
            $17, $18, $19, $20, $21,
            $22, $23, $24, $25,
            $26, $27, $28, $29, $30,
            $31
          );
        `;
        await client.query(insertMQuery, [
          dbHouseholdId,
          m.fullName,
          safeRel,
          safeDob,
          m.gender || "Male",
          m.maritalStatus || "Unmarried",
          m.currentCity || household.city || household.nativePlace,
          m.currentCountry || household.country || "India",
          m.postalCode || household.postalCode || null,
          m.state || household.state || null,
          m.fullAddress || household.fullAddress || null,
          m.profession || "Not specified",
          m.professionTitle || m.profession || null,
          m.professionDescription || null,
          m.companyName || null,
          m.anniversaryDate || null,
          m.phone || null,
          m.email || null,
          m.fatherName || null,
          m.photoUrl || null,
          m.bio || null,
          m.aadhaarNumber || (m.relationToHead === "self" ? household.aadhaarNumber : null),
          m.panNumber || (m.relationToHead === "self" ? household.panNumber : null),
          m.passportNumber || (m.relationToHead === "self" ? household.passportNumber : null),
          m.govtIdNumber || (m.relationToHead === "self" ? household.govtIdNumber : null),
          m.visibility?.contactInfo || "hidden",
          m.visibility?.dob || "hidden",
          m.visibility?.photo || "public_to_members",
          m.verifiedBySelf || false,
          m.ownerLocked || false,
          m.passwordHash || (safeRel === "self" ? household.passwordHash : null) || null,
        ]);
      }

      await client.query("COMMIT");
      return { ...household, id: dbHouseholdId, serialNo: actualSerialNo };
    } catch (e) {
      if (client) {
        try { await client.query("ROLLBACK"); } catch {}
      }
      throw e;
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
          m.current_country as "currentCountry", m.postal_code as "postalCode", m.state, m.full_address as "fullAddress",
          m.profession_freetext as "profession", m.profession_title as "professionTitle", m.profession_description as "professionDescription",
          m.company_name as "companyName", m.anniversary_date as "anniversaryDate",
          m.phone, m.email, m.father_name as "fatherName", m.photo_url as "photoUrl", m.bio, m.verified_by_self as "verifiedBySelf",
          m.owner_locked as "ownerLocked", m.visibility_contact, m.visibility_dob, m.visibility_photo,
          h.household_code as "householdCode", h.serial_no as "serialNo", h.gotra, h.native_place as "nativePlace", h.status as "householdStatus"
        FROM members m
        JOIN households h ON m.household_id = h.id;
      `;
      const res = await pool.query(query);
      if (res.rows.length === 0) return [];
      return res.rows.map(r => ({
        ...r,
        dob: r.dob ? (r.dob instanceof Date ? r.dob.toISOString() : String(r.dob)) : "",
        serialNo: r.serialNo || r.householdCode,
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
      const res = await pool.query(
        "SELECT * FROM households WHERE id::text = $1 OR household_code = $1 OR serial_no = $1 LIMIT 1;",
        [householdId]
      );
      if (res.rows.length === 0) return null;
      const h = res.rows[0];
      return {
        id: h.id,
        householdCode: h.household_code,
        serialNo: h.serial_no || h.household_code,
        headUserId: h.head_user_id,
        headName: h.head_name,
        nativePlace: h.native_place,
        gotra: h.gotra,
        country: h.country || "India",
        postalCode: h.postal_code || "",
        state: h.state || "",
        city: h.city || "",
        fullAddress: h.full_address || "",
        aadhaarNumber: h.aadhaar_number,
        panNumber: h.pan_number,
        passportNumber: h.passport_number,
        govtIdNumber: h.govt_id_number,
        status: h.status,
        verifiedContact: h.verified_contact,
        consentAcceptedAt: h.consent_accepted_at,
        createdAt: h.created_at,
      };
    } catch (e) { throw e; }
  },

  async getMemberById(memberId: string): Promise<any | null> {
    if (!pool) throw new Error("Database not connected");
    try {
      const query = `
        SELECT 
          m.id, m.household_id, m.full_name as "fullName", m.relation_to_head as "relationToHead",
          m.dob, m.gender, m.marital_status as "maritalStatus", m.current_city as "currentCity",
          m.current_country as "currentCountry", m.postal_code as "postalCode", m.state, m.full_address as "fullAddress",
          m.profession_freetext as "profession", m.profession_title as "professionTitle", m.profession_description as "professionDescription",
          m.company_name as "companyName", m.anniversary_date as "anniversaryDate",
          m.phone, m.email, m.father_name as "fatherName", m.photo_url as "photoUrl", m.bio, m.verified_by_self as "verifiedBySelf",
          m.owner_locked as "ownerLocked", m.visibility_contact, m.visibility_dob, m.visibility_photo,
          m.aadhaar_number as "aadhaarNumber", m.pan_number as "panNumber", m.passport_number as "passportNumber", m.govt_id_number as "govtIdNumber",
          h.household_code as "householdCode", h.serial_no as "serialNo", h.gotra, h.native_place as "nativePlace", h.status as "householdStatus"
        FROM members m
        JOIN households h ON m.household_id = h.id
        WHERE m.id::text = $1 OR h.household_code = $1 OR h.serial_no = $1 OR h.id::text = $1;
      `;
      const res = await pool.query(query, [memberId]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        dob: r.dob ? (r.dob instanceof Date ? r.dob.toISOString() : String(r.dob)) : "",
        serialNo: r.serialNo || r.householdCode,
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

  async getMembersByHousehold(householdId: string): Promise<any[]> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        `SELECT id, household_id as "householdId", full_name as "fullName", relation_to_head as "relationToHead",
                dob, gender, marital_status as "maritalStatus", current_city as "currentCity",
                current_country as "currentCountry", postal_code as "postalCode", state, full_address as "fullAddress",
                profession_freetext as "profession", profession_title as "professionTitle", profession_description as "professionDescription",
                company_name as "companyName", anniversary_date as "anniversaryDate",
                phone, email, father_name as "fatherName", photo_url as "photoUrl", bio,
                aadhaar_number as "aadhaarNumber", pan_number as "panNumber", passport_number as "passportNumber", govt_id_number as "govtIdNumber",
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

  async addMemberToHousehold(householdId: string, member: Partial<Member>): Promise<any> {
    if (!pool) throw new Error("Database not connected");

    // 1. Quota guard (A04: Resource Exhaustion defense)
    const countRes = await pool.query(
      "SELECT COUNT(*)::int as count FROM members WHERE household_id::text = $1;",
      [householdId]
    );
    const count = countRes.rows[0]?.count || 0;
    if (count >= 25) {
      throw new Error("Household has reached maximum member capacity (25 members).");
    }

    // 2. Fetch household for address/native inheritance if not specified
    const hRes = await pool.query(
      "SELECT city, country, postal_code, state, full_address, native_place FROM households WHERE id::text = $1 LIMIT 1;",
      [householdId]
    );
    const household = hRes.rows[0] || {};

    // 3. Validation: relation to head cannot be 'self'
    const safeRel = member.relationToHead || "other";
    if (safeRel === "self") {
      throw new Error("Cannot add a duplicate Head of Household ('self').");
    }

    const safeDob = member.dob ? sanitizeDate(member.dob) : null;
    const cleanPhone = member.phone?.trim() ? normalizePhoneNumber(member.phone.trim()) : null;
    const cleanEmail = member.email?.trim() ? member.email.trim().toLowerCase() : null;

    const insertQuery = `
      INSERT INTO members (
        id, household_id, full_name, relation_to_head, dob, gender, marital_status,
        current_city, current_country, postal_code, state, full_address,
        profession_freetext, profession_title, profession_description,
        company_name, anniversary_date,
        phone, email, father_name, photo_url, bio,
        visibility_contact, visibility_dob, visibility_photo,
        verified_by_self, owner_locked, password_hash
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24,
        false, false, null
      ) RETURNING *;
    `;

    const res = await pool.query(insertQuery, [
      householdId,
      member.fullName?.trim(),
      safeRel,
      safeDob,
      member.gender || "Male",
      member.maritalStatus || "Unmarried",
      member.currentCity?.trim() || household.city || household.native_place || "",
      member.currentCountry?.trim() || household.country || "India",
      member.postalCode?.trim() || household.postal_code || null,
      member.state?.trim() || household.state || null,
      member.fullAddress?.trim() || household.full_address || null,
      member.profession?.trim() || member.professionTitle?.trim() || "Not specified",
      member.professionTitle?.trim() || member.profession?.trim() || null,
      member.professionDescription?.trim() || null,
      member.companyName?.trim() || null,
      member.maritalStatus === "Married" && member.anniversaryDate ? member.anniversaryDate.trim() : null,
      cleanPhone,
      cleanEmail,
      member.fatherName?.trim() || null,
      member.photoUrl || null,
      member.bio?.trim() || null,
      member.visibility?.contactInfo || "hidden",
      member.visibility?.dob || "hidden",
      member.visibility?.photo || "public_to_members",
    ]);

    const m = res.rows[0];
    return {
      id: m.id,
      householdId: m.household_id,
      fullName: m.full_name,
      relationToHead: m.relation_to_head,
      dob: m.dob ? (m.dob instanceof Date ? m.dob.toISOString() : String(m.dob)) : "",
      gender: m.gender,
      maritalStatus: m.marital_status,
      currentCity: m.current_city,
      currentCountry: m.current_country,
      postalCode: m.postal_code,
      state: m.state,
      fullAddress: m.full_address,
      profession: m.profession_freetext,
      professionTitle: m.profession_title,
      professionDescription: m.profession_description,
      companyName: m.company_name,
      anniversaryDate: m.anniversary_date,
      phone: m.phone,
      email: m.email,
      fatherName: m.father_name,
      photoUrl: m.photo_url,
      bio: m.bio,
      verifiedBySelf: m.verified_by_self,
      ownerLocked: m.owner_locked,
      visibility: {
        contactInfo: m.visibility_contact,
        dob: m.visibility_dob,
        photo: m.visibility_photo,
      }
    };
  },

  async updateHouseholdStatus(id: string, status: "live" | "rejected" | "pending_review", rejectionReason?: string): Promise<Household | null> {
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
        serialNo: h.serial_no,
        householdCode: h.household_code,
        headUserId: h.head_user_id,
        headName: h.head_name,
        nativePlace: h.native_place,
        gotra: h.gotra,
        status: h.status,
        country: h.country,
        postalCode: h.postal_code,
        state: h.state,
        city: h.city,
        fullAddress: h.full_address,
        aadhaarNumber: h.aadhaar_number,
        panNumber: h.pan_number,
        passportNumber: h.passport_number,
        govtIdNumber: h.govt_id_number,
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
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : (digitsOnly.length >= 7 ? digitsOnly : "");

    if (!pool) throw new Error("Database not connected");

    try {
      if (isEmail) {
        // 1. Check in households (verified_contact)
        const hRes = await pool.query(
          `SELECT id, household_code, head_name, verified_contact 
           FROM households 
           WHERE LOWER(verified_contact) = LOWER($1)
           LIMIT 1;`,
          [canonical]
        );
        if (hRes.rows.length > 0) {
          const h = hRes.rows[0];
          return { exists: true, type: "head", name: h.head_name, householdCode: h.household_code };
        }

        // 2. Check in members (email)
        const mRes = await pool.query(
          `SELECT m.id, m.full_name, h.household_code 
           FROM members m 
           JOIN households h ON m.household_id = h.id 
           WHERE LOWER(m.email) = LOWER($1)
             AND ($2::text IS NULL OR m.id::text != $2)
           LIMIT 1;`,
          [canonical, excludeMemberId || null]
        );
        if (mRes.rows.length > 0) {
          const m = mRes.rows[0];
          return { exists: true, type: "member", name: m.full_name, householdCode: m.household_code };
        }

        return { exists: false };
      } else {
        const phoneLike = last10 ? `%${last10}` : canonical;
        // 1. Check in households (verified_contact)
        const hRes = await pool.query(
          `SELECT id, household_code, head_name, verified_contact 
           FROM households 
           WHERE verified_contact = $1 OR verified_contact = $2 OR (verified_contact LIKE $3 AND $3 != '%')
           LIMIT 1;`,
          [clean, canonical, phoneLike]
        );
        if (hRes.rows.length > 0) {
          const h = hRes.rows[0];
          return { exists: true, type: "head", name: h.head_name, householdCode: h.household_code };
        }

        // 2. Check in members (phone)
        const mRes = await pool.query(
          `SELECT m.id, m.full_name, h.household_code 
           FROM members m 
           JOIN households h ON m.household_id = h.id 
           WHERE (m.phone = $1 OR m.phone = $2 OR (m.phone LIKE $3 AND $3 != '%'))
             AND ($4::text IS NULL OR m.id::text != $4)
           LIMIT 1;`,
          [clean, canonical, phoneLike, excludeMemberId || null]
        );
        if (mRes.rows.length > 0) {
          const m = mRes.rows[0];
          return { exists: true, type: "member", name: m.full_name, householdCode: m.household_code };
        }

        return { exists: false };
      }
    } catch (e) {
      throw e;
    }
  },

  async getMemberByContact(contact: string): Promise<any | null> {
    if (!contact || contact.trim().length < 5) return null;
    const clean = contact.trim();
    const isEmail = clean.includes("@");
    const canonical = isEmail ? clean.toLowerCase() : normalizePhoneNumber(clean);
    const digitsOnly = clean.replace(/[^0-9]/g, "");
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : (digitsOnly.length >= 7 ? digitsOnly : "");

    if (!pool) throw new Error("Database not connected");

    try {
      if (isEmail) {
        // 1. Search in members table by email
        const mRes = await pool.query(
          `SELECT m.*, COALESCE(m.password_hash, h.password_hash) as "passwordHash", h.household_code as "householdCode", h.serial_no as "serialNo", h.status as "householdStatus"
           FROM members m
           JOIN households h ON m.household_id = h.id
           WHERE LOWER(m.email) = LOWER($1)
           ORDER BY (m.relation_to_head = 'self') DESC, m.created_at ASC
           LIMIT 1;`,
          [canonical]
        );
        if (mRes.rows.length > 0) {
          const r = mRes.rows[0];
          return {
            ...r,
            id: String(r.id),
            fullName: r.full_name,
            relationToHead: r.relation_to_head,
            currentCity: r.current_city,
            currentCountry: r.current_country,
            gotra: r.gotra,
            photoUrl: r.photo_url,
            passwordHash: r.passwordHash || r.password_hash,
          };
        }

        // 2. Search in households table by verified email contact (head of household)
        const hRes = await pool.query(
          `SELECT m.*, COALESCE(m.password_hash, h.password_hash) as "passwordHash", h.household_code as "householdCode", h.serial_no as "serialNo", h.status as "householdStatus"
           FROM households h
           JOIN members m ON m.household_id = h.id AND m.relation_to_head = 'self'
           WHERE LOWER(h.verified_contact) = LOWER($1)
           LIMIT 1;`,
          [canonical]
        );
        if (hRes.rows.length > 0) {
          const r = hRes.rows[0];
          return {
            ...r,
            id: String(r.id),
            fullName: r.full_name,
            relationToHead: r.relation_to_head,
            currentCity: r.current_city,
            currentCountry: r.current_country,
            gotra: r.gotra,
            photoUrl: r.photo_url,
            passwordHash: r.passwordHash || r.password_hash,
          };
        }

        return null;
      } else {
        const phoneLike = last10 ? `%${last10}` : canonical;
        // 1. Search in members table by phone
        const mRes = await pool.query(
          `SELECT m.*, COALESCE(m.password_hash, h.password_hash) as "passwordHash", h.household_code as "householdCode", h.serial_no as "serialNo", h.status as "householdStatus"
           FROM members m
           JOIN households h ON m.household_id = h.id
           WHERE m.phone = $1 OR m.phone = $2 OR (m.phone LIKE $3 AND $3 != '%')
           ORDER BY (m.relation_to_head = 'self') DESC, m.created_at ASC
           LIMIT 1;`,
          [clean, canonical, phoneLike]
        );
        if (mRes.rows.length > 0) {
          const r = mRes.rows[0];
          return {
            ...r,
            id: String(r.id),
            fullName: r.full_name,
            relationToHead: r.relation_to_head,
            currentCity: r.current_city,
            currentCountry: r.current_country,
            gotra: r.gotra,
            photoUrl: r.photo_url,
            passwordHash: r.passwordHash || r.password_hash,
          };
        }

        // 2. Search in households table by verified phone (head of household)
        const hRes = await pool.query(
          `SELECT m.*, COALESCE(m.password_hash, h.password_hash) as "passwordHash", h.household_code as "householdCode", h.serial_no as "serialNo", h.status as "householdStatus"
           FROM households h
           JOIN members m ON m.household_id = h.id AND m.relation_to_head = 'self'
           WHERE h.verified_contact = $1 OR h.verified_contact = $2 OR (h.verified_contact LIKE $3 AND $3 != '%')
           LIMIT 1;`,
          [clean, canonical, phoneLike]
        );
        if (hRes.rows.length > 0) {
          const r = hRes.rows[0];
          return {
            ...r,
            id: String(r.id),
            fullName: r.full_name,
            relationToHead: r.relation_to_head,
            currentCity: r.current_city,
            currentCountry: r.current_country,
            gotra: r.gotra,
            photoUrl: r.photo_url,
            passwordHash: r.passwordHash || r.password_hash,
          };
        }

        return null;
      }
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
             profession_title = COALESCE($11, profession_title),
             profession_description = COALESCE($12, profession_description),
             company_name = COALESCE($13, company_name),
             anniversary_date = COALESCE($14, anniversary_date),
             bio = COALESCE($15, bio),
             visibility_contact = COALESCE($16, visibility_contact),
             visibility_dob = COALESCE($17, visibility_dob),
             visibility_photo = COALESCE($18, visibility_photo)
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
          updates.professionTitle?.trim() || null,
          updates.professionDescription?.trim() || null,
          updates.companyName?.trim() || null,
          updates.anniversaryDate?.trim() || null,
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

  // --- MEMBER-TO-MEMBER MESSAGING & TRUST/SAFETY DATA LAYER ---
  async getOrCreateConversation(initiatorId: string, recipientId: string): Promise<any> {
    if (!pool) throw new Error("Database not connected");
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(initiatorId) || !uuidRegex.test(recipientId)) {
      throw new Error(`Invalid member UUID format (initiator: ${initiatorId}, recipient: ${recipientId}). Please re-login.`);
    }
    try {
      // Find existing in either direction
      const existing = await pool.query(
        `SELECT * FROM conversations 
         WHERE (initiator_id::text = $1 AND recipient_id::text = $2)
            OR (initiator_id::text = $2 AND recipient_id::text = $1)
         LIMIT 1;`,
        [initiatorId, recipientId]
      );
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new pending conversation
      const res = await pool.query(
        `INSERT INTO conversations (id, initiator_id, recipient_id, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'pending', NOW(), NOW())
         RETURNING *;`,
        [initiatorId, recipientId]
      );
      return res.rows[0];
    } catch (e) {
      throw e;
    }
  },

  async getConversationsForMember(memberId: string): Promise<{ active: any[]; requests: any[] }> {
    if (!pool) throw new Error("Database not connected");
    try {
      const query = `
        SELECT 
          c.id, c.initiator_id as "initiatorId", c.recipient_id as "recipientId",
          c.status, c.last_message_at as "lastMessageAt", c.last_message_preview as "lastMessagePreview",
          c.created_at as "createdAt", c.updated_at as "updatedAt",
          m_init.full_name as "initiatorName", m_init.photo_url as "initiatorPhoto", m_init.current_city as "initiatorCity",
          m_rec.full_name as "recipientName", m_rec.photo_url as "recipientPhoto", m_rec.current_city as "recipientCity",
          h_init.gotra as "initiatorGotra", h_rec.gotra as "recipientGotra",
          (
            SELECT COUNT(*)::int FROM messages msg 
            WHERE msg.conversation_id = c.id 
              AND msg.recipient_id::text = $1 
              AND msg.read_at IS NULL
          ) as "unreadCount"
        FROM conversations c
        JOIN members m_init ON c.initiator_id = m_init.id
        JOIN members m_rec ON c.recipient_id = m_rec.id
        JOIN households h_init ON m_init.household_id = h_init.id
        JOIN households h_rec ON m_rec.household_id = h_rec.id
        WHERE c.initiator_id::text = $1 OR c.recipient_id::text = $1
        ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC;
      `;
      const res = await pool.query(query, [memberId]);
      const active: any[] = [];
      const requests: any[] = [];

      for (const row of res.rows) {
        const isInitiator = String(row.initiatorId) === String(memberId);
        const otherParticipant = {
          id: isInitiator ? row.recipientId : row.initiatorId,
          fullName: isInitiator ? row.recipientName : row.initiatorName,
          photoUrl: isInitiator ? row.recipientPhoto : row.initiatorPhoto,
          city: isInitiator ? row.recipientCity : row.initiatorCity,
          gotra: isInitiator ? row.recipientGotra : row.initiatorGotra,
        };

        const item = {
          id: row.id,
          initiatorId: row.initiatorId,
          recipientId: row.recipientId,
          status: row.status,
          isInitiator,
          unreadCount: row.unreadCount || 0,
          lastMessageAt: row.lastMessageAt,
          lastMessagePreview: row.lastMessagePreview,
          otherParticipant,
        };

        // Incoming message request: status is pending and caller is the recipient
        if (row.status === "pending" && !isInitiator) {
          requests.push(item);
        } else if (row.status !== "declined" && row.status !== "blocked") {
          active.push(item);
        }
      }

      return { active, requests };
    } catch (e) {
      throw e;
    }
  },

  async getConversationById(conversationId: string): Promise<any | null> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query("SELECT * FROM conversations WHERE id::text = $1 LIMIT 1;", [conversationId]);
      if (res.rows.length === 0) return null;
      return res.rows[0];
    } catch (e) {
      throw e;
    }
  },

  async updateConversationStatus(conversationId: string, status: "pending" | "accepted" | "declined" | "blocked"): Promise<boolean> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        "UPDATE conversations SET status = $1, updated_at = NOW() WHERE id::text = $2 RETURNING id;",
        [status, conversationId]
      );
      return res.rows.length > 0;
    } catch (e) {
      throw e;
    }
  },

  async insertMessage(data: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    messageBody: string;
    isFlagged?: boolean;
    flagReason?: string;
  }): Promise<any> {
    if (!pool) throw new Error("Database not connected");
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const insertRes = await client.query(
        `INSERT INTO messages (id, conversation_id, sender_id, recipient_id, message_body, is_flagged, flag_reason, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, NOW())
         RETURNING *;`,
        [
          data.conversationId,
          data.senderId,
          data.recipientId,
          data.messageBody.trim(),
          data.isFlagged || false,
          data.flagReason || null,
        ]
      );
      const msg = insertRes.rows[0];

      // Update conversation timestamp and preview
      const preview = data.messageBody.trim().slice(0, 100);
      await client.query(
        `UPDATE conversations 
         SET last_message_at = NOW(), last_message_preview = $1, updated_at = NOW() 
         WHERE id::text = $2;`,
        [preview, data.conversationId]
      );

      await client.query("COMMIT");
      return msg;
    } catch (e) {
      if (client) {
        try { await client.query("ROLLBACK"); } catch {}
      }
      throw e;
    } finally {
      if (client) client.release();
    }
  },

  async getMessagesByConversation(conversationId: string, limit = 50, offset = 0): Promise<any[]> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        `SELECT 
           m.id, m.conversation_id as "conversationId", m.sender_id as "senderId", 
           m.recipient_id as "recipientId", m.message_body as "messageBody",
           m.is_flagged as "isFlagged", m.flag_reason as "flagReason", 
           m.read_at as "readAt", m.created_at as "createdAt",
           sender.full_name as "senderName", sender.photo_url as "senderPhoto"
         FROM messages m
         JOIN members sender ON m.sender_id = sender.id
         WHERE m.conversation_id::text = $1
         ORDER BY m.created_at ASC
         LIMIT $2 OFFSET $3;`,
        [conversationId, limit, offset]
      );
      return res.rows;
    } catch (e) {
      throw e;
    }
  },

  async markMessagesAsRead(conversationId: string, recipientId: string): Promise<number> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        `UPDATE messages 
         SET read_at = NOW() 
         WHERE conversation_id::text = $1 
           AND recipient_id::text = $2 
           AND read_at IS NULL;`,
        [conversationId, recipientId]
      );
      return res.rowCount || 0;
    } catch (e) {
      throw e;
    }
  },

  async createMessageReport(report: {
    conversationId: string;
    reporterId: string;
    reportedMemberId: string;
    offendingMessageId?: string;
    reason: string;
    details?: string;
    snapshotData?: any;
  }): Promise<any> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        `INSERT INTO message_reports (
           id, conversation_id, reporter_id, reported_member_id, offending_message_id, reason, details, snapshot_data, status, created_at
         ) VALUES (
           gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, 'pending', NOW()
         ) RETURNING *;`,
        [
          report.conversationId,
          report.reporterId,
          report.reportedMemberId,
          report.offendingMessageId || null,
          report.reason,
          report.details || null,
          report.snapshotData ? JSON.stringify(report.snapshotData) : null,
        ]
      );
      return res.rows[0];
    } catch (e) {
      throw e;
    }
  },

  async getMessageReports(): Promise<any[]> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        `SELECT 
           r.id, r.conversation_id as "conversationId", r.reporter_id as "reporterId",
           r.reported_member_id as "reportedMemberId", r.offending_message_id as "offendingMessageId",
           r.reason, r.details, r.snapshot_data as "snapshotData", r.status, r.created_at as "createdAt",
           rep.full_name as "reporterName", rep_h.household_code as "reporterHousehold",
           targ.full_name as "reportedName", targ_h.household_code as "reportedHousehold"
         FROM message_reports r
         JOIN members rep ON r.reporter_id = rep.id
         JOIN households rep_h ON rep.household_id = rep_h.id
         JOIN members targ ON r.reported_member_id = targ.id
         JOIN households targ_h ON targ.household_id = targ_h.id
         ORDER BY r.created_at DESC;`
      );
      return res.rows;
    } catch (e) {
      throw e;
    }
  },

  async resolveMessageReport(reportId: string, action: "dismiss" | "warn" | "suspend_chat", notes?: string): Promise<boolean> {
    if (!pool) throw new Error("Database not connected");
    try {
      const status = action === "dismiss" ? "dismissed" : "action_taken";
      await pool.query(
        "UPDATE message_reports SET status = $1, details = COALESCE($2, details) WHERE id::text = $3;",
        [status, notes || null, reportId]
      );

      if (action === "suspend_chat") {
        const reportRes = await pool.query("SELECT conversation_id FROM message_reports WHERE id::text = $1;", [reportId]);
        if (reportRes.rows.length > 0 && reportRes.rows[0].conversation_id) {
          await this.updateConversationStatus(reportRes.rows[0].conversation_id, "blocked");
        }
      }
      return true;
    } catch (e) {
      throw e;
    }
  },

  async pruneExpiredMessages(retentionDays = 90): Promise<number> {
    if (!pool) throw new Error("Database not connected");
    try {
      const res = await pool.query(
        `DELETE FROM messages 
         WHERE created_at < NOW() - ($1 || ' days')::INTERVAL 
           AND is_flagged = FALSE;`,
        [retentionDays]
      );
      return res.rowCount || 0;
    } catch (e) {
      throw e;
    }
  },

  // --- PERSISTENT RATE LIMITING & TOLL FRAUD DEFENSE ---
  async checkOtpRateLimit(ipAddress: string, recipient: string): Promise<{ allowed: boolean; error?: string }> {
    if (!pool) return { allowed: true };
    try {
      // 1. Check last OTP timestamp for recipient (60-second cooldown)
      const recentRecipient = await pool.query(
        `SELECT created_at FROM otp_rate_limits 
         WHERE recipient = $1 
         ORDER BY created_at DESC 
         LIMIT 1;`,
        [recipient]
      );
      if (recentRecipient.rows.length > 0) {
        const lastSent = new Date(recentRecipient.rows[0].created_at).getTime();
        const diffSecs = Math.floor((Date.now() - lastSent) / 1000);
        if (diffSecs < 60) {
          return {
            allowed: false,
            error: `Please wait ${60 - diffSecs} seconds before requesting another verification code.`,
          };
        }
      }

      // 2. Check 15-minute recipient limit (Max 3 OTPs)
      const recipientCountRes = await pool.query(
        `SELECT COUNT(*)::int as count FROM otp_rate_limits 
         WHERE recipient = $1 
           AND created_at > NOW() - INTERVAL '15 minutes';`,
        [recipient]
      );
      if (recipientCountRes.rows[0]?.count >= 3) {
        return {
          allowed: false,
          error: "Too many OTP requests for this contact. Please wait 15 minutes before trying again.",
        };
      }

      // 3. Check 1-hour IP limit across all recipients (Max 8 OTPs to stop bot SMS pumping)
      const ipCountRes = await pool.query(
        `SELECT COUNT(*)::int as count FROM otp_rate_limits 
         WHERE ip_address = $1 
           AND created_at > NOW() - INTERVAL '1 hour';`,
        [ipAddress]
      );
      if (ipCountRes.rows[0]?.count >= 8) {
        return {
          allowed: false,
          error: "Too many requests from your network. Please try again in 1 hour.",
        };
      }

      return { allowed: true };
    } catch (err) {
      console.warn("DB Rate limit non-fatal fallback:", err);
      return { allowed: true };
    }
  },

  async recordOtpRequest(ipAddress: string, recipient: string): Promise<void> {
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO otp_rate_limits (id, ip_address, recipient, created_at)
         VALUES (gen_random_uuid(), $1, $2, NOW());`,
        [ipAddress, recipient]
      );
    } catch (err) {
      console.warn("Record OTP request non-fatal:", err);
    }
  },

  async checkAdminLockout(ipAddress: string): Promise<{ locked: boolean; error?: string }> {
    if (!pool) return { locked: false };
    try {
      const recentFails = await pool.query(
        `SELECT COUNT(*)::int as count FROM admin_login_attempts 
         WHERE ip_address = $1 
           AND success = FALSE 
           AND created_at > NOW() - INTERVAL '15 minutes';`,
        [ipAddress]
      );
      if (recentFails.rows[0]?.count >= 5) {
        return {
          locked: true,
          error: "Security lockout: 5 failed admin login attempts. Please try again after 15 minutes.",
        };
      }
      return { locked: false };
    } catch (err) {
      return { locked: false };
    }
  },

  async recordAdminAttempt(ipAddress: string, success: boolean): Promise<void> {
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO admin_login_attempts (id, ip_address, success, created_at)
         VALUES (gen_random_uuid(), $1, $2, NOW());`,
        [ipAddress, success]
      );
    } catch (err) {
      console.warn("Record admin attempt non-fatal:", err);
    }
  },

  async recordLoginAttempt(identifier: string, ip: string, success: boolean): Promise<void> {
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO login_attempts (identifier, ip_address, success, created_at)
         VALUES ($1, $2, $3, NOW());`,
        [identifier.toLowerCase().trim(), ip, success]
      );
    } catch (err) {
      console.warn("Record login attempt non-fatal:", err);
    }
  },

  async getRecentLoginAttempts(identifier: string, ip: string, minutes: number = 15): Promise<Array<{ success: boolean; created_at: Date }>> {
    if (!pool) return [];
    try {
      const res = await pool.query(
        `SELECT success, created_at FROM login_attempts
         WHERE (identifier = $1 OR ip_address = $2)
           AND created_at > NOW() - ($3 || ' minutes')::INTERVAL
         ORDER BY created_at DESC;`,
        [identifier.toLowerCase().trim(), ip, minutes]
      );
      return res.rows.map((r: any) => ({ success: r.success, created_at: r.created_at }));
    } catch (err) {
      console.error("[DB ERROR] getRecentLoginAttempts:", err);
      return [];
    }
  },

  async updatePasswordHash(entityType: "household" | "member", id: string, newHash: string): Promise<void> {
    if (!pool) throw new Error("Database not connected");
    const table = entityType === "household" ? "households" : "members";
    await pool.query(
      `UPDATE ${table} SET password_hash = $1, updated_at = NOW() WHERE id = $2;`,
      [newHash, id]
    );
  },
};

