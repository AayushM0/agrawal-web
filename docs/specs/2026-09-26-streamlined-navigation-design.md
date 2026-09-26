# Design Specification: Streamlined Navigation Bar & Professional Vector Icons

- **Date:** 2026-09-26
- **Status:** Approved
- **Scope:** Navigation UI Refactor (`MainHeader.tsx`, `TopNavBar.tsx`)
- **Key Constraints:** Zero emojis, clean inline SVG icons, strict accessibility, zero layout shifts, zero database/backend changes.

---

## 1. Problem Statement & Motivation

As the platform has expanded (Directory, Matrimony, Business Network, Chat, Moderation, Pass downloads), navigation links were progressively appended as standalone desktop buttons. This resulted in:
1. **Nav Clutter & Overcrowding:** On laptop/medium screens (1024px–1280px), 8–10 buttons caused visual crowding, wrapping, and poor visual hierarchy.
2. **Emoji Inconsistency:** The use of conversational emojis (`💍`, `🏢`, `💬`, `📊`, `🪪`, `🛡️`, `⚙️`, `🚪`, `🏠`) degraded the professional, authoritative visual identity of the Maharaja Agrasen Foundation portal.
3. **Redundant Secondary Bar:** The top announcement bar (`TopNavBar.tsx`) duplicated links already present in the main header.

---

## 2. Navigation Architecture

### 2.1 Direct Links (Desktop Center/Left)
The primary navigation is trimmed down to the two most essential core destinations, plus a unified dropdown:
1. **Home** (`/`)
2. **Directory Search** (`/directory`): Styled as the primary action pill with an inline SVG search icon.
3. **Explore Community ▾** (`CommunityDropdown`): A clean popover menu grouping secondary community platforms and institutional links:
   - **Matrimonial Platform** (`/matrimony`) — SVG rings/interlocking circles icon; Hindi subtitle: *वैवाहिक मंच & verified rishtey*.
   - **Business Network** (`/businesses`) — SVG building/office icon; Hindi subtitle: *व्यापार संजाल & community ventures*.
   - **About & 7 Strategic Pillars** (`/about`) — SVG classical columns/landmark icon; Hindi subtitle: *संस्था परिचय & 7 प्रमुख स्तंभ*.
   - **User Guide & Rules** (`/guide`) — SVG book/document icon; Hindi subtitle: *उपयोग निर्देशिका & दिशानिर्देश*.

### 2.2 Right-Side Action Area (Desktop)

#### A. Guest (Logged-Out) State
- **Sign In** (`/login`): Clean secondary button.
- **Register Family Free** (`/signup`): High-contrast golden CTA pill (`va-btn-join`).

#### B. Authenticated (Logged-In) State
Instead of 5 separate horizontal buttons, authenticated actions are grouped into two controls:
1. **Messages & Notifications Button**:
   - Clean SVG chat bubble icon.
   - Red pulse badge for unread count (`9+`).
   - Click toggles existing real-time notification popover (`MessageRequestToast` + floating drawer).
2. **User Account Menu ▾** (`AccountDropdown`):
   - Pill button displaying:
     - Avatar circle with head member initial (burgundy background, gold text).
     - Label: "My Account" + rotating SVG chevron.
     - If administrator: Small subtle `Admin` status pill.
   - Popover dropdown containing:
     - User header: Contact identifier & household role.
     - **My Household Dashboard** (`/dashboard`) — SVG layout-grid icon.
     - **Official ID Passes** (`/dashboard/pass`) — SVG identification-card icon.
     - If Admin: **Community Moderation Queue** (`/admin/moderation`) — SVG shield-check icon.
     - **Account Settings** (`/settings`) — SVG cog/settings icon.
     - Visual separator line (`divide-y divide-brand-accent/20`).
     - **Sign Out** button — SVG logout/exit icon with red hover styling (`text-red-700 hover:bg-red-50`).

