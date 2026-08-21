# ANTARRASHTRIYA AGARWAL SAMAJ FOUNDATION (अंतर्राष्ट्रीय अग्रवाल समाज फाउंडेशन)

> One Community • One Platform • One Global Family | एक समाज • एक मंच • एक परिवार  
> Initiated under Maharaja Agrasen Foundation Limited Singapore (Sohan Lal Jindal *"Singapore Wale"*).

---

## 🏛️ Features Included

1. **Public Marketing & Heritage Portal**:
   - Hero section with authentic Agroha Dham Mandir backdrop.
   - Interactive 7 Strategic Pillars roadmap.
   - 18 Gotras Devanagari heritage directory.
   - Founder & Chairman appeal message.
2. **5-Step Family Registration Wizard (`/signup`)**:
   - Contact OTP verification.
   - Household Gotra & native place.
   - Repeatable member profile entry.
   - Granular field-level privacy toggles (DOB/age, contact, photo).
   - Timestamped consent logging into moderation queue.
3. **Login-Gated Directory Search (`/directory`)**:
   - Free-text search matching name, profession, native place, and city.
   - Faceted filters for 18 Gotras and global cities.
   - *"Near Me"* location radius search.
   - Privacy-sanitized result cards and detail profile views (`/directory/[id]`).
4. **Head of Household Dashboard (`/dashboard`)**:
   - Managed vs. Self-Claimed member indicators.
   - Single-click invite link generator (`/claim?token=...`).
5. **Member Self-Claim Flow (`/claim`)**:
   - Independent OTP verification.
   - Locks profile (`owner_locked = true`) to revoke head edit access.
6. **Admin Moderation Queue (`/admin/moderation`)**:
   - Approval making households live in search.
   - Rejection requiring a dispute reason (soft-delete record retention).

---

## 🚀 Quickstart

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run production build
npm run build
```

Open **http://localhost:3000** in your browser.