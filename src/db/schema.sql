-- PostgreSQL + PostGIS Schema for Maharaja Agrasen Foundation Limited Singapore (v1)
-- Exactly aligns with TRD.md and ARCHITECTURE.md

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum Types
CREATE TYPE household_status AS ENUM ('pending_review', 'live', 'rejected');
CREATE TYPE member_relation AS ENUM ('self', 'spouse', 'son', 'daughter', 'parent', 'other');
CREATE TYPE field_visibility_option AS ENUM ('public_to_members', 'members_only', 'hidden');

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