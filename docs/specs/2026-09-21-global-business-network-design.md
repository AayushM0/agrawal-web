# Design Specification: Global Agarwal Business Network (Pillar 2)

**Date:** 2026-09-21  
**Status:** Approved by User  
**Scope:** Verified Enterprise Directory, Showcase, Leadership Linking & In-Website Commercial Chat  
**Design System:** Maharaja Agrasen Heritage (`opendesign/design-systems/maharaja-agrasen-heritage`)  
**Guiding Principle:** Ponytail (Full Mode: Standard library & native features first, zero unneeded abstractions)

---

## 1. Executive Summary & Vision

The **Global Agarwal Business Network** (अग्रवाल व्यापार एवं उद्योग मंच) represents **Strategic Pillar 2** of the Maharaja Agrasen Foundation Limited platform.

Following the verified community model established by the **Agarwal Matrimonial Portal** (Pillar 7), the Business Network connects verified Agarwal-owned commercial enterprises, manufacturers, traders, tech ventures, and professional practices across the globe.

### Core Architectural Pillars
1. **Verified Community Anchor:** Only authenticated members of administrator-approved households (`status = 'live'`) can register enterprises, eliminating spam listings and commercial brokerage brokers.
2. **Multi-Enterprise Household Support:** Families can register multiple distinct business entities (e.g. trading, manufacturing, tech, or professional firms) with no artificial 1-to-1 constraint.
3. **Directory Leadership Linking:** Founders, Directors, and Key Persons are tagged from the verified community directory, linking directly back to `/directory/[id]` for verified members.
4. **Mandatory Admin Pre-Moderation:** Every submitted business enters an administrative review queue (`status = 'pending_review'`) and only goes live upon administrative approval, ensuring 100% genuine listings.
5. **Exclusive In-Website Chat:** To prevent web scraping, unsolicited cold-calls, and telemarketing spam, business phone numbers and direct personal emails are strictly shielded from public HTML. All commercial inquiries route exclusively through the platform's secure, real-time Pusher chat system.
6. **Public Showcase Discovery:** While inquiries and personal profiles are secured, business profiles and catalogs remain publicly discoverable and indexable for global B2B/B2C exposure.

---

## 2. Data Architecture & Database Schema

### 2.1 Database Table: `business_profiles`

```sql
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
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "linkedin": "", "twitter": "", "facebook": "", "instagram": "" }
  photos TEXT[] NOT NULL DEFAULT '{}',            -- 1 to 3 optimized photos/logos
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- Dynamic key-value pairs
  
  -- Linked Leadership (Directors / Partners)
  linked_directors JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rapid searching and tenant scoping
CREATE INDEX IF NOT EXISTS idx_business_profiles_status ON business_profiles(status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_household ON business_profiles(household_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_sector ON business_profiles(industry_sector);
CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);
CREATE INDEX IF NOT EXISTS idx_business_profiles_created_by ON business_profiles(created_by_member_id);
```

### 2.2 TypeScript Data Contracts (`src/types/business.ts`)

```typescript
export interface LinkedDirector {
  memberId: string;        // UUID of verified member in members table
  serialNo?: string;       // e.g. MAFL-000-000-001-01
  name: string;
  roleTitle: string;       // e.g. "Managing Director", "Partner", "Chief Executive"
  isPrimaryContact: boolean; // Routes incoming in-website chat inquiries
}

export interface BusinessCustomField {
  id: string;
  label: string;
  value: string;
}

export interface BusinessProfile {
  id: string;
  householdId: string;
  createdByMemberId: string;
  status: "pending_review" | "live" | "paused" | "rejected";
  rejectionReason?: string;

  // Identity & Overview
  businessName: string;
  legalName?: string;
  tagline?: string;
  industrySector: string;
  businessType: string;
  yearEstablished?: number;
  aboutBusiness: string;
  offeringsSummary?: string;

  // Verification & Compliance
  registrationType?: string;
  registrationNumber?: string;
  isVerifiedBadge: boolean;

  // Location
  country: string;
  state: string;
  city: string;
  pincode?: string;
  addressLine?: string;

  // Online & Media
  websiteUrl?: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  photos: string[]; // 1 to 3 base64 or URL photos
  customFields: BusinessCustomField[];

  // Leadership & Governance
  linkedDirectors: LinkedDirector[];

  createdAt: string;
  updatedAt: string;
}
```

