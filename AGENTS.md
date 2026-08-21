# ANTARRASHTRIYA AGARWAL SAMAJ DIRECTORY — Agent Guidelines

Welcome to the ANTARRASHTRIYA AGARWAL SAMAJ DIRECTORY repository. This file provides guidelines and conventions for agentic workflows operating in this codebase.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles map 1:1 to their role names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout (`CONTEXT.md` at root, system architectural decisions in `docs/adr/`). See `docs/agents/domain.md`.

---

## Coding Standards & Environment

- **Framework**: Next.js 15 (App Router, Server Actions), React 19, TypeScript
- **Styling**: Tailwind CSS v3.4 with custom heritage theme tokens (`brand-primary`, `brand-gold`, `canvas-warm`)
- **Testing**: Node.js built-in test runner (`node --test tests/*.test.mjs`)
- **Database**: PostgreSQL with PostGIS / resilient dual memory fallback