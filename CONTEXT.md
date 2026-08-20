# Global Agrawal Directory — Domain Context & Glossary

## Core Ubiquitous Language & Domain Concepts

### 1. Household (`Household`)
A fundamental family unit centered around a verified Head of Household. Contains family origin (`nativePlace`), canonical 18 Gotras lineage (`gotra`), reference ID (`#AGR-2026-XXX`), and member records.

### 2. Member (`Member`)
An individual belonging to a household. Can be managed by the Head of Household or self-claimed via an encrypted claim invite token (`verifiedBySelf`, `ownerLocked`).

### 3. Gotra (18 गोत्र)
The 18 established Gotras founded by Maharaja Agrasen: Garg, Bansal, Bindal, Dharan, Airon, Goyal, Jindal, Kansal, Kuchhal, Madhukul, Mangal, Mittal, Nangil, Singhal, Tayal, Tingal, Vatsil, Kasal.

### 4. Verification & DPDP Privacy
- `pending_review`: A newly registered household waiting in the moderation queue.
- `live`: An approved, searchable household in the directory.
- `visibility`: Field-level privacy controls (`members_only`, `hidden`, `public_to_members`).
- `revealContact`: Rate-limited, server-authenticated contact reveal mechanism.