import { normalizePhoneNumber } from "@/lib/phone";
import { Pool } from "pg";
import type { Household, Member } from "../types/household";
import type { SupportInquiry, CreateInquiryInput, InquiryStatus } from "../types/support";
import type { MatrimonialProfile, MatrimonyFilter } from "../types/matrimony";
import type { EmailQueueItem, EnqueueEmailInput, EmailQueueStats } from "../types/email-queue";
import type { BusinessProfile } from "../types/business";
import type { CareerProfile, CreateCareerProfileInput, UpdateCareerProfileInput, CareerFilter } from "../types/career";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
  schemaEnsured?: boolean;
};

let pool: Pool | null = globalForPg.pgPool || null;

if (!pool && process.env.DATABASE_URL) {
  try {
    let effectiveDbUrl = process.env.DATABASE_URL;

    // Hard safety guard: When running locally outside Vercel cloud, prevent accidental connection to production Supabase
    if (!process.env.VERCEL && (effectiveDbUrl.includes("supabase.co") || effectiveDbUrl.includes("supabase.com") || effectiveDbUrl.includes("pooler.supabase.com"))) {
      if (process.env.ALLOW_REMOTE_DB_ON_LOCAL !== "true") {
        console.warn("[DB SAFETY GUARD] Remote Supabase database URL detected in local environment. Automatically redirecting to local Docker PostGIS database (127.0.0.1:5432/agrawal_dev) for safety.");
        effectiveDbUrl = "postgresql://postgres:postgres@127.0.0.1:5432/agrawal_dev";
      }
    }

    const isLocalDb =
      effectiveDbUrl.includes("localhost") ||
      effectiveDbUrl.includes("127.0.0.1") ||
      effectiveDbUrl.includes("::1");

    const isProduction = process.env.NODE_ENV === "production";

    console.log(`[DATABASE CONNECT] Connecting to PostgreSQL at: ${isLocalDb ? "127.0.0.1:5432/agrawal_dev (LOCAL DOCKER)" : "REMOTE CLOUD"}`);

    pool = new Pool({
      connectionString: effectiveDbUrl,
      ssl: isLocalDb ? false : { rejectUnauthorized: false },
      max: isProduction ? 2 : 10,
      idleTimeoutMillis: isProduction ? 10000 : 30000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
    });
    pool.on("error", (err) => {
      console.warn("PostgreSQL idle client notice:", err.message);
    });
    globalForPg.pgPool = pool;

    if (!globalForPg.schemaEnsured && process.env.NODE_ENV !== "test") {
      pool.connect().then(async (client) => {
        try {
          await ensureSchema(client);
        } catch (err) {
          console.warn("Background schema migration notice:", err);
        } finally {
          client.release();
        }
      }).catch((err) => {
        console.warn("Schema migration connect skipped/deferred:", err?.message || err);
      });
    }
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
  if (globalForPg.schemaEnsured || schemaEnsured) return;
  try {
    await client.query(`
      ALTER TABLE households ADD COLUMN IF NOT EXISTS serial_no VARCHAR(32) UNIQUE;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
      ALTER TABLE households ADD COLUMN IF NOT EXISTS postal_code TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS full_address TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS aadhaar_hash TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS pan_number TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS passport_number TEXT;
      ALTER TABLE households ADD COLUMN IF NOT EXISTS govt_id_number TEXT;
      CREATE INDEX IF NOT EXISTS idx_households_aadhaar_hash ON households(aadhaar_hash);

      ALTER TABLE members ADD COLUMN IF NOT EXISTS profession_title TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS profession_description TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS company_name TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS anniversary_date TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS postal_code TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS state TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS full_address TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhaar_hash TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS passport_number TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS govt_id_number TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS serial_no VARCHAR(32) UNIQUE;
      CREATE INDEX IF NOT EXISTS idx_members_serial_no ON members(serial_no);
      CREATE INDEX IF NOT EXISTS idx_members_aadhaar_hash ON members(aadhaar_hash);

      ALTER TABLE households ADD COLUMN IF NOT EXISTS password_hash TEXT;

      CREATE TABLE IF NOT EXISTS login_attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          identifier VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          success BOOLEAN NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts (identifier, ip_address, created_at DESC);

      CREATE TABLE IF NOT EXISTS action_rate_limits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(255) NOT NULL,
          action VARCHAR(50) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_action_rate_limits ON action_rate_limits (key, action, created_at DESC);

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
          message_body TEXT,
          attachment_url TEXT,
          attachment_type VARCHAR(20),
          attachment_name TEXT,
          attachment_size INTEGER,
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

      CREATE TABLE IF NOT EXISTS support_inquiries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id VARCHAR(32) NOT NULL UNIQUE,
          name VARCHAR(150) NOT NULL,
          email VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'open',
          admin_notes TEXT,
          ip_address VARCHAR(45),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_support_inquiries_created ON support_inquiries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_support_inquiries_status ON support_inquiries(status);

      CREATE TABLE IF NOT EXISTS registration_drafts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          phone TEXT NOT NULL,
          phone_dial_code VARCHAR(10) DEFAULT '+91',
          head_name TEXT,
          current_step INT NOT NULL DEFAULT 2,
          is_completed BOOLEAN NOT NULL DEFAULT FALSE,
          form_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE registration_drafts ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;
      CREATE INDEX IF NOT EXISTS idx_registration_drafts_incomplete ON registration_drafts(is_completed, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_registration_drafts_email ON registration_drafts(email);

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_id TEXT NOT NULL,
          admin_contact TEXT NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          details JSONB DEFAULT '{}'::jsonb,
          ip_address TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
      ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

      CREATE TABLE IF NOT EXISTS email_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipient_email TEXT NOT NULL,
          recipient_name TEXT,
          subject TEXT NOT NULL,
          html_body TEXT NOT NULL,
          text_body TEXT,
          attachments JSONB,
          metadata JSONB DEFAULT '{}'::jsonb,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          attempts INT NOT NULL DEFAULT 0,
          max_attempts INT NOT NULL DEFAULT 3,
          last_error TEXT,
          resend_id TEXT,
          scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_queue_status_sched ON email_queue(status, scheduled_for, created_at);
      CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at DESC);
      ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

      -- Enable RLS on all tables (Supabase advisor fix)
      ALTER TABLE households ENABLE ROW LEVEL SECURITY;
      ALTER TABLE members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE action_rate_limits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_inquiries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE registration_drafts ENABLE ROW LEVEL SECURITY;

      -- Allow SELECT to anon for Realtime web-socket updates (restricted to Realtime-only by blocking PostgREST queries)
      DROP POLICY IF EXISTS "Allow Realtime conversations select" ON conversations;
      CREATE POLICY "Allow Realtime conversations select" ON conversations FOR SELECT TO anon USING (current_setting('request.path', true) IS NULL);

      DROP POLICY IF EXISTS "Allow Realtime messages select" ON messages;
      CREATE POLICY "Allow Realtime messages select" ON messages FOR SELECT TO anon USING (current_setting('request.path', true) IS NULL);

      -- Matrimonial Profiles Table
      CREATE TABLE IF NOT EXISTS matrimonial_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
          member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
          created_by_user_id TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
          full_name VARCHAR(150) NOT NULL,
          created_for VARCHAR(50) NOT NULL DEFAULT 'Self',
          marital_status VARCHAR(50) NOT NULL DEFAULT 'Never Married',
          dob DATE NOT NULL,
          place_of_birth VARCHAR(150),
          height_cm INT,
          height_display VARCHAR(30),
          weight_build VARCHAR(50),
          complexion VARCHAR(50),
          blood_group VARCHAR(10),
          mother_tongue VARCHAR(50) DEFAULT 'Hindi',
          languages_spoken TEXT[],
          diet VARCHAR(50) DEFAULT 'Vegetarian',
          smoke_drink VARCHAR(50) DEFAULT 'Non-Smoker / Non-Drinker',
          physical_status VARCHAR(100) DEFAULT 'Normal',
          about_me TEXT,
          gotra VARCHAR(50) NOT NULL,
          highest_education VARCHAR(100) NOT NULL,
          degree_name VARCHAR(150),
          college_name VARCHAR(150),
          schooling_honors TEXT,
          employment_sector VARCHAR(80) NOT NULL,
          occupation_title VARCHAR(150) NOT NULL,
          company_name VARCHAR(150),
          annual_income VARCHAR(50),
          work_city VARCHAR(100),
          work_country VARCHAR(80) DEFAULT 'India',
          willing_to_relocate VARCHAR(50) DEFAULT 'Yes',
          father_name VARCHAR(150) NOT NULL,
          father_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
          father_occupation VARCHAR(100),
          mother_name VARCHAR(150) NOT NULL,
          mother_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
          mother_occupation VARCHAR(100),
          linked_siblings JSONB DEFAULT '[]',
          native_place VARCHAR(150) NOT NULL,
          family_location VARCHAR(150) NOT NULL,
          family_type VARCHAR(30) DEFAULT 'Nuclear',
          family_values VARCHAR(30) DEFAULT 'Traditional',
          family_financial_status VARCHAR(50) DEFAULT 'Upper Middle Class',
          about_family TEXT,
          custom_fields JSONB DEFAULT '[]',
          photos JSONB DEFAULT '[]',
          partner_preferences JSONB DEFAULT '{}',
          contact_person VARCHAR(150) NOT NULL,
          contact_relation VARCHAR(50) NOT NULL,
          contact_phone VARCHAR(50) NOT NULL,
          secondary_phone VARCHAR(50),
          contact_email VARCHAR(100),
          residential_address TEXT,
          referenced_by VARCHAR(150),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_matrimonial_profiles_member ON matrimonial_profiles(member_id);
      CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_gender_status ON matrimonial_profiles(gender, status);
      CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_household ON matrimonial_profiles(household_id);
      ALTER TABLE matrimonial_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE matrimonial_profiles ADD COLUMN IF NOT EXISTS referenced_by VARCHAR(150);

      -- Business Profiles Table (Global Business Network - Pillar 2)
      CREATE TABLE IF NOT EXISTS business_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
          created_by_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          status VARCHAR(32) NOT NULL DEFAULT 'pending_review',
          rejection_reason TEXT,
          business_name VARCHAR(255) NOT NULL,
          legal_name VARCHAR(255),
          tagline VARCHAR(300),
          industry_sector VARCHAR(100) NOT NULL,
          business_type VARCHAR(100) NOT NULL,
          year_established INTEGER,
          about_business TEXT NOT NULL,
          offerings_summary TEXT,
          registration_type VARCHAR(50),
          registration_number VARCHAR(100),
          is_verified_badge BOOLEAN NOT NULL DEFAULT FALSE,
          country VARCHAR(100) NOT NULL DEFAULT 'India',
          state VARCHAR(100) NOT NULL,
          city VARCHAR(100) NOT NULL,
          pincode VARCHAR(20),
          address_line TEXT,
          website_url VARCHAR(500),
          social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
          photos TEXT[] NOT NULL DEFAULT '{}',
          custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
          linked_directors JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_business_profiles_status ON business_profiles(status);
      CREATE INDEX IF NOT EXISTS idx_business_profiles_household ON business_profiles(household_id);
      CREATE INDEX IF NOT EXISTS idx_business_profiles_sector ON business_profiles(industry_sector);
      CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);
      CREATE INDEX IF NOT EXISTS idx_business_profiles_created_by ON business_profiles(created_by_member_id);
      ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

      -- Career Profiles Table (Global Jobs & Careers Network - Pillar 4)
      CREATE TABLE IF NOT EXISTS career_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
          member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
          headline VARCHAR(255) NOT NULL,
          career_level VARCHAR(50) NOT NULL,
          primary_domain VARCHAR(100) NOT NULL,
          current_company VARCHAR(255),
          current_designation VARCHAR(255),
          years_of_experience INTEGER NOT NULL DEFAULT 0,
          education_highest VARCHAR(150),
          education_institution VARCHAR(255),
          skills TEXT[] NOT NULL DEFAULT '{}',
          seeking_status VARCHAR(50) NOT NULL DEFAULT 'open_to_offers',
          preferred_locations TEXT[] NOT NULL DEFAULT '{}',
          workplace_preference VARCHAR(50) NOT NULL DEFAULT 'flexible',
          resume_url TEXT,
          bio TEXT,
          linkedin_url TEXT,
          portfolio_url TEXT,
          is_mentor_available BOOLEAN NOT NULL DEFAULT FALSE,
          is_confidential_mode BOOLEAN NOT NULL DEFAULT FALSE,
          status VARCHAR(50) NOT NULL DEFAULT 'live',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_career_profiles_status ON career_profiles(status);
      CREATE INDEX IF NOT EXISTS idx_career_profiles_domain ON career_profiles(primary_domain);
      CREATE INDEX IF NOT EXISTS idx_career_profiles_member ON career_profiles(member_id);
      CREATE INDEX IF NOT EXISTS idx_career_profiles_household ON career_profiles(household_id);
      CREATE INDEX IF NOT EXISTS idx_career_profiles_mentor ON career_profiles(is_mentor_available);
      ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;
    `);
    schemaEnsured = true;
    globalForPg.schemaEnsured = true;
  } catch (err) {
    console.warn("Schema migration non-fatal:", err);
  }
}

const REGISTRATION_CONCURRENCY_LOCK_ID = 2026090601;

async function generateNextHouseholdNo(client: any): Promise<string> {
  try {
    const gapRes = await client.query(`
      WITH existing_nums AS (
        SELECT NULLIF(regexp_replace(serial_no, '[^0-9]', '', 'g'), '')::bigint AS num
        FROM households
        WHERE serial_no LIKE 'HHN-%'
          AND NULLIF(regexp_replace(serial_no, '[^0-9]', '', 'g'), '')::bigint < 10000000
      ),
      bounds AS (
        SELECT 1 AS start_num, LEAST(COALESCE(MAX(num), 0) + 1, 10000000)::bigint AS max_num FROM existing_nums
      ),
      gaps AS (
        SELECT s.n AS next_num
        FROM bounds, generate_series(bounds.start_num, bounds.max_num) s(n)
        WHERE NOT EXISTS (SELECT 1 FROM existing_nums e WHERE e.num = s.n)
        ORDER BY s.n ASC
        LIMIT 1
      )
      SELECT COALESCE((SELECT next_num FROM gaps), 1)::bigint AS next_serial;
    `);
    let count = parseInt(gapRes.rows[0]?.next_serial || "1", 10);
    let candidate = "";
    let isUnique = false;
    while (!isUnique) {
      const part1 = String(Math.floor(count / 1000000) % 1000).padStart(3, "0");
      const part2 = String(Math.floor(count / 1000) % 1000).padStart(3, "0");
      const part3 = String(count % 1000).padStart(3, "0");
      candidate = `HHN-${part1}-${part2}-${part3}`;
      const checkRes = await client.query(
        "SELECT id FROM households WHERE serial_no = $1 OR household_code = $1 LIMIT 1;",
        [candidate]
      );
      if (checkRes.rows.length === 0) {
        isUnique = true;
      } else {
        count++;
      }
    }
    return candidate;
  } catch (e) {
    console.warn("[DB] generateNextHouseholdNo fallback notice:", e);
    const rand = Math.floor(100000000 + Math.random() * 900000000).toString();
    return `HHN-${rand.slice(0, 3)}-${rand.slice(3, 6)}-${rand.slice(6, 9)}`;
  }
}

async function generateNextMemberSerialNo(client: any): Promise<string> {
  try {
    const gapRes = await client.query(`
      WITH existing_nums AS (
        SELECT NULLIF(regexp_replace(serial_no, '[^0-9]', '', 'g'), '')::bigint AS num
        FROM members
        WHERE serial_no LIKE 'MAFL-%'
          AND NULLIF(regexp_replace(serial_no, '[^0-9]', '', 'g'), '')::bigint < 10000000
      ),
      bounds AS (
        SELECT 1 AS start_num, LEAST(COALESCE(MAX(num), 0) + 1, 10000000)::bigint AS max_num FROM existing_nums
      ),
      gaps AS (
        SELECT s.n AS next_num
        FROM bounds, generate_series(bounds.start_num, bounds.max_num) s(n)
        WHERE NOT EXISTS (SELECT 1 FROM existing_nums e WHERE e.num = s.n)
        ORDER BY s.n ASC
        LIMIT 1
      )
      SELECT COALESCE((SELECT next_num FROM gaps), 1)::bigint AS next_serial;
    `);
    let count = parseInt(gapRes.rows[0]?.next_serial || "1", 10);
    let candidate = "";
    let isUnique = false;
    while (!isUnique) {
      const part1 = String(Math.floor(count / 1000000) % 1000).padStart(3, "0");
      const part2 = String(Math.floor(count / 1000) % 1000).padStart(3, "0");
      const part3 = String(count % 1000).padStart(3, "0");
      candidate = `MAFL-${part1}-${part2}-${part3}`;
      const checkRes = await client.query(
        "SELECT id FROM members WHERE serial_no = $1 LIMIT 1;",
        [candidate]
      );
      if (checkRes.rows.length === 0) {
        isUnique = true;
      } else {
        count++;
      }
    }
    return candidate;
  } catch (e) {
    console.warn("[DB] generateNextMemberSerialNo fallback notice:", e);
    const rand = Math.floor(100000000 + Math.random() * 900000000).toString();
    return `MAFL-${rand.slice(0, 3)}-${rand.slice(3, 6)}-${rand.slice(6, 9)}`;
  }
}

async function generateNextSerialNo(client: any): Promise<string> {
  return generateNextHouseholdNo(client);
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
               visibility_contact, visibility_dob, visibility_photo, serial_no as "serialNo"
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
          serialNo: m.serialNo || m.serial_no || "",
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

  async recordAdminAuditLog(entry: {
    adminId: string;
    adminContact: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: any;
    ipAddress?: string;
  }): Promise<void> {
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO admin_audit_logs (admin_id, admin_contact, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          entry.adminId,
          entry.adminContact,
          entry.action,
          entry.targetType,
          entry.targetId,
          JSON.stringify(entry.details || {}),
          entry.ipAddress || null,
        ]
      );
    } catch (e) {
      console.warn("[DB] recordAdminAuditLog warning:", e);
    }
  },

  async getRecentHouseholdWarnings(): Promise<Record<string, string>> {
    if (!pool) return {};
    try {
      const warnings: Record<string, string> = {};

      // 1. Check admin_audit_logs for PASS_GENERATION_WARNING
      const auditRes = await pool.query(`
        SELECT target_id, details, created_at
        FROM admin_audit_logs
        WHERE target_type = 'household' AND action = 'PASS_GENERATION_WARNING'
        ORDER BY created_at DESC
        LIMIT 100;
      `);

      for (const row of auditRes.rows) {
        const hId = String(row.target_id);
        if (!warnings[hId]) {
          const details = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
          const errList = details?.errors;
          if (Array.isArray(errList) && errList.length > 0) {
            const firstErr = errList[0];
            warnings[hId] = `Pass PDF generation warning for ${firstErr.memberName || "member"}: ${firstErr.error || "Generation failed"}`;
          } else {
            warnings[hId] = "Pass PDF generation warning encountered.";
          }
        }
      }

      // 2. Check failed emails in email_queue
      const emailRes = await pool.query(`
        SELECT metadata->>'householdId' as household_id, last_error
        FROM email_queue
        WHERE status = 'failed' AND metadata->>'householdId' IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 100;
      `);

      for (const row of emailRes.rows) {
        const hId = String(row.household_id);
        if (!warnings[hId] && row.last_error) {
          warnings[hId] = `Email dispatch failure: ${row.last_error}`;
        }
      }

      return warnings;
    } catch (err) {
      console.warn("[DB] getRecentHouseholdWarnings error:", err);
      return {};
    }
  },

  async getAdminAuditLogs(limit = 50): Promise<any[]> {
    if (!pool) return [];
    try {
      const res = await pool.query(
        `SELECT id, admin_id as "adminId", admin_contact as "adminContact",
                action, target_type as "targetType", target_id as "targetId",
                details, ip_address as "ipAddress", created_at as "createdAt"
         FROM admin_audit_logs
         ORDER BY created_at DESC
         LIMIT $1;`,
        [limit]
      );
      return res.rows.map((r: any) => ({
        id: String(r.id),
        adminId: r.adminId,
        adminContact: r.adminContact,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        details: typeof r.details === "string" ? JSON.parse(r.details) : r.details,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }));
    } catch (err) {
      console.warn("[DB] getAdminAuditLogs error:", err);
      return [];
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
                visibility_contact, visibility_dob, visibility_photo, serial_no as "serialNo"
         FROM members WHERE household_id = $1 ORDER BY created_at ASC;`,
        [h.id]
      );
      const members = mRes.rows.map(m => ({
        ...m,
        dob: m.dob ? (m.dob instanceof Date ? m.dob.toISOString() : String(m.dob)) : "",
        serialNo: m.serialNo || m.serial_no || "",
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
        aadhaarHash: h.aadhaar_hash,
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

  async getHouseholdByAadhaarHash(aadhaarHash: string): Promise<Household | null> {
    if (!aadhaarHash || !pool) return null;
    try {
      const res = await pool.query(
        `SELECT id, household_code as "householdCode", head_name as "headName", verified_contact as "verifiedContact"
         FROM households WHERE aadhaar_hash = $1 LIMIT 1;`,
        [aadhaarHash]
      );
      if (res.rows.length === 0) return null;
      return res.rows[0] as any;
    } catch {
      return null;
    }
  },

  async createHousehold(household: Household): Promise<Household> {
    if (!pool) return household;
    
    let client;
    try {
      client = await pool.connect();
      // Ensure all required columns and tables exist BEFORE beginning the atomic transaction
      if (!schemaEnsured || !globalForPg.schemaEnsured) {
        try {
          await ensureSchema(client);
        } catch (schemaErr) {
          console.warn("[DB] Pre-registration schema check notice:", schemaErr);
        }
      }
      await client.query("BEGIN");
      // Acquire exclusive transaction advisory lock to completely serialize concurrent family registrations
      await client.query("SELECT pg_advisory_xact_lock($1);", [REGISTRATION_CONCURRENCY_LOCK_ID]);
      
      const serialNo = household.serialNo || (await generateNextHouseholdNo(client));

      const insertHQuery = `
        INSERT INTO households (
          id, household_code, serial_no, head_user_id, head_name, native_place, gotra,
          country, postal_code, state, city, full_address,
          aadhaar_number, aadhaar_hash, pan_number, passport_number, govt_id_number,
          status, verified_contact, consent_accepted_at, password_hash
        )
        VALUES (
          gen_random_uuid(), $1, $2, gen_random_uuid(), $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19
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
        household.aadhaarHash || null,
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

      const createdMembers: Member[] = [];
      for (const m of household.members) {
        const safeDob = sanitizeDate(m.dob);
        const safeRel = sanitizeRelation(m.relationToHead);
        const mSerialNo = (m as any).serialNo || (await generateNextMemberSerialNo(client));

        const insertMQuery = `
          INSERT INTO members (
            id, household_id, full_name, relation_to_head, dob, gender, marital_status,
            current_city, current_country, postal_code, state, full_address,
            profession_freetext, profession_title, profession_description,
            company_name, anniversary_date,
            phone, email, father_name, photo_url, bio,
            aadhaar_number, aadhaar_hash, pan_number, passport_number, govt_id_number,
            visibility_contact, visibility_dob, visibility_photo, verified_by_self, owner_locked,
            password_hash, serial_no
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16,
            $17, $18, $19, $20, $21,
            $22, $23, $24, $25, $26,
            $27, $28, $29, $30, $31,
            $32, $33
          )
          RETURNING id, serial_no;
        `;
        const mRes = await client.query(insertMQuery, [
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
          m.aadhaarHash || (m.relationToHead === "self" ? household.aadhaarHash : null),
          m.panNumber || (m.relationToHead === "self" ? household.panNumber : null),
          m.passportNumber || (m.relationToHead === "self" ? household.passportNumber : null),
          m.govtIdNumber || (m.relationToHead === "self" ? household.govtIdNumber : null),
          m.visibility?.contactInfo || "hidden",
          m.visibility?.dob || "hidden",
          m.visibility?.photo || "public_to_members",
          m.verifiedBySelf || false,
          m.ownerLocked || false,
          m.passwordHash || (safeRel === "self" ? household.passwordHash : null) || null,
          mSerialNo,
        ]);
        createdMembers.push({
          ...m,
          id: mRes.rows[0].id,
          serialNo: mRes.rows[0].serial_no,
        });
      }

      await client.query("COMMIT");
      return { ...household, id: dbHouseholdId, serialNo: actualSerialNo, members: createdMembers };
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
          m.serial_no as "serialNo",
          h.household_code as "householdCode", h.serial_no as "householdSerialNo", h.gotra, h.native_place as "nativePlace", h.status as "householdStatus"
        FROM members m
        JOIN households h ON m.household_id = h.id;
      `;
      const res = await pool.query(query);
      if (res.rows.length === 0) return [];
      return res.rows.map(r => ({
        ...r,
        dob: r.dob ? (r.dob instanceof Date ? r.dob.toISOString() : String(r.dob)) : "",
        serialNo: r.serialNo || r.householdSerialNo || r.householdCode,
        householdSerialNo: r.householdSerialNo || r.householdCode,
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

  async searchMembersPaged(
    filters: {
      name?: string;
      surname?: string;
      gotra?: string | null;
      profession?: string;
      location?: string | null;
      nativePlace?: string;
      minAge?: number | null;
      maxAge?: number | null;
      maritalStatus?: string | null;
      query?: string;
      excludeUserId?: string;
    } = {},
    pagination: { limit?: number; offset?: number } = { limit: 60, offset: 0 }
  ): Promise<{ data: any[]; totalCount: number }> {
    if (!pool) {
      return { data: [], totalCount: 0 };
    }
    try {
      const conditions: string[] = ["h.status = 'live'"];
      const params: any[] = [];

      if (filters.excludeUserId) {
        params.push(filters.excludeUserId);
        conditions.push(`m.id::text != $${params.length}`);
      }

      if (filters.name) {
        params.push(`%${filters.name}%`);
        conditions.push(`m.full_name ILIKE $${params.length}`);
      }

      if (filters.surname) {
        params.push(`%${filters.surname}%`);
        conditions.push(`m.full_name ILIKE $${params.length}`);
      }

      if (filters.gotra && filters.gotra !== "all") {
        params.push(filters.gotra);
        conditions.push(`h.gotra ILIKE $${params.length}`);
      }

      if (filters.profession) {
        params.push(`%${filters.profession}%`);
        conditions.push(`(m.profession_freetext ILIKE $${params.length} OR m.profession_title ILIKE $${params.length} OR m.company_name ILIKE $${params.length})`);
      }

      if (filters.location && filters.location !== "all") {
        params.push(`%${filters.location}%`);
        conditions.push(`(m.current_city ILIKE $${params.length} OR m.current_country ILIKE $${params.length} OR m.state ILIKE $${params.length})`);
      }

      if (filters.nativePlace) {
        params.push(`%${filters.nativePlace}%`);
        conditions.push(`(h.native_place ILIKE $${params.length} OR m.full_address ILIKE $${params.length})`);
      }

      if (filters.maritalStatus && filters.maritalStatus !== "all") {
        params.push(filters.maritalStatus);
        conditions.push(`m.marital_status ILIKE $${params.length}`);
      }

      if (filters.minAge != null && filters.minAge > 0) {
        params.push(`${Math.floor(filters.minAge)} years`);
        conditions.push(`m.dob <= (CURRENT_DATE - $${params.length}::interval)`);
      }

      if (filters.maxAge != null && filters.maxAge < 130) {
        params.push(`${Math.floor(filters.maxAge) + 1} years`);
        conditions.push(`m.dob >= (CURRENT_DATE - $${params.length}::interval)`);
      }

      if (filters.query) {
        params.push(`%${filters.query}%`);
        const p = `$${params.length}`;
        conditions.push(`(
          m.full_name ILIKE ${p} OR
          m.profession_freetext ILIKE ${p} OR
          m.profession_title ILIKE ${p} OR
          m.company_name ILIKE ${p} OR
          m.current_city ILIKE ${p} OR
          h.gotra ILIKE ${p} OR
          h.native_place ILIKE ${p}
        )`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countRes = await pool.query(
        `SELECT COUNT(*)::int as count FROM members m JOIN households h ON m.household_id = h.id ${whereClause};`,
        params
      );
      const totalCount = countRes.rows[0]?.count || 0;

      const limit = Math.min(pagination.limit || 60, 100);
      const offset = Math.max(pagination.offset || 0, 0);
      params.push(limit);
      const limitParam = `$${params.length}`;
      params.push(offset);
      const offsetParam = `$${params.length}`;

      const dataQuery = `
        SELECT 
          m.id, m.household_id, m.full_name as "fullName", m.relation_to_head as "relationToHead",
          m.dob, m.gender, m.marital_status as "maritalStatus", m.current_city as "currentCity",
          m.current_country as "currentCountry", m.postal_code as "postalCode", m.state, m.full_address as "fullAddress",
          m.profession_freetext as "profession", m.profession_title as "professionTitle", m.profession_description as "professionDescription",
          m.company_name as "companyName", m.anniversary_date as "anniversaryDate",
          m.phone, m.email, m.father_name as "fatherName", m.photo_url as "photoUrl", m.bio, m.verified_by_self as "verifiedBySelf",
          m.owner_locked as "ownerLocked", m.visibility_contact, m.visibility_dob, m.visibility_photo,
          m.aadhaar_number as "aadhaarNumber", m.pan_number as "panNumber", m.passport_number as "passportNumber", m.govt_id_number as "govtIdNumber",
          m.serial_no as "serialNo",
          h.household_code as "householdCode", h.serial_no as "householdSerialNo", h.gotra, h.native_place as "nativePlace", h.status as "householdStatus"
        FROM members m
        JOIN households h ON m.household_id = h.id
        ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT ${limitParam} OFFSET ${offsetParam};
      `;

      const dataRes = await pool.query(dataQuery, params);
      const data = dataRes.rows.map(r => ({
        ...r,
        dob: r.dob ? (r.dob instanceof Date ? r.dob.toISOString() : String(r.dob)) : "",
        serialNo: r.serialNo || r.householdSerialNo || r.householdCode,
        householdSerialNo: r.householdSerialNo || r.householdCode,
        visibility: {
          contactInfo: r.visibility_contact,
          dob: r.visibility_dob,
          photo: r.visibility_photo,
        }
      }));

      return { data, totalCount };
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
          m.serial_no as "serialNo",
          h.household_code as "householdCode", h.serial_no as "householdSerialNo", h.gotra, h.native_place as "nativePlace", h.status as "householdStatus"
        FROM members m
        JOIN households h ON m.household_id = h.id
        WHERE m.id::text = $1 OR m.serial_no = $1 OR h.household_code = $1 OR h.serial_no = $1 OR h.id::text = $1;
      `;
      const res = await pool.query(query, [memberId]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        dob: r.dob ? (r.dob instanceof Date ? r.dob.toISOString() : String(r.dob)) : "",
        serialNo: r.serialNo || r.householdSerialNo || r.householdCode,
        householdSerialNo: r.householdSerialNo || r.householdCode,
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
                visibility_contact, visibility_dob, visibility_photo, serial_no as "serialNo"
         FROM members WHERE household_id::text = $1 ORDER BY created_at ASC;`,
        [householdId]
      );
      return res.rows.map(m => ({
        ...m,
        dob: m.dob ? (m.dob instanceof Date ? m.dob.toISOString() : String(m.dob)) : "",
        serialNo: m.serialNo || m.serial_no || "",
        visibility: { contactInfo: m.visibility_contact, dob: m.visibility_dob, photo: m.visibility_photo }
      }));
    } catch (e) { throw e; }
  },

  async addMemberToHousehold(householdId: string, member: Partial<Member>): Promise<any> {
    if (!pool) throw new Error("Database not connected");

    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1);", [REGISTRATION_CONCURRENCY_LOCK_ID]);

      // 1. Quota guard (A04: Resource Exhaustion defense)
      const countRes = await client.query(
        "SELECT COUNT(*)::int as count FROM members WHERE household_id::text = $1;",
        [householdId]
      );
      const count = countRes.rows[0]?.count || 0;
      if (count >= 25) {
        throw new Error("Household has reached maximum member capacity (25 members).");
      }

      // 2. Fetch household for address/native inheritance if not specified
      const hRes = await client.query(
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
      const mSerialNo = member.serialNo || (await generateNextMemberSerialNo(client));

      const insertQuery = `
        INSERT INTO members (
          id, household_id, full_name, relation_to_head, dob, gender, marital_status,
          current_city, current_country, postal_code, state, full_address,
          profession_freetext, profession_title, profession_description,
          company_name, anniversary_date,
          phone, email, father_name, photo_url, bio,
          visibility_contact, visibility_dob, visibility_photo,
          verified_by_self, owner_locked, password_hash, serial_no
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24,
          false, false, null, $25
        ) RETURNING *;
      `;

      const res = await client.query(insertQuery, [
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
        mSerialNo,
      ]);

      await client.query("COMMIT");
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
        serialNo: m.serial_no || mSerialNo,
        visibility: {
          contactInfo: m.visibility_contact,
          dob: m.visibility_dob,
          photo: m.visibility_photo,
        }
      };
    } catch (e) {
      if (client) {
        try { await client.query("ROLLBACK"); } catch {}
      }
      throw e;
    } finally {
      if (client) client.release();
    }
  },

  async updateHouseholdStatus(id: string, status: "live" | "rejected" | "pending_review", rejectionReason?: string): Promise<Household | null> {
    if (!pool) throw new Error("Database not connected");
    try {
      let res;
      if (status === "rejected") {
        // Clear serial numbers on rejection so they are released and can be recycled gap-free
        res = await pool.query(
          "UPDATE households SET status = $1, rejection_reason = $2, serial_no = NULL WHERE id = $3 RETURNING *;",
          [status, rejectionReason || null, id]
        );
        await pool.query(
          "UPDATE members SET serial_no = NULL WHERE household_id = $1;",
          [id]
        );
      } else {
        res = await pool.query(
          "UPDATE households SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *;",
          [status, rejectionReason || null, id]
        );
      }
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

  async resubmitHousehold(householdId: string, household: Household): Promise<Household> {
    if (!pool) return household;

    let client;
    try {
      client = await pool.connect();
      if (!schemaEnsured || !globalForPg.schemaEnsured) {
        try {
          await ensureSchema(client);
        } catch (schemaErr) {
          console.warn("[DB] Pre-registration schema check notice:", schemaErr);
        }
      }
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1);", [REGISTRATION_CONCURRENCY_LOCK_ID]);

      const serialNo = await generateNextHouseholdNo(client);

      const updateHQuery = `
        UPDATE households SET
          serial_no = $1,
          head_name = $2,
          native_place = $3,
          gotra = $4,
          country = $5,
          postal_code = $6,
          state = $7,
          city = $8,
          full_address = $9,
          aadhaar_number = $10,
          aadhaar_hash = $11,
          pan_number = $12,
          passport_number = $13,
          govt_id_number = $14,
          status = 'pending_review',
          rejection_reason = NULL,
          consent_accepted_at = $15,
          password_hash = COALESCE($16, password_hash)
        WHERE id = $17
        RETURNING id, serial_no, household_code;
      `;
      const hRes = await client.query(updateHQuery, [
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
        household.aadhaarHash || null,
        household.panNumber || null,
        household.passportNumber || null,
        household.govtIdNumber || null,
        household.consentAcceptedAt || new Date().toISOString(),
        household.passwordHash || null,
        householdId,
      ]);
      if (hRes.rows.length === 0) {
        throw new Error(`Household ${householdId} not found for resubmission.`);
      }
      const actualSerialNo = hRes.rows[0].serial_no || serialNo;
      const householdCode = hRes.rows[0].household_code || household.householdCode;

      // Delete previous members and insert updated members
      await client.query("DELETE FROM members WHERE household_id = $1;", [householdId]);

      const createdMembers: Member[] = [];
      for (const m of household.members) {
        const safeDob = sanitizeDate(m.dob);
        const safeRel = sanitizeRelation(m.relationToHead);
        const mSerialNo = await generateNextMemberSerialNo(client);

        const insertMQuery = `
          INSERT INTO members (
            id, household_id, full_name, relation_to_head, dob, gender, marital_status,
            current_city, current_country, postal_code, state, full_address,
            profession_freetext, profession_title, profession_description,
            company_name, anniversary_date,
            phone, email, father_name, photo_url, bio,
            aadhaar_number, aadhaar_hash, pan_number, passport_number, govt_id_number,
            visibility_contact, visibility_dob, visibility_photo, verified_by_self, owner_locked,
            password_hash, serial_no
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16,
            $17, $18, $19, $20, $21,
            $22, $23, $24, $25, $26,
            $27, $28, $29, $30, $31,
            $32, $33
          )
          RETURNING id, serial_no;
        `;
        const mRes = await client.query(insertMQuery, [
          householdId,
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
          m.aadhaarHash || (m.relationToHead === "self" ? household.aadhaarHash : null),
          m.panNumber || (m.relationToHead === "self" ? household.panNumber : null),
          m.passportNumber || (m.relationToHead === "self" ? household.passportNumber : null),
          m.govtIdNumber || (m.relationToHead === "self" ? household.govtIdNumber : null),
          m.visibility?.contactInfo || "hidden",
          m.visibility?.dob || "hidden",
          m.visibility?.photo || "public_to_members",
          m.verifiedBySelf || false,
          m.ownerLocked || false,
          m.passwordHash || (safeRel === "self" ? household.passwordHash : null) || null,
          mSerialNo,
        ]);
        createdMembers.push({
          ...m,
          id: mRes.rows[0].id,
          serialNo: mRes.rows[0].serial_no,
        });
      }

      await client.query("COMMIT");
      return { ...household, id: householdId, householdCode, serialNo: actualSerialNo, members: createdMembers };
    } catch (e) {
      if (client) {
        try { await client.query("ROLLBACK"); } catch {}
      }
      throw e;
    } finally {
      if (client) client.release();
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
          `SELECT m.*, COALESCE(m.password_hash, h.password_hash) as "passwordHash", h.household_code as "householdCode", h.serial_no as "householdSerialNo", m.serial_no as "memberSerialNo", h.status as "householdStatus"
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
            serialNo: r.memberSerialNo || r.householdSerialNo || r.householdCode,
            passwordHash: r.passwordHash || r.password_hash,
          };
        }

        // 2. Search in households table by verified email contact (head of household)
        const hRes = await pool.query(
          `SELECT m.*, COALESCE(m.password_hash, h.password_hash) as "passwordHash", h.household_code as "householdCode", h.serial_no as "householdSerialNo", m.serial_no as "memberSerialNo", h.status as "householdStatus"
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
            serialNo: r.memberSerialNo || r.householdSerialNo || r.householdCode,
            passwordHash: r.passwordHash || r.password_hash,
          };
        }

        return null;
      } else {
        const phoneLike = last10 ? `%${last10}` : canonical;
        // 1. Search in members table by phone
        const mRes = await pool.query(
          `SELECT m.*, COALESCE(m.password_hash, h.password_hash) as "passwordHash", h.household_code as "householdCode", h.serial_no as "householdSerialNo", m.serial_no as "memberSerialNo", h.status as "householdStatus"
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
            serialNo: r.memberSerialNo || r.householdSerialNo || r.householdCode,
            passwordHash: r.passwordHash || r.password_hash,
          };
        }

        // 2. Search in households table by verified phone (head of household)
        const hRes = await pool.query(
          `SELECT m.*, COALESCE(m.password_hash, h.password_hash) as "passwordHash", h.household_code as "householdCode", h.serial_no as "householdSerialNo", m.serial_no as "memberSerialNo", h.status as "householdStatus"
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
            serialNo: r.memberSerialNo || r.householdSerialNo || r.householdCode,
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
             visibility_photo = COALESCE($18, visibility_photo),
             relation_to_head = COALESCE($19, relation_to_head)
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
          updates.relationToHead ? updates.relationToHead.toLowerCase() : null,
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
    messageBody?: string | null;
    isFlagged?: boolean;
    flagReason?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    attachmentName?: string;
    attachmentSize?: number;
  }): Promise<any> {
    if (!pool) throw new Error("Database not connected");
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const insertRes = await client.query(
        `INSERT INTO messages (id, conversation_id, sender_id, recipient_id, message_body, is_flagged, flag_reason, attachment_url, attachment_type, attachment_name, attachment_size, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, NOW())
         RETURNING *;`,
        [
          data.conversationId,
          data.senderId,
          data.recipientId,
          data.messageBody?.trim() || null,
          data.isFlagged || false,
          data.flagReason || null,
          data.attachmentUrl || null,
          data.attachmentType || null,
          data.attachmentName || null,
          data.attachmentSize || null,
        ]
      );
      const msg = insertRes.rows[0];

      // Update conversation timestamp and preview
      const preview = data.messageBody?.trim().slice(0, 100) || (data.attachmentName ? `📎 ${data.attachmentName}` : "Attachment");
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
           m.attachment_url as "attachmentUrl", m.attachment_type as "attachmentType",
           m.attachment_name as "attachmentName", m.attachment_size as "attachmentSize",
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

  async checkChatRateLimits(
    memberId: string,
    isNewConversation: boolean
  ): Promise<{ allowed: boolean; error?: string }> {
    if (!pool) return { allowed: true };
    try {
      if (isNewConversation) {
        const convRes = await pool.query(
          `SELECT COUNT(*)::int as count 
           FROM conversations 
           WHERE initiator_id = $1::uuid 
             AND created_at > NOW() - INTERVAL '1 day';`,
          [memberId]
        );
        if ((convRes.rows[0]?.count || 0) >= 10) {
          return {
            allowed: false,
            error: "Daily limit reached: Maximum 10 new message requests allowed per day.",
          };
        }
      }

      const msgRes = await pool.query(
        `SELECT COUNT(*)::int as count 
         FROM messages 
         WHERE sender_id = $1::uuid 
           AND created_at > NOW() - INTERVAL '1 hour';`,
        [memberId]
      );
      if ((msgRes.rows[0]?.count || 0) >= 60) {
        return {
          allowed: false,
          error: "Rate limit exceeded: Maximum 60 messages allowed per hour.",
        };
      }

      return { allowed: true };
    } catch (e) {
      console.warn("[RATE LIMIT CHECK NON-FATAL]:", e);
      return { allowed: true };
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

  async checkDbRateLimit(key: string, action: string, maxRequests = 40, windowSeconds = 60): Promise<boolean> {
    if (!pool) return true;
    try {
      const res = await pool.query(
        `SELECT COUNT(*)::int as count FROM action_rate_limits
         WHERE key = $1 AND action = $2 AND created_at > NOW() - ($3 || ' seconds')::interval;`,
        [key, action, windowSeconds]
      );
      const count = res.rows[0]?.count || 0;
      if (count >= maxRequests) return false;

      await pool.query(
        `INSERT INTO action_rate_limits (id, key, action, created_at)
         VALUES (gen_random_uuid(), $1, $2, NOW());`,
        [key, action]
      );
      return true;
    } catch (err) {
      console.warn("[DB RATE LIMIT FALLBACK]", err);
      return true;
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
      `UPDATE ${table} SET password_hash = $1 WHERE id = $2;`,
      [newHash, id]
    );
  },

  // --- SUPPORT INQUIRIES & SECRETARIAT DESK ---
  async createSupportInquiry(data: CreateInquiryInput): Promise<SupportInquiry> {
    const ticketId = `INQ-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    if (!pool) {
      const memoryInquiry: SupportInquiry = {
        id: `inq-${Date.now()}`,
        ticketId,
        name: data.name,
        email: data.email,
        category: data.category,
        message: data.message,
        status: "open",
        ipAddress: data.ipAddress,
        createdAt: now,
      };
      (globalThis as any).__memoryInquiries = (globalThis as any).__memoryInquiries || [];
      (globalThis as any).__memoryInquiries.unshift(memoryInquiry);
      return memoryInquiry;
    }

    try {
      const res = await pool.query(
        `INSERT INTO support_inquiries (ticket_id, name, email, category, message, status, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, 'open', $6, NOW())
         RETURNING id, ticket_id as "ticketId", name, email, category, message, status, admin_notes as "adminNotes", ip_address as "ipAddress", created_at as "createdAt";`,
        [ticketId, data.name, data.email, data.category, data.message, data.ipAddress || null]
      );
      const row = res.rows[0];
      return {
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      };
    } catch (err) {
      console.error("[DB ERROR] createSupportInquiry:", err);
      throw err;
    }
  },

  async getSupportInquiries(): Promise<SupportInquiry[]> {
    if (!pool) {
      return (globalThis as any).__memoryInquiries || [];
    }
    try {
      const res = await pool.query(
        `SELECT id, ticket_id as "ticketId", name, email, category, message, status, admin_notes as "adminNotes", ip_address as "ipAddress", created_at as "createdAt"
         FROM support_inquiries
         ORDER BY created_at DESC;`
      );
      return res.rows.map((row: any) => ({
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      }));
    } catch (err) {
      console.error("[DB ERROR] getSupportInquiries:", err);
      return [];
    }
  },

  async updateSupportInquiryStatus(idOrTicketId: string, status: InquiryStatus, adminNotes?: string): Promise<boolean> {
    if (!pool) {
      const list: SupportInquiry[] = (globalThis as any).__memoryInquiries || [];
      const item = list.find((i) => i.id === idOrTicketId || i.ticketId === idOrTicketId);
      if (item) {
        item.status = status;
        if (adminNotes !== undefined) item.adminNotes = adminNotes;
        return true;
      }
      return false;
    }
    try {
      const res = await pool.query(
        `UPDATE support_inquiries
         SET status = $1, admin_notes = COALESCE($2, admin_notes)
         WHERE id::text = $3 OR ticket_id = $3;`,
        [status, adminNotes !== undefined ? adminNotes : null, idOrTicketId]
      );
      return (res.rowCount || 0) > 0;
    } catch (err) {
      console.error("[DB ERROR] updateSupportInquiryStatus:", err);
      return false;
    }
  },

  async checkSupportRateLimit(ipAddress: string): Promise<{ allowed: boolean; error?: string }> {
    if (!pool) return { allowed: true };
    try {
      const res = await pool.query(
        `SELECT COUNT(*)::int as count FROM support_inquiries
         WHERE ip_address = $1
           AND created_at > NOW() - INTERVAL '1 hour';`,
        [ipAddress]
      );
      if ((res.rows[0]?.count || 0) >= 5) {
        return {
          allowed: false,
          error: "You have reached the maximum inquiry limit (5 per hour). Please wait before submitting again, or contact us directly on WhatsApp (+65 9277 4444).",
        };
      }
      return { allowed: true };
    } catch (err) {
      console.warn("DB support rate limit check non-fatal:", err);
      return { allowed: true };
    }
  },

  // ==========================================
  // MATRIMONIAL PROFILES METHODS
  // ==========================================

  async createMatrimonialProfile(p: any): Promise<MatrimonialProfile> {
    if (!pool) {
      const list: MatrimonialProfile[] = ((globalThis as any).__memoryMatrimonialProfiles =
        (globalThis as any).__memoryMatrimonialProfiles || []);
      const existing = list.find((item) => item.memberId === p.memberId);
      if (existing) throw new Error("A matrimonial profile already exists for this member.");
      const newProfile = mapMatrimonialRow({
        id: crypto.randomUUID(),
        ...p,
        created_at: new Date(),
        updated_at: new Date(),
      });
      list.unshift(newProfile);
      return newProfile;
    }

    const query = `
      INSERT INTO matrimonial_profiles (
        household_id, member_id, created_by_user_id, status, gender, full_name, created_for,
        marital_status, dob, place_of_birth, height_cm, height_display, weight_build,
        complexion, blood_group, mother_tongue, languages_spoken, diet, smoke_drink,
        physical_status, about_me, gotra, highest_education, degree_name, college_name,
        schooling_honors, employment_sector, occupation_title, company_name, annual_income,
        work_city, work_country, willing_to_relocate, father_name, father_member_id,
        father_occupation, mother_name, mother_member_id, mother_occupation, linked_siblings,
        native_place, family_location, family_type, family_values, family_financial_status,
        about_family, custom_fields, photos, partner_preferences, contact_person,
        contact_relation, contact_phone, secondary_phone, contact_email, residential_address,
        referenced_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35,
        $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45,
        $46, $47, $48, $49, $50,
        $51, $52, $53, $54, $55,
        $56
      ) RETURNING *;
    `;

    const values = [
      p.householdId,
      p.memberId,
      p.createdByUserId,
      p.status || "active",
      p.gender,
      p.fullName,
      p.createdFor || "Self",
      p.maritalStatus || "Never Married",
      p.dob,
      p.placeOfBirth || null,
      p.heightCm ? parseInt(p.heightCm, 10) : null,
      p.heightDisplay || null,
      p.weightBuild || null,
      p.complexion || null,
      p.bloodGroup || null,
      p.motherTongue || "Hindi",
      p.languagesSpoken || [],
      p.diet || "Vegetarian",
      p.smokeDrink || "Non-Smoker / Non-Drinker",
      p.physicalStatus || "Normal",
      p.aboutMe || null,
      p.gotra,
      p.highestEducation,
      p.degreeName || null,
      p.collegeName || null,
      p.schoolingHonors || null,
      p.employmentSector,
      p.occupationTitle,
      p.companyName || null,
      p.annualIncome || null,
      p.workCity || null,
      p.workCountry || "India",
      p.willingToRelocate || "Yes",
      p.fatherName,
      p.fatherMemberId || null,
      p.fatherOccupation || null,
      p.motherName,
      p.motherMemberId || null,
      p.motherOccupation || null,
      JSON.stringify(p.linkedSiblings || []),
      p.nativePlace,
      p.familyLocation,
      p.familyType || "Nuclear",
      p.familyValues || "Traditional",
      p.familyFinancialStatus || "Upper Middle Class",
      p.aboutFamily || null,
      JSON.stringify(p.customFields || []),
      JSON.stringify(p.photos || []),
      JSON.stringify(p.partnerPreferences || {}),
      p.contactPerson,
      p.contactRelation,
      p.contactPhone,
      p.secondaryPhone || null,
      p.contactEmail || null,
      p.residentialAddress || null,
      p.referencedBy || null,
    ];

    const res = await pool.query(query, values);
    return mapMatrimonialRow(res.rows[0]);
  },

  async getMatrimonialProfiles(filters: MatrimonyFilter = {}): Promise<{ profiles: MatrimonialProfile[]; totalCount: number }> {
    if (!pool) {
      let list: MatrimonialProfile[] = ((globalThis as any).__memoryMatrimonialProfiles =
        (globalThis as any).__memoryMatrimonialProfiles || []);
      list = list.filter((p) => p.status === "active");
      if (filters.gender && filters.gender !== "all") {
        list = list.filter((p) => p.gender === filters.gender);
      }
      if (filters.gotra && filters.gotra !== "All") {
        list = list.filter((p) => p.gotra.toLowerCase() === filters.gotra?.toLowerCase());
      }
      if (filters.name) {
        const q = filters.name.toLowerCase();
        list = list.filter((p) => p.fullName.toLowerCase().includes(q));
      }
      return { profiles: list, totalCount: list.length };
    }

    try {
      const conditions: string[] = ["mp.status = 'active'"];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters.gender && filters.gender !== "all") {
        conditions.push(`mp.gender = $${paramIndex++}`);
        values.push(filters.gender);
      }

      if (filters.gotra && filters.gotra !== "All") {
        conditions.push(`LOWER(mp.gotra) = LOWER($${paramIndex++})`);
        values.push(filters.gotra);
      }

      if (filters.name && filters.name.trim()) {
        conditions.push(`mp.full_name ILIKE $${paramIndex++}`);
        values.push(`%${filters.name.trim()}%`);
      }

      if (filters.location && filters.location.trim()) {
        const loc = `%${filters.location.trim()}%`;
        conditions.push(`(mp.work_city ILIKE $${paramIndex} OR mp.family_location ILIKE $${paramIndex} OR mp.native_place ILIKE $${paramIndex})`);
        values.push(loc);
        paramIndex++;
      }

      if (filters.minAge && !isNaN(filters.minAge)) {
        conditions.push(`mp.dob <= CURRENT_DATE - make_interval(years => $${paramIndex++}::int)`);
        values.push(Number(filters.minAge));
      }

      if (filters.maxAge && !isNaN(filters.maxAge)) {
        conditions.push(`mp.dob >= CURRENT_DATE - make_interval(years => $${paramIndex++}::int) - interval '1 year'`);
        values.push(Number(filters.maxAge));
      }

      if (filters.minHeightCm && !isNaN(filters.minHeightCm)) {
        conditions.push(`mp.height_cm >= $${paramIndex++}`);
        values.push(filters.minHeightCm);
      }

      if (filters.maxHeightCm && !isNaN(filters.maxHeightCm)) {
        conditions.push(`mp.height_cm <= $${paramIndex++}`);
        values.push(filters.maxHeightCm);
      }

      if (filters.highestEducation && filters.highestEducation !== "All") {
        conditions.push(`mp.highest_education = $${paramIndex++}`);
        values.push(filters.highestEducation);
      }

      if (filters.employmentSector && filters.employmentSector !== "All") {
        conditions.push(`mp.employment_sector = $${paramIndex++}`);
        values.push(filters.employmentSector);
      }

      if (filters.maritalStatus && filters.maritalStatus !== "All") {
        conditions.push(`mp.marital_status = $${paramIndex++}`);
        values.push(filters.maritalStatus);
      }

      if (filters.nativePlace && filters.nativePlace.trim()) {
        conditions.push(`mp.native_place ILIKE $${paramIndex++}`);
        values.push(`%${filters.nativePlace.trim()}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countRes = await pool.query(
        `SELECT COUNT(*)::int as total FROM matrimonial_profiles mp ${whereClause};`,
        values
      );
      const totalCount = countRes.rows[0]?.total || 0;

      const limit = filters.limit || 50;
      const offset = ((filters.page || 1) - 1) * limit;

      const query = `
        SELECT mp.*,
               fm.serial_no as father_serial,
               mm.serial_no as mother_serial
        FROM matrimonial_profiles mp
        LEFT JOIN members fm ON mp.father_member_id = fm.id
        LEFT JOIN members mm ON mp.mother_member_id = mm.id
        ${whereClause}
        ORDER BY mp.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++};
      `;
      values.push(limit, offset);

      const res = await pool.query(query, values);
      const profiles = res.rows.map(mapMatrimonialRow);

      return { profiles, totalCount };
    } catch (err) {
      console.error("[DB ERROR] getMatrimonialProfiles:", err);
      return { profiles: [], totalCount: 0 };
    }
  },

  async getMatrimonialProfileById(id: string): Promise<MatrimonialProfile | null> {
    if (!pool) {
      const list: MatrimonialProfile[] = ((globalThis as any).__memoryMatrimonialProfiles =
        (globalThis as any).__memoryMatrimonialProfiles || []);
      const item = list.find((p) => p.id === id);
      return item || null;
    }
    try {
      const query = `
        SELECT mp.*,
               fm.serial_no as father_serial,
               mm.serial_no as mother_serial
        FROM matrimonial_profiles mp
        LEFT JOIN members fm ON mp.father_member_id = fm.id
        LEFT JOIN members mm ON mp.mother_member_id = mm.id
        WHERE mp.id::text = $1;
      `;
      const res = await pool.query(query, [id]);
      if (res.rows.length === 0) return null;
      return mapMatrimonialRow(res.rows[0]);
    } catch (err) {
      console.error("[DB ERROR] getMatrimonialProfileById:", err);
      return null;
    }
  },

  async getMatrimonialProfileByMemberId(memberId: string): Promise<MatrimonialProfile | null> {
    if (!pool) {
      const list: MatrimonialProfile[] = ((globalThis as any).__memoryMatrimonialProfiles =
        (globalThis as any).__memoryMatrimonialProfiles || []);
      const item = list.find((p) => p.memberId === memberId);
      return item || null;
    }
    try {
      const query = `
        SELECT mp.*,
               fm.serial_no as father_serial,
               mm.serial_no as mother_serial
        FROM matrimonial_profiles mp
        LEFT JOIN members fm ON mp.father_member_id = fm.id
        LEFT JOIN members mm ON mp.mother_member_id = mm.id
        WHERE mp.member_id::text = $1;
      `;
      const res = await pool.query(query, [memberId]);
      if (res.rows.length === 0) return null;
      return mapMatrimonialRow(res.rows[0]);
    } catch (err) {
      console.error("[DB ERROR] getMatrimonialProfileByMemberId:", err);
      return null;
    }
  },

  async getHouseholdMatrimonialProfiles(householdId: string): Promise<MatrimonialProfile[]> {
    if (!pool) {
      const list: MatrimonialProfile[] = ((globalThis as any).__memoryMatrimonialProfiles =
        (globalThis as any).__memoryMatrimonialProfiles || []);
      return list.filter((p) => p.householdId === householdId);
    }
    try {
      const query = `
        SELECT mp.*,
               fm.serial_no as father_serial,
               mm.serial_no as mother_serial
        FROM matrimonial_profiles mp
        LEFT JOIN members fm ON mp.father_member_id = fm.id
        LEFT JOIN members mm ON mp.mother_member_id = mm.id
        WHERE mp.household_id::text = $1
        ORDER BY mp.created_at DESC;
      `;
      const res = await pool.query(query, [householdId]);
      return res.rows.map(mapMatrimonialRow);
    } catch (err) {
      console.error("[DB ERROR] getHouseholdMatrimonialProfiles:", err);
      return [];
    }
  },

  async updateMatrimonialProfile(id: string, data: Partial<MatrimonialProfile>, householdId?: string): Promise<MatrimonialProfile | null> {
    if (!pool) {
      const list: MatrimonialProfile[] = ((globalThis as any).__memoryMatrimonialProfiles =
        (globalThis as any).__memoryMatrimonialProfiles || []);
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
      return list[idx];
    }
    try {
      const sets: string[] = ["updated_at = NOW()"];
      const values: any[] = [id];
      let paramIndex = 2;

      if (data.status !== undefined) {
        sets.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }
      if (data.aboutMe !== undefined) {
        sets.push(`about_me = $${paramIndex++}`);
        values.push(data.aboutMe);
      }
      if (data.heightCm !== undefined) {
        sets.push(`height_cm = $${paramIndex++}`);
        values.push(data.heightCm);
      }
      if (data.heightDisplay !== undefined) {
        sets.push(`height_display = $${paramIndex++}`);
        values.push(data.heightDisplay);
      }
      if (data.photos !== undefined) {
        sets.push(`photos = $${paramIndex++}`);
        values.push(JSON.stringify(data.photos));
      }
      if (data.customFields !== undefined) {
        sets.push(`custom_fields = $${paramIndex++}`);
        values.push(JSON.stringify(data.customFields));
      }
      if (data.partnerPreferences !== undefined) {
        sets.push(`partner_preferences = $${paramIndex++}`);
        values.push(JSON.stringify(data.partnerPreferences));
      }

      let extraWhere = "";
      if (householdId) {
        extraWhere = ` AND household_id::text = $${paramIndex++}`;
        values.push(householdId);
      }

      const query = `
        UPDATE matrimonial_profiles
        SET ${sets.join(", ")}
        WHERE id::text = $1 ${extraWhere}
        RETURNING *;
      `;
      const res = await pool.query(query, values);
      if (res.rows.length === 0) return null;
      return mapMatrimonialRow(res.rows[0]);
    } catch (err) {
      console.error("[DB ERROR] updateMatrimonialProfile:", err);
      return null;
    }
  },

  async deleteMatrimonialProfile(id: string, householdId?: string): Promise<boolean> {
    if (!pool) {
      const list: MatrimonialProfile[] = ((globalThis as any).__memoryMatrimonialProfiles =
        (globalThis as any).__memoryMatrimonialProfiles || []);
      const idx = list.findIndex((p) => p.id === id);
      if (idx !== -1) {
        list.splice(idx, 1);
        return true;
      }
      return false;
    }
    try {
      let query = `DELETE FROM matrimonial_profiles WHERE id::text = $1`;
      const values: any[] = [id];
      if (householdId) {
        query += ` AND household_id::text = $2`;
        values.push(householdId);
      }
      const res = await pool.query(query, values);
      return (res.rowCount || 0) > 0;
    } catch (err) {
      console.error("[DB ERROR] deleteMatrimonialProfile:", err);
      return false;
    }
  },

  async saveRegistrationDraft(data: {
    email: string;
    phone: string;
    phoneDialCode?: string;
    headName?: string;
    currentStep?: number;
    formData?: Record<string, any>;
  }): Promise<boolean> {
    if (!pool) return false;
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanPhone = data.phone.trim();
      const dialCode = data.phoneDialCode?.trim() || "+91";
      const headName = data.headName?.trim() || null;
      const step = data.currentStep || 2;
      const safeFormData = data.formData ? JSON.stringify(data.formData) : "{}";

      await pool.query(
        `INSERT INTO registration_drafts (email, phone, phone_dial_code, head_name, current_step, is_completed, form_data, updated_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6::jsonb, NOW())
         ON CONFLICT (email) DO UPDATE SET
           phone = EXCLUDED.phone,
           phone_dial_code = EXCLUDED.phone_dial_code,
           head_name = COALESCE(EXCLUDED.head_name, registration_drafts.head_name),
           current_step = EXCLUDED.current_step,
           form_data = CASE WHEN $6::jsonb = '{}'::jsonb THEN registration_drafts.form_data ELSE $6::jsonb END,
           updated_at = NOW()
         WHERE registration_drafts.is_completed = FALSE;`,
        [cleanEmail, cleanPhone, dialCode, headName, step, safeFormData]
      );
      return true;
    } catch (err) {
      console.warn("Save registration draft non-fatal notice:", err);
      return false;
    }
  },

  async getRegistrationDraft(contact: string): Promise<{
    hasDraft: boolean;
    step?: number;
    headName?: string | null;
    formData?: Record<string, any>;
  }> {
    if (!pool || !contact) return { hasDraft: false };
    try {
      const clean = contact.trim().toLowerCase();
      const res = await pool.query(
        `SELECT current_step as "currentStep", head_name as "headName", form_data as "formData"
         FROM registration_drafts
         WHERE (LOWER(email) = $1 OR phone = $1) AND is_completed = FALSE
         ORDER BY updated_at DESC
         LIMIT 1;`,
        [clean]
      );
      if (res.rows.length === 0) return { hasDraft: false };
      const r = res.rows[0];
      return {
        hasDraft: true,
        step: r.currentStep,
        headName: r.headName,
        formData: typeof r.formData === "string" ? JSON.parse(r.formData) : (r.formData || {}),
      };
    } catch (err) {
      console.warn("Get registration draft notice:", err);
      return { hasDraft: false };
    }
  },

  async discardRegistrationDraft(contact: string): Promise<boolean> {
    if (!pool || !contact) return false;
    try {
      const clean = contact.trim().toLowerCase();
      await pool.query(
        `DELETE FROM registration_drafts 
         WHERE (LOWER(email) = $1 OR phone = $1) AND is_completed = FALSE;`,
        [clean]
      );
      return true;
    } catch (err) {
      console.warn("Discard registration draft notice:", err);
      return false;
    }
  },

  async markRegistrationDraftCompleted(email: string, phone?: string): Promise<boolean> {
    if (!pool) return false;
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone?.trim() || "";
      await pool.query(
        `UPDATE registration_drafts 
         SET is_completed = TRUE, updated_at = NOW() 
         WHERE (LOWER(email) = $1 OR (phone = $2 AND $2 != '')) AND is_completed = FALSE;`,
        [cleanEmail, cleanPhone]
      );
      return true;
    } catch (err) {
      console.warn("Mark registration draft completed notice:", err);
      return false;
    }
  },

  async getIncompleteRegistrations(): Promise<Array<{
    id: string;
    email: string;
    phone: string;
    phoneDialCode: string;
    headName: string | null;
    currentStep: number;
    createdAt: string;
    updatedAt: string;
  }>> {
    if (!pool) throw new Error("Database not connected");
    const res = await pool.query(
      `SELECT id, email, phone, phone_dial_code as "phoneDialCode", head_name as "headName",
              current_step as "currentStep", created_at as "createdAt", updated_at as "updatedAt"
       FROM registration_drafts
       WHERE is_completed = FALSE
       ORDER BY updated_at DESC;`
    );
    return res.rows.map((r: any) => ({
      id: String(r.id),
      email: r.email,
      phone: r.phone,
      phoneDialCode: r.phoneDialCode || "+91",
      headName: r.headName || null,
      currentStep: r.currentStep,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    }));
  },

  async enqueueEmail(job: EnqueueEmailInput): Promise<string | null> {
    if (!pool) return null;
    try {
      const cleanEmail = job.recipientEmail.trim().toLowerCase();
      const cleanName = job.recipientName?.trim() || null;
      const scheduledFor = job.scheduledFor ? job.scheduledFor.toISOString() : new Date().toISOString();
      const attachments = job.attachments ? JSON.stringify(job.attachments) : null;
      const metadata = JSON.stringify(job.metadata || {});

      const res = await pool.query(
        `INSERT INTO email_queue (recipient_email, recipient_name, subject, html_body, text_body, attachments, metadata, scheduled_for)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id;`,
        [cleanEmail, cleanName, job.subject, job.htmlBody, job.textBody || null, attachments, metadata, scheduledFor]
      );
      return res.rows[0]?.id || null;
    } catch (err) {
      console.error("[DB] Failed to enqueue email:", err);
      return null;
    }
  },

  async claimNextEmailJob(): Promise<EmailQueueItem | null> {
    if (!pool) return null;
    try {
      const res = await pool.query(
        `UPDATE email_queue
         SET status = 'processing', updated_at = NOW()
         WHERE id = (
           SELECT id FROM email_queue
           WHERE status = 'pending' AND scheduled_for <= NOW()
           ORDER BY scheduled_for ASC, created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, recipient_email as "recipientEmail", recipient_name as "recipientName",
                   subject, html_body as "htmlBody", text_body as "textBody",
                   attachments, metadata, status, attempts, max_attempts as "maxAttempts",
                   last_error as "lastError", resend_id as "resendId",
                   scheduled_for as "scheduledFor", sent_at as "sentAt",
                   created_at as "createdAt", updated_at as "updatedAt";`
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        attachments: typeof r.attachments === "string" ? JSON.parse(r.attachments) : r.attachments,
        metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : (r.metadata || {}),
      };
    } catch (err) {
      console.error("[DB] claimNextEmailJob notice:", err);
      return null;
    }
  },

  async markEmailSent(id: string, resendId: string): Promise<boolean> {
    if (!pool) return false;
    try {
      await pool.query(
        `UPDATE email_queue
         SET status = 'sent', resend_id = $2, sent_at = NOW(), updated_at = NOW()
         WHERE id = $1;`,
        [id, resendId]
      );
      return true;
    } catch (err) {
      console.error("[DB] markEmailSent error:", err);
      return false;
    }
  },

  async markEmailFailed(id: string, error: string, isTerminal = false): Promise<boolean> {
    if (!pool) return false;
    try {
      if (isTerminal) {
        await pool.query(
          `UPDATE email_queue
           SET status = 'failed', last_error = $2, attempts = attempts + 1, updated_at = NOW()
           WHERE id = $1;`,
          [id, error]
        );
      } else {
        await pool.query(
          `UPDATE email_queue
           SET attempts = attempts + 1,
               last_error = $2,
               status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END,
               scheduled_for = CASE WHEN attempts + 1 >= max_attempts THEN scheduled_for ELSE NOW() + (INTERVAL '2 seconds' * (attempts + 1)) END,
               updated_at = NOW()
           WHERE id = $1;`,
          [id, error]
        );
      }
      return true;
    } catch (err) {
      console.error("[DB] markEmailFailed error:", err);
      return false;
    }
  },

  async getEmailQueueStats(): Promise<EmailQueueStats> {
    if (!pool) return { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 };
    try {
      const res = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'pending') as pending,
           COUNT(*) FILTER (WHERE status = 'processing') as processing,
           COUNT(*) FILTER (WHERE status = 'sent') as sent,
           COUNT(*) FILTER (WHERE status = 'failed') as failed,
           COUNT(*) as total
         FROM email_queue;`
      );
      const row = res.rows[0];
      return {
        pending: parseInt(row.pending || "0", 10),
        processing: parseInt(row.processing || "0", 10),
        sent: parseInt(row.sent || "0", 10),
        failed: parseInt(row.failed || "0", 10),
        total: parseInt(row.total || "0", 10),
      };
    } catch (err) {
      console.error("[DB] getEmailQueueStats error:", err);
      return { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 };
    }
  },

  async getRecentEmailQueueLogs(limit = 50): Promise<Array<Partial<EmailQueueItem>>> {
    if (!pool) return [];
    try {
      const res = await pool.query(
        `SELECT id, recipient_email as "recipientEmail", recipient_name as "recipientName",
                subject, status, attempts, last_error as "lastError", resend_id as "resendId",
                created_at as "createdAt", sent_at as "sentAt"
         FROM email_queue
         ORDER BY created_at DESC
         LIMIT $1;`,
        [limit]
      );
      return res.rows.map((r: any) => ({
        id: String(r.id),
        recipientEmail: r.recipientEmail,
        recipientName: r.recipientName,
        subject: r.subject,
        status: r.status,
        attempts: r.attempts,
        lastError: r.lastError,
        resendId: r.resendId,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : r.sentAt ? String(r.sentAt) : null,
      }));
    } catch (err) {
      console.error("[DB] getRecentEmailQueueLogs error:", err);
      return [];
    }
  },

  async retryFailedEmailQueueItems(): Promise<number> {
    if (!pool) return 0;
    try {
      const res = await pool.query(
        `WITH reset_items AS (
           UPDATE email_queue
           SET status = 'pending', attempts = 0, scheduled_for = NOW(), updated_at = NOW()
           WHERE status = 'failed'
           RETURNING id
         )
         SELECT count(*) as count FROM reset_items;`
      );
      return parseInt(res.rows[0]?.count || "0", 10);
    } catch (err) {
      console.error("[DB] retryFailedEmailQueueItems error:", err);
      return 0;
    }
  },

  // ==========================================
  // BUSINESS PROFILES METHODS (Pillar 2)
  // ==========================================

  async createBusinessProfile(p: Omit<BusinessProfile, "id" | "createdAt" | "updatedAt">): Promise<BusinessProfile> {
    if (!pool) {
      const list: BusinessProfile[] = ((globalThis as any).__memoryBusinessProfiles =
        (globalThis as any).__memoryBusinessProfiles || []);
      const newProfile: BusinessProfile = {
        id: crypto.randomUUID(),
        ...p,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(newProfile);
      return newProfile;
    }

    const query = `
      INSERT INTO business_profiles (
        household_id, created_by_member_id, status, rejection_reason,
        business_name, legal_name, tagline, industry_sector, business_type,
        year_established, about_business, offerings_summary,
        registration_type, registration_number, is_verified_badge,
        country, state, city, pincode, address_line,
        website_url, social_links, photos, custom_fields, linked_directors
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25
      ) RETURNING *;
    `;

    const values = [
      p.householdId,
      p.createdByMemberId,
      p.status || "pending_review",
      p.rejectionReason || null,
      p.businessName,
      p.legalName || null,
      p.tagline || null,
      p.industrySector,
      p.businessType,
      p.yearEstablished ? parseInt(String(p.yearEstablished), 10) : null,
      p.aboutBusiness,
      p.offeringsSummary || null,
      p.registrationType || null,
      p.registrationNumber || null,
      Boolean(p.isVerifiedBadge),
      p.country || "India",
      p.state,
      p.city,
      p.pincode || null,
      p.addressLine || null,
      p.websiteUrl || null,
      JSON.stringify(p.socialLinks || {}),
      p.photos || [],
      JSON.stringify(p.customFields || []),
      JSON.stringify(p.linkedDirectors || []),
    ];

    const res = await pool.query(query, values);
    return mapBusinessProfileRow(res.rows[0]);
  },

  async getBusinessProfileById(id: string): Promise<BusinessProfile | null> {
    if (!pool) {
      const list: BusinessProfile[] = ((globalThis as any).__memoryBusinessProfiles =
        (globalThis as any).__memoryBusinessProfiles || []);
      const item = list.find((p) => p.id === id);
      return item || null;
    }
    try {
      const res = await pool.query(`SELECT * FROM business_profiles WHERE id::text = $1;`, [id]);
      if (res.rows.length === 0) return null;
      return mapBusinessProfileRow(res.rows[0]);
    } catch (err) {
      console.error("[DB ERROR] getBusinessProfileById:", err);
      return null;
    }
  },

  async getLiveBusinessProfiles(filters: {
    query?: string;
    sector?: string;
    businessType?: string;
    country?: string;
    state?: string;
    city?: string;
    verifiedOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ profiles: BusinessProfile[]; totalCount: number }> {
    if (!pool) {
      let list: BusinessProfile[] = ((globalThis as any).__memoryBusinessProfiles =
        (globalThis as any).__memoryBusinessProfiles || []);
      list = list.filter((p) => p.status === "live");
      if (filters.sector && filters.sector !== "All") {
        list = list.filter((p) => p.industrySector === filters.sector);
      }
      if (filters.businessType && filters.businessType !== "All") {
        list = list.filter((p) => p.businessType === filters.businessType);
      }
      if (filters.verifiedOnly) {
        list = list.filter((p) => p.isVerifiedBadge);
      }
      if (filters.city && filters.city.trim()) {
        const c = filters.city.trim().toLowerCase();
        list = list.filter((p) => p.city.toLowerCase().includes(c));
      }
      if (filters.query && filters.query.trim()) {
        const q = filters.query.trim().toLowerCase();
        list = list.filter(
          (p) =>
            p.businessName.toLowerCase().includes(q) ||
            (p.tagline && p.tagline.toLowerCase().includes(q)) ||
            (p.aboutBusiness && p.aboutBusiness.toLowerCase().includes(q)) ||
            (p.offeringsSummary && p.offeringsSummary.toLowerCase().includes(q))
        );
      }
      return { profiles: list, totalCount: list.length };
    }
    try {
      const conditions: string[] = ["status = 'live'"];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters.sector && filters.sector !== "All") {
        conditions.push(`industry_sector = $${paramIndex++}`);
        values.push(filters.sector);
      }
      if (filters.businessType && filters.businessType !== "All") {
        conditions.push(`business_type = $${paramIndex++}`);
        values.push(filters.businessType);
      }
      if (filters.country && filters.country !== "All") {
        conditions.push(`country ILIKE $${paramIndex++}`);
        values.push(`%${filters.country.trim()}%`);
      }
      if (filters.state && filters.state !== "All") {
        conditions.push(`state ILIKE $${paramIndex++}`);
        values.push(`%${filters.state.trim()}%`);
      }
      if (filters.city && filters.city.trim()) {
        conditions.push(`city ILIKE $${paramIndex++}`);
        values.push(`%${filters.city.trim()}%`);
      }
      if (filters.verifiedOnly) {
        conditions.push(`is_verified_badge = TRUE`);
      }
      if (filters.query && filters.query.trim()) {
        conditions.push(`(business_name ILIKE $${paramIndex} OR tagline ILIKE $${paramIndex} OR about_business ILIKE $${paramIndex} OR offerings_summary ILIKE $${paramIndex})`);
        values.push(`%${filters.query.trim()}%`);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;
      const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM business_profiles ${whereClause};`, values);
      const totalCount = countRes.rows[0]?.count || 0;

      const limit = Math.min(filters.limit || 50, 100);
      const offset = filters.offset || 0;
      const dataQuery = `
        SELECT * FROM business_profiles
        ${whereClause}
        ORDER BY is_verified_badge DESC, created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++};
      `;
      values.push(limit, offset);
      const dataRes = await pool.query(dataQuery, values);
      return {
        profiles: dataRes.rows.map(mapBusinessProfileRow),
        totalCount,
      };
    } catch (err) {
      console.error("[DB ERROR] getLiveBusinessProfiles:", err);
      return { profiles: [], totalCount: 0 };
    }
  },

  async getBusinessProfilesByHouseholdId(householdId: string): Promise<BusinessProfile[]> {
    if (!pool) {
      const list: BusinessProfile[] = ((globalThis as any).__memoryBusinessProfiles =
        (globalThis as any).__memoryBusinessProfiles || []);
      return list.filter((p) => p.householdId === householdId);
    }
    try {
      const res = await pool.query(
        `SELECT * FROM business_profiles WHERE household_id::text = $1 ORDER BY created_at DESC;`,
        [householdId]
      );
      return res.rows.map(mapBusinessProfileRow);
    } catch (err) {
      console.error("[DB ERROR] getBusinessProfilesByHouseholdId:", err);
      return [];
    }
  },

  async updateBusinessProfile(id: string, data: Partial<BusinessProfile>, householdId?: string): Promise<BusinessProfile | null> {
    if (!pool) {
      const list: BusinessProfile[] = ((globalThis as any).__memoryBusinessProfiles =
        (globalThis as any).__memoryBusinessProfiles || []);
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
      return list[idx];
    }
    try {
      const sets: string[] = ["updated_at = NOW()"];
      const values: any[] = [id];
      let paramIndex = 2;

      if (data.businessName !== undefined) {
        sets.push(`business_name = $${paramIndex++}`);
        values.push(data.businessName);
      }
      if (data.legalName !== undefined) {
        sets.push(`legal_name = $${paramIndex++}`);
        values.push(data.legalName);
      }
      if (data.tagline !== undefined) {
        sets.push(`tagline = $${paramIndex++}`);
        values.push(data.tagline);
      }
      if (data.industrySector !== undefined) {
        sets.push(`industry_sector = $${paramIndex++}`);
        values.push(data.industrySector);
      }
      if (data.businessType !== undefined) {
        sets.push(`business_type = $${paramIndex++}`);
        values.push(data.businessType);
      }
      if (data.yearEstablished !== undefined) {
        sets.push(`year_established = $${paramIndex++}`);
        values.push(data.yearEstablished ? parseInt(String(data.yearEstablished), 10) : null);
      }
      if (data.aboutBusiness !== undefined) {
        sets.push(`about_business = $${paramIndex++}`);
        values.push(data.aboutBusiness);
      }
      if (data.offeringsSummary !== undefined) {
        sets.push(`offerings_summary = $${paramIndex++}`);
        values.push(data.offeringsSummary);
      }
      if (data.registrationType !== undefined) {
        sets.push(`registration_type = $${paramIndex++}`);
        values.push(data.registrationType);
      }
      if (data.registrationNumber !== undefined) {
        sets.push(`registration_number = $${paramIndex++}`);
        values.push(data.registrationNumber);
      }
      if (data.country !== undefined) {
        sets.push(`country = $${paramIndex++}`);
        values.push(data.country);
      }
      if (data.state !== undefined) {
        sets.push(`state = $${paramIndex++}`);
        values.push(data.state);
      }
      if (data.city !== undefined) {
        sets.push(`city = $${paramIndex++}`);
        values.push(data.city);
      }
      if (data.pincode !== undefined) {
        sets.push(`pincode = $${paramIndex++}`);
        values.push(data.pincode);
      }
      if (data.addressLine !== undefined) {
        sets.push(`address_line = $${paramIndex++}`);
        values.push(data.addressLine);
      }
      if (data.websiteUrl !== undefined) {
        sets.push(`website_url = $${paramIndex++}`);
        values.push(data.websiteUrl);
      }
      if (data.socialLinks !== undefined) {
        sets.push(`social_links = $${paramIndex++}`);
        values.push(JSON.stringify(data.socialLinks));
      }
      if (data.photos !== undefined) {
        sets.push(`photos = $${paramIndex++}`);
        values.push(data.photos);
      }
      if (data.customFields !== undefined) {
        sets.push(`custom_fields = $${paramIndex++}`);
        values.push(JSON.stringify(data.customFields));
      }
      if (data.linkedDirectors !== undefined) {
        sets.push(`linked_directors = $${paramIndex++}`);
        values.push(JSON.stringify(data.linkedDirectors));
      }
      if (data.status !== undefined) {
        sets.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }
      if (data.rejectionReason !== undefined) {
        sets.push(`rejection_reason = $${paramIndex++}`);
        values.push(data.rejectionReason);
      }

      let extraWhere = "";
      if (householdId) {
        extraWhere = ` AND household_id::text = $${paramIndex++}`;
        values.push(householdId);
      }

      const query = `
        UPDATE business_profiles
        SET ${sets.join(", ")}
        WHERE id::text = $1 ${extraWhere}
        RETURNING *;
      `;
      const res = await pool.query(query, values);
      if (res.rows.length === 0) return null;
      return mapBusinessProfileRow(res.rows[0]);
    } catch (err) {
      console.error("[DB ERROR] updateBusinessProfile:", err);
      return null;
    }
  },

  async getPendingBusinessProfiles(): Promise<BusinessProfile[]> {
    if (!pool) {
      const list: BusinessProfile[] = ((globalThis as any).__memoryBusinessProfiles =
        (globalThis as any).__memoryBusinessProfiles || []);
      return list.filter((p) => p.status === "pending_review");
    }
    try {
      const res = await pool.query(
        `SELECT * FROM business_profiles WHERE status = 'pending_review' ORDER BY created_at ASC;`
      );
      return res.rows.map(mapBusinessProfileRow);
    } catch (err) {
      console.error("[DB ERROR] getPendingBusinessProfiles:", err);
      return [];
    }
  },

  async setBusinessProfileStatus(
    id: string,
    status: "pending_review" | "live" | "paused" | "rejected",
    rejectionReason?: string,
    isVerifiedBadge?: boolean
  ): Promise<boolean> {
    if (!pool) {
      const list: BusinessProfile[] = ((globalThis as any).__memoryBusinessProfiles =
        (globalThis as any).__memoryBusinessProfiles || []);
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      list[idx].status = status;
      if (rejectionReason !== undefined) list[idx].rejectionReason = rejectionReason;
      if (isVerifiedBadge !== undefined) list[idx].isVerifiedBadge = isVerifiedBadge;
      list[idx].updatedAt = new Date().toISOString();
      return true;
    }
    try {
      const sets: string[] = ["status = $2", "updated_at = NOW()"];
      const values: any[] = [id, status];
      let paramIndex = 3;

      if (rejectionReason !== undefined) {
        sets.push(`rejection_reason = $${paramIndex++}`);
        values.push(rejectionReason);
      }
      if (isVerifiedBadge !== undefined) {
        sets.push(`is_verified_badge = $${paramIndex++}`);
        values.push(isVerifiedBadge);
      }

      const res = await pool.query(
        `UPDATE business_profiles SET ${sets.join(", ")} WHERE id::text = $1 RETURNING id;`,
        values
      );
      return (res.rowCount || 0) > 0;
    } catch (err) {
      console.error("[DB ERROR] setBusinessProfileStatus:", err);
      return false;
    }
  },

  async deleteBusinessProfile(id: string, householdId?: string): Promise<boolean> {
    if (!pool) {
      const list: BusinessProfile[] = ((globalThis as any).__memoryBusinessProfiles =
        (globalThis as any).__memoryBusinessProfiles || []);
      const idx = list.findIndex((p) => p.id === id);
      if (idx !== -1) {
        list.splice(idx, 1);
        return true;
      }
      return false;
    }
    try {
      let query = `DELETE FROM business_profiles WHERE id::text = $1`;
      const values: any[] = [id];
      if (householdId) {
        query += ` AND household_id::text = $2`;
        values.push(householdId);
      }
      const res = await pool.query(query, values);
      return (res.rowCount || 0) > 0;
    } catch (err) {
      console.error("[DB ERROR] deleteBusinessProfile:", err);
      return false;
    }
  },

  async createCareerProfile(p: CreateCareerProfileInput): Promise<CareerProfile> {
    if (!pool) {
      const list: CareerProfile[] = ((globalThis as any).__memoryCareerProfiles =
        (globalThis as any).__memoryCareerProfiles || []);
      const newProfile: CareerProfile = {
        id: crypto.randomUUID(),
        householdId: p.householdId,
        memberId: p.memberId,
        headline: p.headline,
        careerLevel: p.careerLevel,
        primaryDomain: p.primaryDomain,
        currentCompany: p.currentCompany,
        currentDesignation: p.currentDesignation,
        yearsOfExperience: p.yearsOfExperience || 0,
        educationHighest: p.educationHighest,
        educationInstitution: p.educationInstitution,
        skills: p.skills || [],
        seekingStatus: p.seekingStatus || "open_to_offers",
        preferredLocations: p.preferredLocations || [],
        workplacePreference: p.workplacePreference || "flexible",
        resumeUrl: p.resumeUrl,
        bio: p.bio,
        linkedinUrl: p.linkedinUrl,
        portfolioUrl: p.portfolioUrl,
        isMentorAvailable: Boolean(p.isMentorAvailable),
        isConfidentialMode: Boolean(p.isConfidentialMode),
        status: "live",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(newProfile);
      return newProfile;
    }

    const query = `
      INSERT INTO career_profiles (
        household_id, member_id, headline, career_level, primary_domain,
        current_company, current_designation, years_of_experience,
        education_highest, education_institution, skills,
        seeking_status, preferred_locations, workplace_preference,
        resume_url, bio, linkedin_url, portfolio_url,
        is_mentor_available, is_confidential_mode, status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21
      )
      ON CONFLICT (member_id) DO UPDATE SET
        headline = EXCLUDED.headline,
        career_level = EXCLUDED.career_level,
        primary_domain = EXCLUDED.primary_domain,
        current_company = EXCLUDED.current_company,
        current_designation = EXCLUDED.current_designation,
        years_of_experience = EXCLUDED.years_of_experience,
        education_highest = EXCLUDED.education_highest,
        education_institution = EXCLUDED.education_institution,
        skills = EXCLUDED.skills,
        seeking_status = EXCLUDED.seeking_status,
        preferred_locations = EXCLUDED.preferred_locations,
        workplace_preference = EXCLUDED.workplace_preference,
        resume_url = EXCLUDED.resume_url,
        bio = EXCLUDED.bio,
        linkedin_url = EXCLUDED.linkedin_url,
        portfolio_url = EXCLUDED.portfolio_url,
        is_mentor_available = EXCLUDED.is_mentor_available,
        is_confidential_mode = EXCLUDED.is_confidential_mode,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      p.householdId,
      p.memberId,
      p.headline,
      p.careerLevel,
      p.primaryDomain,
      p.currentCompany || null,
      p.currentDesignation || null,
      p.yearsOfExperience || 0,
      p.educationHighest || null,
      p.educationInstitution || null,
      p.skills || [],
      p.seekingStatus || "open_to_offers",
      p.preferredLocations || [],
      p.workplacePreference || "flexible",
      p.resumeUrl || null,
      p.bio || null,
      p.linkedinUrl || null,
      p.portfolioUrl || null,
      Boolean(p.isMentorAvailable),
      Boolean(p.isConfidentialMode),
      "live",
    ];

    const res = await pool.query(query, values);
    return mapCareerProfileRow(res.rows[0]);
  },

  async getCareerProfileById(id: string): Promise<CareerProfile | null> {
    if (!pool) {
      const list: CareerProfile[] = (globalThis as any).__memoryCareerProfiles || [];
      return list.find((p) => p.id === id) || null;
    }
    const query = `
      SELECT cp.*, m.full_name, m.gender, m.serial_no, h.gotra, h.city, h.state, h.country, h.native_place, h.household_code
      FROM career_profiles cp
      JOIN members m ON cp.member_id = m.id
      JOIN households h ON cp.household_id = h.id
      WHERE cp.id::text = $1;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] ? mapCareerProfileRow(res.rows[0]) : null;
  },

  async getCareerProfileByMemberId(memberId: string): Promise<CareerProfile | null> {
    if (!pool) {
      const list: CareerProfile[] = (globalThis as any).__memoryCareerProfiles || [];
      return list.find((p) => p.memberId === memberId) || null;
    }
    const query = `
      SELECT cp.*, m.full_name, m.gender, m.serial_no, h.gotra, h.city, h.state, h.country, h.native_place, h.household_code
      FROM career_profiles cp
      JOIN members m ON cp.member_id = m.id
      JOIN households h ON cp.household_id = h.id
      WHERE cp.member_id::text = $1;
    `;
    const res = await pool.query(query, [memberId]);
    return res.rows[0] ? mapCareerProfileRow(res.rows[0]) : null;
  },

  async getLiveCareerProfiles(filter: CareerFilter = {}): Promise<{ profiles: CareerProfile[]; total: number }> {
    if (!pool) {
      let list: CareerProfile[] = (globalThis as any).__memoryCareerProfiles || [];
      list = list.filter((p) => p.status === "live");
      if (filter.primaryDomain && filter.primaryDomain !== "all") list = list.filter((p) => p.primaryDomain === filter.primaryDomain);
      if (filter.careerLevel && filter.careerLevel !== "all") list = list.filter((p) => p.careerLevel === filter.careerLevel);
      if (filter.isMentorAvailable) list = list.filter((p) => p.isMentorAvailable);
      return { profiles: list, total: list.length };
    }

    const conditions: string[] = ["cp.status = 'live'", "h.status = 'live'"];
    const values: any[] = [];
    let pIdx = 1;

    if (filter.primaryDomain && filter.primaryDomain !== "all") {
      conditions.push(`cp.primary_domain = $${pIdx++}`);
      values.push(filter.primaryDomain);
    }

    if (filter.careerLevel && filter.careerLevel !== "all") {
      conditions.push(`cp.career_level = $${pIdx++}`);
      values.push(filter.careerLevel);
    }

    if (filter.gotra && filter.gotra !== "all") {
      conditions.push(`LOWER(h.gotra) = LOWER($${pIdx++})`);
      values.push(filter.gotra);
    }

    if (filter.city) {
      conditions.push(`(LOWER(h.city) LIKE LOWER($${pIdx}) OR LOWER(cp.preferred_locations::text) LIKE LOWER($${pIdx}))`);
      values.push(`%${filter.city}%`);
      pIdx++;
    }

    if (filter.isMentorAvailable) {
      conditions.push(`cp.is_mentor_available = TRUE`);
    }

    if (filter.query) {
      conditions.push(`(
        cp.headline ILIKE $${pIdx} OR
        cp.skills::text ILIKE $${pIdx} OR
        m.full_name ILIKE $${pIdx} OR
        cp.current_company ILIKE $${pIdx}
      )`);
      values.push(`%${filter.query}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countRes = await pool.query(`
      SELECT COUNT(*)::int as count
      FROM career_profiles cp
      JOIN members m ON cp.member_id = m.id
      JOIN households h ON cp.household_id = h.id
      ${whereClause};
    `, values);

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    values.push(limit, offset);

    const query = `
      SELECT cp.*, m.full_name, m.gender, m.serial_no, h.gotra, h.city, h.state, h.country, h.native_place, h.household_code
      FROM career_profiles cp
      JOIN members m ON cp.member_id = m.id
      JOIN households h ON cp.household_id = h.id
      ${whereClause}
      ORDER BY cp.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++};
    `;

    const res = await pool.query(query, values);
    return {
      profiles: res.rows.map(mapCareerProfileRow),
      total: countRes.rows[0]?.count || 0,
    };
  },

  async updateCareerProfile(id: string, updates: UpdateCareerProfileInput): Promise<CareerProfile | null> {
    if (!pool) {
      const list: CareerProfile[] = (globalThis as any).__memoryCareerProfiles || [];
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      return list[idx];
    }

    const sets: string[] = [];
    const values: any[] = [id];
    let pIdx = 2;

    const addSet = (col: string, val: any) => {
      sets.push(`${col} = $${pIdx++}`);
      values.push(val);
    };

    if (updates.headline !== undefined) addSet("headline", updates.headline);
    if (updates.careerLevel !== undefined) addSet("career_level", updates.careerLevel);
    if (updates.primaryDomain !== undefined) addSet("primary_domain", updates.primaryDomain);
    if (updates.currentCompany !== undefined) addSet("current_company", updates.currentCompany);
    if (updates.currentDesignation !== undefined) addSet("current_designation", updates.currentDesignation);
    if (updates.yearsOfExperience !== undefined) addSet("years_of_experience", updates.yearsOfExperience);
    if (updates.educationHighest !== undefined) addSet("education_highest", updates.educationHighest);
    if (updates.educationInstitution !== undefined) addSet("education_institution", updates.educationInstitution);
    if (updates.skills !== undefined) addSet("skills", updates.skills);
    if (updates.seekingStatus !== undefined) addSet("seeking_status", updates.seekingStatus);
    if (updates.preferredLocations !== undefined) addSet("preferred_locations", updates.preferredLocations);
    if (updates.workplacePreference !== undefined) addSet("workplace_preference", updates.workplacePreference);
    if (updates.resumeUrl !== undefined) addSet("resume_url", updates.resumeUrl);
    if (updates.bio !== undefined) addSet("bio", updates.bio);
    if (updates.linkedinUrl !== undefined) addSet("linkedin_url", updates.linkedinUrl);
    if (updates.portfolioUrl !== undefined) addSet("portfolio_url", updates.portfolioUrl);
    if (updates.isMentorAvailable !== undefined) addSet("is_mentor_available", updates.isMentorAvailable);
    if (updates.isConfidentialMode !== undefined) addSet("is_confidential_mode", updates.isConfidentialMode);
    if (updates.status !== undefined) addSet("status", updates.status);

    if (sets.length === 0) return null;
    sets.push("updated_at = NOW()");

    const query = `UPDATE career_profiles SET ${sets.join(", ")} WHERE id::text = $1 RETURNING *;`;
    const res = await pool.query(query, values);
    return res.rows[0] ? mapCareerProfileRow(res.rows[0]) : null;
  },

  async deleteCareerProfile(id: string): Promise<boolean> {
    if (!pool) {
      let list: CareerProfile[] = (globalThis as any).__memoryCareerProfiles || [];
      const initialLen = list.length;
      (globalThis as any).__memoryCareerProfiles = list.filter((p) => p.id !== id);
      return (globalThis as any).__memoryCareerProfiles.length < initialLen;
    }
    const res = await pool.query(`DELETE FROM career_profiles WHERE id::text = $1;`, [id]);
    return (res.rowCount || 0) > 0;
  },
};

function mapMatrimonialRow(row: any): MatrimonialProfile {
  let age: number | undefined = undefined;
  if (row.dob) {
    const d = new Date(row.dob);
    if (!isNaN(d.getTime())) {
      age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
  }
  return {
    id: String(row.id),
    householdId: String(row.household_id || row.householdId || ""),
    memberId: String(row.member_id || row.memberId || ""),
    createdByUserId: String(row.created_by_user_id || row.createdByUserId || ""),
    status: row.status || "active",
    gender: row.gender || "male",
    fullName: row.full_name || row.fullName || "",
    createdFor: row.created_for || row.createdFor || "Self",
    maritalStatus: row.marital_status || row.maritalStatus || "Never Married",
    dob: row.dob instanceof Date ? row.dob.toISOString().split("T")[0] : String(row.dob || ""),
    placeOfBirth: row.place_of_birth || row.placeOfBirth || "",
    heightCm: row.height_cm ? parseInt(row.height_cm, 10) : (row.heightCm || undefined),
    heightDisplay: row.height_display || row.heightDisplay || "",
    weightBuild: row.weight_build || row.weightBuild || "",
    complexion: row.complexion || row.complexion || "",
    bloodGroup: row.blood_group || row.bloodGroup || "",
    motherTongue: row.mother_tongue || row.motherTongue || "Hindi",
    languagesSpoken: Array.isArray(row.languages_spoken) ? row.languages_spoken : (Array.isArray(row.languagesSpoken) ? row.languagesSpoken : []),
    diet: row.diet || "Vegetarian",
    smokeDrink: row.smoke_drink || row.smokeDrink || "Non-Smoker / Non-Drinker",
    physicalStatus: row.physical_status || row.physicalStatus || "Normal",
    aboutMe: row.about_me || row.aboutMe || "",
    gotra: row.gotra || "",
    highestEducation: row.highest_education || row.highestEducation || "",
    degreeName: row.degree_name || row.degreeName || "",
    collegeName: row.college_name || row.collegeName || "",
    schoolingHonors: row.schooling_honors || row.schoolingHonors || "",
    employmentSector: row.employment_sector || row.employmentSector || "",
    occupationTitle: row.occupation_title || row.occupationTitle || "",
    companyName: row.company_name || row.companyName || "",
    annualIncome: row.annual_income || row.annualIncome || "",
    workCity: row.work_city || row.workCity || "",
    workCountry: row.work_country || row.workCountry || "India",
    willingToRelocate: row.willing_to_relocate || row.willingToRelocate || "Yes",
    fatherName: row.father_name || row.fatherName || "",
    fatherMemberId: row.father_member_id || row.fatherMemberId || undefined,
    fatherOccupation: row.father_occupation || row.fatherOccupation || "",
    motherName: row.mother_name || row.motherName || "",
    motherMemberId: row.mother_member_id || row.motherMemberId || undefined,
    motherOccupation: row.mother_occupation || row.motherOccupation || "",
    linkedSiblings: typeof row.linked_siblings === "string" ? JSON.parse(row.linked_siblings) : (row.linked_siblings || row.linkedSiblings || []),
    nativePlace: row.native_place || row.nativePlace || "",
    familyLocation: row.family_location || row.familyLocation || "",
    familyType: row.family_type || row.familyType || "Nuclear",
    familyValues: row.family_values || row.familyValues || "Traditional",
    familyFinancialStatus: row.family_financial_status || row.familyFinancialStatus || "Upper Middle Class",
    aboutFamily: row.about_family || row.aboutFamily || "",
    customFields: typeof row.custom_fields === "string" ? JSON.parse(row.custom_fields) : (row.custom_fields || row.customFields || []),
    photos: typeof row.photos === "string" ? JSON.parse(row.photos) : (row.photos || []),
    partnerPreferences: typeof row.partner_preferences === "string" ? JSON.parse(row.partner_preferences) : (row.partner_preferences || row.partnerPreferences || {}),
    contactPerson: row.contact_person || row.contactPerson || "",
    contactRelation: row.contact_relation || row.contactRelation || "",
    contactPhone: row.contact_phone || row.contactPhone || "",
    secondaryPhone: row.secondary_phone || row.secondaryPhone || "",
    contactEmail: row.contact_email || row.contactEmail || "",
    residentialAddress: row.residential_address || row.residentialAddress || "",
    referencedBy: row.referenced_by || row.referencedBy || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || new Date().toISOString()),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || new Date().toISOString()),
    age,
    fatherMemberSerial: row.father_serial || undefined,
    motherMemberSerial: row.mother_serial || undefined,
  };
}