---

## 3. User Flows & Page Architecture

### 3.1 Public Business Directory (`/businesses`)
- **Header & Search Bar:** Keyword query against company name, tagline, offerings, and location.
- **Faceted Filters:**
  - **Industry Sector:** Filter chips (*Manufacturing, Textiles, Steel & Metals, Chemicals, IT, Finance, Real Estate, Retail, Healthcare, Logistics, etc.*).
  - **Business Type:** Checkboxes (*Manufacturer, Wholesaler / Trader, Retailer, Exporter / Importer, Professional Firm, Service Provider*).
  - **Location:** Country, State, City cascading selectors.
  - **Verified Filter:** "Verified Enterprises Only" toggle switch.
- **Enterprise Card Grid:** Clean responsive cards with:
  - Company logo / primary photo
  - Business name, tagline, and green "Verified Enterprise" badge
  - Industry sector and business type badges
  - City, State, and Year Founded
  - Brief snippet of products/services
  - Primary CTA: *"View Enterprise Profile →"*
- **Header CTA:** `"+ Register Your Enterprise"` button (directs to `/businesses/create`).

### 3.2 Enterprise Showcase Profile (`/businesses/[id]`)
- **Brand Hero Banner:** High-visibility header displaying logo, company name, legal entity name, tagline, sector, verified badge, city, and website link.
- **Media Gallery:** Responsive carousel/grid of the 1 to 3 uploaded corporate photos (plant, facility, showroom, products).
- **About the Enterprise:** Detailed narrative on company history, operational scale, and mission.
- **Key Offerings & Specifications:** Bulleted list of offerings and dynamic badges for custom fields (*Export Markets, Certifications, Production Capacity*).
- **Leadership & Governance:**
  - Cards displaying linked Agarwal Founders, Directors, and Key Persons.
  - Displays their name, role title, and member serial number.
  - **Privacy Gate:** Verified members clicking a director card open `/directory/[id]` to inspect family background. Unauthenticated visitors see a friendly invitation to sign in.
- **Primary CTA:** Prominent **"💬 Connect / Chat with Business"** button.

### 3.3 Enterprise Profile Builder (`/businesses/create`)
- **Eligibility Guard:** Accessible exclusively to logged-in members belonging to an approved (`status = 'live'`) household.
- **4-Step Sequential Builder (Modeled directly on `/matrimony/create`):**
  - **Step 1: Company Profile:** Business Name, Legal Name, Tagline, Industry Sector, Business Type, Year Established, Country, State, City, Pincode, Address.
  - **Step 2: About & Offerings:** Comprehensive description, offerings summary, website URL, social links, dynamic custom fields.
  - **Step 3: Media & Credentials:** 1 to 3 photos upload (client-side compressed), Registration Type (GSTIN/CIN/MSME), and Registration Number.
  - **Step 4: Leadership Linking:** Select household members or search directory members, assign role titles, and designate the **Primary Chat Contact**.
- **Submission:** Profile is saved with `status = 'pending_review'`, creating a moderation queue item and triggering an email confirmation to the creator.

### 3.4 Household Dashboard Management (`/dashboard`)
- A dedicated **"My Businesses" (व्यापार प्रतिष्ठान)** tab in the member dashboard.
- Lists all businesses owned by the household with their live status chip:
  - `Under Review (समीक्षाधीन)`
  - `Live (प्रकाशित)`
  - `Paused (अस्थाई रूप से छिपा हुआ)`
  - `Needs Revision (संशोधन आवश्यक)`
- **Quick Controls:**
  - **Edit Details:** Direct link to edit text, photos, or website.
  - **Pause / Unpause Visibility:** 1-click toggle to temporarily hide or reveal from public search.
  - **Delete Listing:** Secure deletion with confirmation modal.

---

## 4. In-Website Chat Integration & Anti-Fraud Privacy

