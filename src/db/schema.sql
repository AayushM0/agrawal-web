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
    pan_number TEXT,
    passport_number TEXT,
    govt_id_number TEXT,
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
    phone TEXT,
    email TEXT,
    father_name TEXT,
    photo_url TEXT,
    bio TEXT,
    aadhaar_number TEXT,
    pan_number TEXT,
    passport_number TEXT,
    govt_id_number TEXT,
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
CREATE INDEX IF NOT EXISTS idx_members_search_vector ON members USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_members_coordinates ON members USING gist(coordinates);
CREATE INDEX IF NOT EXISTS idx_members_trgm_name ON members USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_households_status ON households(status);
CREATE INDEX IF NOT EXISTS idx_households_gotra ON households(gotra);
CREATE INDEX IF NOT EXISTS idx_households_serial_no ON households(serial_no);

-- Schema Migration Deltas
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
ALTER TABLE members ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS full_address TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS govt_id_number TEXT;

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
    message_body TEXT NOT NULL,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- 8. Row-Level Security (RLS) Configuration (Supabase Hardening)
-- Enable RLS on all tables to prevent public anonymous REST API data exfiltration
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Households, Members, Message Reports, Rate Limits, and Admin Attempts have NO policies defined.
-- In PostgreSQL, this default deny-all state blocks all public anon/authenticated REST/GraphQL operations.
-- Our Next.js backend connects as database owner/superuser, bypassing RLS automatically.

-- For conversations and messages (used by Supabase Realtime in browser):
-- Define SELECT policies for anon/authenticated roles to receive websocket broadcasts.
DROP POLICY IF EXISTS "Allow Realtime conversations select" ON conversations;
CREATE POLICY "Allow Realtime conversations select" ON conversations FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow Realtime messages select" ON messages;
CREATE POLICY "Allow Realtime messages select" ON messages FOR SELECT TO anon USING (true);