-- PostgreSQL + PostGIS Schema for Maharaja Agrasen Foundation Limited Singapore (v1)
-- Exactly aligns with TRD.md and ARCHITECTURE.md

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum Types
DO $$ BEGIN
    CREATE TYPE household_status AS ENUM ('pending_review', 'live', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_relation AS ENUM ('self', 'spouse', 'son', 'daughter', 'parent', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE field_visibility_option AS ENUM ('public_to_members', 'members_only', 'hidden');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Households Table
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_code VARCHAR(32) NOT NULL UNIQUE,
    serial_no VARCHAR(32) UNIQUE,
    head_user_id UUID NOT NULL,
    head_name TEXT NOT NULL,
    native_place TEXT NOT NULL,
    gotra TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    postal_code TEXT,
    state TEXT,
    city TEXT,
    full_address TEXT,
    aadhaar_number TEXT,
    aadhaar_hash TEXT,
    pan_number TEXT,
    passport_number TEXT,
    govt_id_number TEXT,
    password_hash TEXT,
    status household_status NOT NULL DEFAULT 'pending_review',
    rejection_reason TEXT,
    consent_accepted_at TIMESTAMPTZ NOT NULL,
    verified_contact TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Members Table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    relation_to_head member_relation NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(16) NOT NULL,
    marital_status VARCHAR(32) NOT NULL,
    current_city TEXT NOT NULL,
    current_country TEXT NOT NULL,
    postal_code TEXT,
    state TEXT,
    full_address TEXT,
    coordinates GEOGRAPHY(Point, 4326),
    profession_freetext TEXT NOT NULL,
    profession_title TEXT,
    profession_description TEXT,
    profession_category TEXT,
    company_name TEXT,
    anniversary_date TEXT,
    phone TEXT,
    email TEXT,
    father_name TEXT,
    photo_url TEXT,
    bio TEXT,
    aadhaar_number TEXT,
    aadhaar_hash TEXT,
    pan_number TEXT,
    passport_number TEXT,
    govt_id_number TEXT,
    password_hash TEXT,
    serial_no VARCHAR(32) UNIQUE,
    verified_by_self BOOLEAN NOT NULL DEFAULT FALSE,
    claim_token TEXT UNIQUE,
    owner_locked BOOLEAN NOT NULL DEFAULT FALSE,
    visibility_contact field_visibility_option NOT NULL DEFAULT 'members_only',
    visibility_dob field_visibility_option NOT NULL DEFAULT 'hidden',
    visibility_photo field_visibility_option NOT NULL DEFAULT 'public_to_members',
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(profession_freetext, '') || ' ' || coalesce(current_city, ''))
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Fast Faceted Search & Radius Queries
CREATE INDEX IF NOT EXISTS idx_members_household_id ON members(household_id);
CREATE INDEX IF NOT EXISTS idx_members_serial_no ON members(serial_no);
CREATE INDEX IF NOT EXISTS idx_members_search_vector ON members USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_members_coordinates ON members USING gist(coordinates);
CREATE INDEX IF NOT EXISTS idx_members_trgm_name ON members USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_households_status ON households(status);
CREATE INDEX IF NOT EXISTS idx_households_gotra ON households(gotra);
ALTER TABLE households ADD COLUMN IF NOT EXISTS aadhaar_hash TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhaar_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_households_aadhaar_hash ON households(aadhaar_hash);
CREATE INDEX IF NOT EXISTS idx_members_aadhaar_hash ON members(aadhaar_hash);

-- Schema Migration Deltas
ALTER TABLE households ADD COLUMN IF NOT EXISTS serial_no VARCHAR(32) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_households_serial_no ON households(serial_no);
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
ALTER TABLE members ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS govt_id_number TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS serial_no VARCHAR(32) UNIQUE;
ALTER TABLE households ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2b. Login Attempts Table (OWASP Brute-Force Defense)
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(identifier, ip_address, created_at DESC);

-- 3. Conversations Table (Member-to-Member Messaging)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiator_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'blocked'
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_conversation_pair UNIQUE (initiator_id, recipient_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    message_body TEXT,                    -- nullable: pure attachment messages have no text
    attachment_url TEXT,                  -- Supabase Storage path for file attachments
    attachment_type VARCHAR(20),          -- 'image' | 'video' | 'pdf' | 'ppt'
    attachment_name TEXT,                 -- original filename
    attachment_size INTEGER,              -- file size in bytes
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;
CREATE INDEX IF NOT EXISTS idx_messages_has_attachment ON messages(conversation_id) WHERE attachment_url IS NOT NULL;


-- 5. Message Reports Table (Trust & Safety / Legal Audit Trail)
CREATE TABLE IF NOT EXISTS message_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);

-- 6. Enable Supabase Realtime for messaging
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 7. Persistent Rate Limiting & Abuse Defense
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) NOT NULL,
    recipient VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_ip_created ON otp_rate_limits(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_recipient_created ON otp_rate_limits(recipient, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_login_ip_created ON admin_login_attempts(ip_address, created_at DESC);

CREATE TABLE IF NOT EXISTS action_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_rate_limits ON action_rate_limits (key, action, created_at DESC);

-- 8. Support Inquiries Table (Secretariat Desk)
CREATE TABLE IF NOT EXISTS support_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    admin_notes TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_created ON support_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_status ON support_inquiries(status);

-- 8b. Registration Drafts Table (Form Abandonment & Incomplete Registration Capture)
CREATE TABLE IF NOT EXISTS registration_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 9. Admin Audit Logs (DPDP Act 2023 & Anti-Insider Leak Logging)
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

-- 9b. Matrimonial Profiles Table
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
ALTER TABLE matrimonial_profiles ADD COLUMN IF NOT EXISTS referenced_by VARCHAR(150);

-- 9c. Outbound Email Queue (Rate-Limit Pacing, Retry Backoff & Audit)
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

-- 9d. Global Business Network (Pillar 2: business_profiles)
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_by_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review', -- 'pending_review' | 'live' | 'paused' | 'rejected'
    rejection_reason TEXT,
    
    -- Business Identity
    business_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tagline VARCHAR(300),
    industry_sector VARCHAR(100) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    year_established INTEGER,
    about_business TEXT NOT NULL,
    offerings_summary TEXT,
    
    -- Credentials & Verification
    registration_type VARCHAR(50), -- 'GSTIN' | 'MSME' | 'CIN' | 'LLPIN' | 'Trade License' | 'Other'
    registration_number VARCHAR(100),
    is_verified_badge BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Geographic Location
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(20),
    address_line TEXT,
    
    -- Online Presence & Media
    website_url VARCHAR(500),
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    photos TEXT[] NOT NULL DEFAULT '{}',
    custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Linked Leadership (Directors / Partners)
    linked_directors JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_status ON business_profiles(status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_household ON business_profiles(household_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_sector ON business_profiles(industry_sector);
CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);
CREATE INDEX IF NOT EXISTS idx_business_profiles_created_by ON business_profiles(created_by_member_id);

-- 9e. Global Jobs & Careers Network (Pillar 4: career_profiles)
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

-- 9f. Enterprise Job Postings Table
CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    business_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL,
    posted_by_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    workplace_type VARCHAR(50) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    experience_min INTEGER NOT NULL DEFAULT 0,
    experience_max INTEGER,
    salary_range VARCHAR(100),
    description TEXT NOT NULL,
    requirements TEXT,
    skills_required TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_industry ON job_postings(industry);
CREATE INDEX IF NOT EXISTS idx_job_postings_household ON job_postings(household_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_business ON job_postings(business_id);

-- 9g. Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    applicant_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    career_profile_id UUID NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
    cover_note TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_posting_id, applicant_member_id)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_posting ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_member_id);

-- 10. Row-Level Security (RLS) Configuration (Supabase Hardening)
-- Enable RLS on all tables to prevent public anonymous REST API data exfiltration
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
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrimonial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Households, Members, Message Reports, Rate Limits, and Admin Attempts have NO policies defined.
-- In PostgreSQL, this default deny-all state blocks all public anon/authenticated REST/GraphQL operations.
-- Our Next.js backend connects as database owner/superuser, bypassing RLS automatically.

-- Ensure standard roles exist in local PostgreSQL environments
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- For conversations and messages (used by Supabase Realtime in browser):
-- Define SELECT policies for anon/authenticated roles to receive websocket broadcasts.
-- Restrict to Realtime-only by blocking PostgREST queries (where request.path is set).
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow Realtime conversations select" ON conversations;
  CREATE POLICY "Allow Realtime conversations select" ON conversations FOR SELECT TO anon USING (current_setting('request.path', true) IS NULL);

  DROP POLICY IF EXISTS "Allow Realtime messages select" ON messages;
  CREATE POLICY "Allow Realtime messages select" ON messages FOR SELECT TO anon USING (current_setting('request.path', true) IS NULL);
EXCEPTION WHEN OTHERS THEN null;
END $$;