function mapBusinessProfileRow(row: any): BusinessProfile {
  return {
    id: String(row.id),
    householdId: String(row.household_id || row.householdId || ""),
    createdByMemberId: String(row.created_by_member_id || row.createdByMemberId || ""),
    status: row.status || "pending_review",
    rejectionReason: row.rejection_reason || row.rejectionReason || undefined,
    businessName: row.business_name || row.businessName || "",
    legalName: row.legal_name || row.legalName || undefined,
    tagline: row.tagline || undefined,
    industrySector: row.industry_sector || row.industrySector || "",
    businessType: row.business_type || row.businessType || "",
    yearEstablished: row.year_established ? parseInt(row.year_established, 10) : undefined,
    aboutBusiness: row.about_business || row.aboutBusiness || "",
    offeringsSummary: row.offerings_summary || row.offeringsSummary || undefined,
    registrationType: row.registration_type || row.registrationType || undefined,
    registrationNumber: row.registration_number || row.registrationNumber || undefined,
    isVerifiedBadge: Boolean(row.is_verified_badge),
    country: row.country || "India",
    state: row.state || "",
    city: row.city || "",
    pincode: row.pincode || undefined,
    addressLine: row.address_line || row.addressLine || undefined,
    websiteUrl: row.website_url || row.websiteUrl || undefined,
    socialLinks: typeof row.social_links === "string" ? JSON.parse(row.social_links) : (row.social_links || row.socialLinks || {}),
    photos: Array.isArray(row.photos) ? row.photos : (typeof row.photos === "string" ? JSON.parse(row.photos) : []),
    customFields: typeof row.custom_fields === "string" ? JSON.parse(row.custom_fields) : (row.custom_fields || row.customFields || []),
    linkedDirectors: typeof row.linked_directors === "string" ? JSON.parse(row.linked_directors) : (row.linked_directors || row.linkedDirectors || []),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || new Date().toISOString()),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || new Date().toISOString()),
  };
}

