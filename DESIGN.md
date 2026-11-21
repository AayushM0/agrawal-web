# Design System & Concept: Sohan Lal Jindal — Founder & Chairman

## Phase 0: Brief
- **Subject**: Sohan Lal Jindal ("Singapore Wale" / सोहनलाल जिंदल), Founder and Chairman of Maharaja Agrasen Foundation Limited, Singapore.
- **Audience**: Global Agarwal community families, community elders, youth, business owners, matrimonial seekers, and diaspora leaders.
- **Site's Job**: Serve as the authoritative, dignified biographical, leadership, and vision anchor for the Foundation's founder; verify his leadership credentials, public service honours, and provide direct, transparent communication channels.
- **Constraints**: 
  - Strictly adhere to verified facts. No LinkedIn or YouTube links.
  - Skip unconfirmed titles (e.g. AIVSF International Chairman) and unverified poster emails (MAFLSGGLOBAL@GMAIL.COM).
  - Use official Singapore entity registration (UEN: 202551557G).
  - Use portrait from `C:\Users\aayus\Downloads\Untitled.jpg` saved to `/images/sohan-lal-jindal-singapore.jpg`.
  - Maintain the royal, trusted heritage aesthetic while elevating it to modern international standards.

---

## Phase 1: Concept Card
```
Idea:        The Singapore Bridge — Connecting 5,000 years of Agrasen heritage with modern Singapore governance.
Metaphor:    A dignified royal archival ledger meets an international civic portal.
Signature:   An interactive bilingual leadership journey (English / Hindi Devanagari) with an authenticated public service milestone timeline and direct helpline connectivity.
Emotion:     Regal authority, deep cultural reverence, and transparent humility.
Motion verb: Settle like fine parchment, breathe with warm ambient gold illumination, smooth accordion and tab transitions.
Screenshot:  Hero composition featuring the framed portrait of Shri Sohan Lal Jindal alongside the royal Singapore Foundation seal, bilingual credentials, and instant WhatsApp/Helpline connectivity.
```

---

## Phase 2: Art Direction System

### Palette
| Role | Hex | Name | Purpose |
|---|---|---|---|
| Ground | `#fffdf8` | Warm Canvas | Primary page surface, gentle on the eye |
| Card / Elevation | `#ffffff` | Pure White | Elevated cards and reading surfaces |
| Ink Primary | `#291811` | Royal Umber | Headings, high-contrast text |
| Ink Body | `#422b22` | Deep Walnut | Body copy, readable contrast |
| Muted | `#7a5e52` | Warm Slate | Secondary metadata, dates, labels |
| Brand Primary | `#d9531e` | Terracotta Vermilion | Heritage badges, primary brand accents |
| Brand Burgundy | `#c04515` | Saffron Maroon | Deep gradient accents, buttons |
| Gold Accent | `#e69500` | Imperial Amber | Badges, borders, decorative highlights |
| Gold Soft | `#fde08b` | Champagne Gold | Subtle card gradients, focus halos |

### Typography
- **Latin Display & Body**: `Poppins` (Google Font, sans-serif), weights 400, 600, 700, 800, 900.
- **Hindi / Devanagari**: `Noto Sans Devanagari` (Google Font), weights 400, 600, 700.
- **Monospace**: `JetBrains Mono` for UEN and registration numbers.

### Grid & Composition
- **Max Container**: `max-w-6xl` (1152px) for intimate, high-impact reading.
- **Section Hierarchy**:
  1. **Hero Landmark**: Two-column layout on desktop (Portrait with gold seal & verification chips on left; Titles, bilingual headings, one-line descriptor, and instant CTA channels on right).
  2. **Interactive Bilingual Bio**: Segmented toggle to switch between English and Devanagari Hindi bio with full nuance.
  3. **Founder's Vision & Appeal**: The iconic community quote framed in royal gradient with 5 Core Principles (Dharma, Seva, Sanskaar, Shiksha, Samaj Utthan).
  4. **Public Service Timeline & Honours**: Chronological milestone cards featuring Dainik Jagran Dubai ministerial coverage, Panchkula Jayanti, and Global Icon Award 2026.
  5. **The 7 Strategic Community Platforms**: Interactive grid of live and upcoming pillars guided by his leadership.
  6. **Legal & Governance Transparency**: Official Singapore corporate details (UEN 202551557G, Public Company Limited by Guarantee, non-profit commitment).
  7. **Direct Secretariat Connect**: Clean, dignified contact card with phone, WhatsApp, verified email, and social profiles.

---

## Phase 3: Technical Implementation Plan
1. Copy image `Untitled.jpg` to `web/public/images/sohan-lal-jindal-singapore.jpg`.
2. Create client/server integrated page `web/src/app/sohan-lal-jindal/page.tsx` with:
   - Full Next.js `Metadata` export (title, description, OpenGraph, Twitter, canonical URL).
   - Rich JSON-LD `Person` schema with `sameAs` (Facebook & Instagram only, NO LinkedIn/YouTube).
   - Interactive language switch between English and Hindi.
   - Fully accessible buttons, links, ARIA labels, and WCAG AA contrast.
3. Link the Founder page across the site:
   - `FounderAppeal.tsx`: Add portrait, name, and profile link.
   - `MainHeader.tsx`: Add link under "Explore Community".
   - `RoyalFooter.tsx`: Add link in the Secretariat section.
4. Verify with `npm --prefix web run build`.
