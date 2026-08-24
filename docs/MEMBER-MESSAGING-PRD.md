# Product Requirements Document (PRD): Member-to-Member Messaging & Trust & Safety System

- **Document Version**: 1.0.0
- **Status**: `ready-for-agent`
- **Domain**: Community Messaging, Privacy Protection & DPDP Compliance

---

## Problem Statement

To protect community members from unsolicited spam and commercial scraping, direct phone numbers and email addresses are masked across the directory. However, members frequently need to connect with fellow community members for professional networking, matrimonial inquiries, local community organizing, and cultural coordination. Without a secure communication channel, members are unable to reach each other unless they undergo a manual contact reveal, which reveals personal numbers and lacks trust-and-safety guardrails against harassment, impersonation, or financial fraud.

---

## Solution

A fully integrated, authenticated Member-to-Member Messaging System built directly into the Global Agrawal Directory web platform. The system allows verified members to initiate two-stage "Message Requests" to any directory member using internal identifiers, keeping raw phone numbers and emails 100% hidden. It incorporates automated anti-fraud scanning (blocking unsolicited UPI/bank spam), rate-limiting, one-click block/report controls, rolling 90-day retention policies, and full compliance with the Digital Personal Data Protection (DPDP) Act 2023 and Singapore PDPA.

---

## User Stories

1. As a verified community member, I want to click "Send Message" directly on any directory member profile, so that I can reach out without needing their personal phone number or email.
2. As a message initiator, I want to send an introductory note with my verified identity attached, so that the recipient knows who is reaching out and our shared Gotra/Native Place context.
3. As a message recipient, I want incoming first-time messages to appear in a "Message Requests" tab, so that my primary inbox isn't cluttered with unsolicited outreach.
4. As a message recipient, I want the ability to "Accept", "Decline", or "Block & Report" a message request, so that I maintain full control over who can converse with me.
5. As a message recipient, I want my online/read status hidden from the sender until I explicitly accept their message request.
6. As a conversation participant, I want to see real-time updates of incoming messages while a conversation is open, so that I can have fluid, responsive exchanges.
7. As a community member, I want prominent trust & safety banners inside every chat thread reminding me never to share financial credentials or OTPs, so that I am protected from fraud.
8. As a community member, I want automated warnings when a message contains suspicious payment links, UPI IDs, or financial solicitations, so that I can avoid scams.
9. As a harassed or defrauded member, I want a 1-click "Report Conversation" action with categorized reasons, so that designated community moderators can investigate.
10. As a reporting user, I want an immutable cryptographic snapshot of the reported conversation captured and routed to administrators, so that evidence cannot be tampered with.
11. As a community administrator, I want to view reported message threads in the moderation portal, so that I can take appropriate enforcement actions (warning, thread suspension, or account ban).
12. As a privacy-conscious member, I want all message contents older than 90 days to be automatically purged, so that my historical conversations are not stored indefinitely.
13. As a member exercising my DPDP Right to Erasure, I want my complete chat history expunged upon account deletion, so that my personal data is strictly respected.
14. As a platform operator, I want strict velocity limits (max 10 new conversations/day, max 60 messages/hour) enforced at the server layer, so that automated spammers cannot abuse the platform.
15. As a mobile directory user, I want a responsive, touch-friendly slide-over drawer and mobile conversation view, so that I can message effortlessly on smartphones.

---

## Implementation Decisions

### Module Boundaries & Interfaces
- **Database Schema**:
  - `conversations`: Primary store for pairwise threads (`id`, `initiator_id`, `recipient_id`, `status: pending|accepted|declined|blocked`, `last_message_at`, `last_message_preview`).
  - `messages`: Message payloads (`id`, `conversation_id`, `sender_id`, `recipient_id`, `message_body`, `is_flagged`, `flag_reason`, `read_at`, `created_at`).
  - `message_reports`: Audit store for moderation review (`id`, `conversation_id`, `reporter_id`, `reported_member_id`, `offending_message_id`, `reason`, `details`, `snapshot_data`, `status`).
- **Server Action Layer (`src/actions/chat.ts`)**:
  - `sendMessage({ recipientMemberId, messageBody, conversationId? })`
  - `getConversations()` (Returns split `{ active: [], requests: [] }`)
  - `getMessages(conversationId)` (Enforces participant ownership / IDOR check)
  - `respondToRequest({ conversationId, action: 'accept' | 'decline' | 'block' })`
  - `reportConversation({ conversationId, reason, details })`
- **Transport Architecture**:
  - Server Actions for mutation and persistence.
  - Active 3–5s SWR polling interval while a conversation window is in foreground focus; zero-polling when idle.
- **Trust & Safety / Anti-Fraud Filter**:
  - Deterministic regex patterns scanning for unsolicited UPI IDs (`[\w.-]+@[\w.-]+`), IFSC/bank patterns, and risky solicitation triggers.
- **Data Protection & Legal Compliance**:
  - Terms of Service & Privacy Policy updated with intermediary monitoring and audit disclosures (IT Act Section 79 & DPDP Act 2023).
  - Rolling 90-day pruning routine.

---

## Testing Decisions

### Seams & Verification Strategy
- **High-Level Integration Seams (`tests/chat.test.mjs`)**:
  - **Seam 1: Conversation Initialization & Request State**: Verify that sending a message to a new member creates a `pending` conversation and blocks subsequent messages until accepted.
  - **Seam 2: Strict IDOR & Authorization**: Verify that a third-party authenticated member cannot read messages from a conversation they are not a participant in (returns error/unauthorized).
  - **Seam 3: Anti-Fraud Heuristics**: Verify that messages containing UPI IDs or bank transfer requests are flagged with trust-and-safety metadata.
  - **Seam 4: Rate Limiting & Velocity Bounds**: Verify that exceeding 10 daily conversation initiations rejects with an explicit rate limit error.
  - **Seam 5: Report Snapshot Generation**: Verify that reporting a conversation logs a cryptographic thread snapshot in `message_reports`.

---

## Out of Scope

- Audio/video calling (WebRTC).
- End-to-end device-level key exchange (Signal protocol) — communications are server-facilitated to allow reporting and moderation under Intermediary Safe Harbor.
- File and document attachments (restricted to plain text and emoji to prevent malware distribution).

---

## Further Notes

- All UI components will inherit design tokens from our Maharaja Agrasen Heritage Design System (`brand-primary` #800020, `brand-gold` #D4AF37, and `canvas-warm` surfaces).
- The messaging icon with unread badge count will be integrated into the global `TopNavBar` and `MemberDashboard`.