### 2.3 Mobile Slide-Over Drawer
- Reorganized into clear, clean semantic categories:
  - **Section 1: Primary Navigation** (`Home`, `Directory Search`).
  - **Section 2: Community Platforms** (`Matrimonial Platform`, `Business Network`, `About & 7 Pillars`, `User Guide`).
  - **Section 3: User Account / Access** (`Messages & Requests`, `Household Dashboard`, `ID Passes`, `Account Settings`, `Moderation Queue` if admin, `Sign Out` or `Sign In` / `Register Family Free`).
- Complete elimination of emojis, replaced with clean SVG icons or pure typography.

### 2.4 Top Announcement Bar (`TopNavBar.tsx`)
- Retain the foundation motto: `One Community • One Platform • One Global Family (एक समाज • एक मंच • एक परिवार)`.
- Retain the official Secretariat Helpline: `+65 9277 4444`.
- Keep minimal quick links: `Home` and `User Guide`.
- Prune redundant links (`7 Strategic Pillars`, `Matrimony`, `Business Network`, `Messages`) to prevent multi-line wrapping and horizontal scrolling on smaller viewports.
- Remove all emojis.

---

## 3. Vector Icon Specifications (No Emojis)

All icons will be implemented as lightweight, accessible inline SVGs (`width={16} height={16} strokeWidth={1.75} fill="none" stroke="currentColor"`):
- **Search:** Magnifying glass circle + handle.
- **Chevron Down:** Minimal angular chevron with `transition-transform duration-200` (`rotate-180` when open).
- **Matrimony:** Two interlocking rings or heart silhouette.
- **Business:** Multi-story office building with window grid.
- **About / Pillars:** Classical temple pediment with architectural pillars.
- **Guide:** Open book / book-marked document.
- **Messages / Chat:** Speech bubble with rounded tail.
- **Dashboard:** 4-quadrant layout grid.
- **ID Pass:** Horizontal card with photo cutout and lines.
- **Moderation / Admin:** Shield with checkmark or keyhole.
- **Settings:** Cog / gear with symmetrical teeth.
- **Sign Out:** Door with outbound arrow.

---

## 4. Interaction & Accessibility Invariants

1. **Click-Outside & Escape Dismissal:**
   - Both `CommunityDropdown` and `AccountDropdown` attach a `mousedown` listener to dismiss when clicking outside.
   - An `onKeyDown` listener detects `Escape` and immediately closes the active menu, returning focus to the trigger button.
2. **Route Transition Auto-Close:**
   - `useEffect` listening to Next.js `pathname` automatically resets all dropdowns and mobile drawer to closed state upon navigation.
3. **Keyboard & Screen Reader Support:**
   - Buttons include `aria-haspopup="true"` and dynamic `aria-expanded={isOpen}`.
   - All interactive triggers have clear `aria-label` attributes.
4. **Z-Index & Backdrop Elevation:**
   - Header retains `sticky top-0 z-50` with `backdrop-blur-md bg-[#fffdf8]/95`.
   - Dropdown popovers use `z-50 shadow-xl border border-brand-accent/30 rounded-2xl bg-white`.

---

## 5. Verification Plan

1. **Unit & Seams Tests:**
   - Run `npm test` to verify zero regression across existing navbar seams and auth tests.
   - Add new tests in `tests/navigation-redesign.test.mjs` verifying:
     - `MainHeader.tsx` does NOT contain raw conversational emojis in navigation text.
     - `TopNavBar.tsx` does NOT contain raw emojis.
     - Direct navigation contains only `Home`, `Directory Search`, and `Explore Community`.
     - Logged-in navigation groups account actions into user dropdown.
2. **TypeScript & Build Verification:**
   - `npx tsc --noEmit` exits with code 0.
   - `npm run build` compiles all routes with code 0.
3. **Visual Inspection via `agent-browser`:**
   - Test desktop navigation at 1280px: verify direct links, Community dropdown expansion, and Account menu expansion.
   - Test mobile navigation at 390px: verify slide-over drawer structure and absence of emojis.