function mapCareerProfileRow(row: any): CareerProfile {
  return {
    id: String(row.id),
    householdId: String(row.household_id || row.householdId || ""),
    memberId: String(row.member_id || row.memberId || ""),
    headline: row.headline || "",
    careerLevel: row.career_level || row.careerLevel || "mid_level",
    primaryDomain: row.primary_domain || row.primaryDomain || "Other",
    currentCompany: row.current_company || row.currentCompany || undefined,
    currentDesignation: row.current_designation || row.currentDesignation || undefined,
    yearsOfExperience: typeof row.years_of_experience === "number" ? row.years_of_experience : (parseInt(row.years_of_experience, 10) || 0),
    educationHighest: row.education_highest || row.educationHighest || undefined,
    educationInstitution: row.education_institution || row.educationInstitution || undefined,
    skills: Array.isArray(row.skills) ? row.skills : (typeof row.skills === "string" ? JSON.parse(row.skills) : []),
    seekingStatus: row.seeking_status || row.seekingStatus || "open_to_offers",
    preferredLocations: Array.isArray(row.preferred_locations) ? row.preferred_locations : (typeof row.preferred_locations === "string" ? JSON.parse(row.preferred_locations) : []),
    workplacePreference: row.workplace_preference || row.workplacePreference || "flexible",
    resumeUrl: row.resume_url || row.resumeUrl || undefined,
    bio: row.bio || undefined,
    linkedinUrl: row.linkedin_url || row.linkedinUrl || undefined,
    portfolioUrl: row.portfolio_url || row.portfolioUrl || undefined,
    isMentorAvailable: Boolean(row.is_mentor_available),
    isConfidentialMode: Boolean(row.is_confidential_mode),
    status: row.status || "live",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || new Date().toISOString()),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || new Date().toISOString()),
    fullName: row.full_name || row.fullName || undefined,
    gender: row.gender || undefined,
    gotra: row.gotra || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    country: row.country || undefined,
    nativePlace: row.native_place || row.nativePlace || undefined,
    serialNo: row.serial_no ? parseInt(row.serial_no, 10) : undefined,
    householdCode: row.household_code || row.householdCode || undefined,
  };
}