### 4.1 Routing Workflow
1. User clicks **"💬 Connect / Chat with Business"** on `/businesses/[id]`.
2. **Authentication Check:**
   - If guest: Opens modal *"Sign in as an Agarwal Community Member to message {Business Name} directly"* with a return redirect to `/businesses/[id]`.
   - If authenticated: Continues to conversation initialization.
3. **Primary Contact Resolution:**
   - Finds the director in `linked_directors` with `isPrimaryContact === true` (fallback to `createdByMemberId`).
   - If sender is the director: Shows toast *"This is your own enterprise profile."*
4. **Conversation Creation / Resume:**
   - Checks if an existing conversation exists between the sender and the director in the `conversations` table.
   - If new, creates conversation and inserts an initial system context banner:
     `🏷️ [Business Inquiry: {Business Name} — {Industry Sector}]`
   - Automatically navigates user to the chat interface.

### 4.2 Absolute Anti-Scraping Shield
- **Zero Raw PII Exposure:** Neither personal phone numbers nor personal emails are rendered in raw HTML or public JSON on `/businesses` or `/businesses/[id]`.
- Telemarketing crawlers and AI bots are completely prevented from scraping member contact numbers.

### 4.3 Anti-Fraud & Real-Time Alerts
- All messages pass through the existing `scanForFraud()` pipeline.
- Instant Resend notification email (`sendMessageRequestNotificationEmail`) is dispatched to the director.
- Pusher triggers an audio chime and real-time toast alert if the director is currently online.

---

## 5. Admin Moderation & Verification Portal

### 5.1 Moderation Interface (`/moderation`)
- Adds a dedicated tab: **"Business Directory (व्यापार प्रतिष्ठान समीक्षा)"**.
- Lists all pending businesses (`status = 'pending_review'`).
- Shows full submission details: Business name, tagline, description, sector, registration ID (GSTIN/CIN), household serial (`HHN-...`), author member (`MAFL-...`), linked directors, and uploaded photos.

### 5.2 Admin Actions
1. **Approve & Make Live:** Sets `status = 'live'`. Includes a checkbox for **"Award Verified Enterprise Badge"** (`is_verified_badge = true`) based on document validity.
2. **Request Changes / Reject:** Modal prompting for rejection reason. Sets `status = 'rejected'`, records `rejection_reason`, and emails the creator with feedback for revisions.

---

## 6. Layout, Navigation & User Guide Integration

### 6.1 Navigation Updates
- **Top Navigation Bar (`TopNavBar.tsx` / `MainHeader.tsx`):**
  - Add **"Business Network" (व्यापार मंच)** pointing to `/businesses`.
- **Main Footer (`MainFooter.tsx`):**
  - Add **"Business Network (वैश्विक व्यापार नेटवर्क)"** under Community & Services.

### 6.2 User Guide (`/guide/page.tsx`)
- Add **Topic 8: Global Business Network (अग्रवाल व्यापार एवं उद्योग मंच)**:
  - Bilingual English/Hindi copy.
  - Interactive 4-step flowchart:
    1. *Admin Approval & Member Requirement*
    2. *Enterprise Registration & Credentials*
    3. *Admin Verification & Verified Badge*
    4. *In-Website Commercial Chat & Inquiries*
  - Comprehensive FAQs covering multi-business quotas, GSTIN verification, and profile management.

---

## 7. Verification & Automated Testing Plan

### 7.1 Automated Contract & Seam Tests
Add dedicated seam test suite `tests/business-seams.test.mjs` verifying:
1. **Auth & Authorization:** Guest cannot call `createBusinessProfile`; returns 401/403.
2. **Status Gating:** Newly created business defaults to `status = 'pending_review'`.
3. **Directory Search Isolation:** Unapproved / paused businesses do not appear in `getLiveBusinessProfiles()`.
4. **Moderation Transitions:** Admin action `moderateBusinessProfile` successfully flips status to `live` or `rejected` with reasons, and awards `is_verified_badge`.
5. **Chat Target Resolution:** Business chat helper correctly maps to the primary contact director and refuses self-messaging.
6. **PII Sanitization:** Public business detail actions strictly omit raw phone and email fields.

### 7.2 Build & Type Checking
- `npm run type-check` (0 errors across all TypeScript definitions).
- `npm run build` (Clean Next.js production build with static and server routes).
