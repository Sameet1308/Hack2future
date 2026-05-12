# Glass Box AI — Project Context for Claude

> Auto-loaded each session. Keeps Claude oriented without re-pasting context.

## What this is
A 3-week hackathon build for **Business Challenge 2: Insurance Agentic Claims Processing**.
Team of 4–5 people, new to Microsoft Power Platform / Azure AI. Claude is the primary coding partner.

## Product
**Glass Box AI** — multi-agent insurance claims system. Five specialized agents (Intake, Policy, Extraction, Validation, Adjudication) + an Explanation Agent. Every AI decision is logged in an explainable "Glass Box" audit trail (Dataverse `Decision_Rationale` table).

**Three differentiators (US market framing):**
1. **Regulatory trust** — every AI decision logged in plain English. Maps directly to Colorado SB21-169, NAIC AI Model Bulletin (20+ states), NY DFS Circular Letter No. 7. *This is the lead pitch point.*
2. **Speed** — parallel agent orchestration via Power Automate (auto-approve in minutes, vs ~14 days at incumbents)
3. **Empathy** — one Copilot Studio agent across Mobile App / Web Chat / SMS / Email / Teams

## Stack (use only these)
Copilot Studio · Azure AI Document Intelligence · Azure AI Search · Azure OpenAI · Power Automate · Dataverse · Microsoft Teams · Azure Communication Services · MCP Tools (mocked for demo)

## Knowledge files (read these for detail)
- [docs/01_project_brief.md](docs/01_project_brief.md) — condensed brief, "How Claude must help" rules
- [docs/02_architecture.md](docs/02_architecture.md) — 4-layer system, agent designs, sample data, Adaptive Card JSON
- [docs/03_implementation_tips.md](docs/03_implementation_tips.md) — gotchas, known limitations, workarounds
- [docs/04_daily_tasks.md](docs/04_daily_tasks.md) — day-by-day plan with chat-starter prompts per task
- [docs/us_market_context.md](docs/us_market_context.md) — **US market overlay** (4 tables: components × US context, data points, APIs, ownership)
- [docs/intake_data_spec.md](docs/intake_data_spec.md) — **Intake Agent spec** (source of truth for FNOL questions, 11 loss types, sub-flows, docs matrix, escalation rules, Copilot Studio topic structure)
- [docs/decisions.md](docs/decisions.md) — running log of architectural choices
- [docs/diagrams/architecture.html](docs/diagrams/architecture.html) — end-to-end flow diagram (open in browser)

## How Claude must help
1. Step-by-step instructions — team is new to MS tools
2. Real configs / code, not concepts
3. For Copilot Studio: exact topic names, trigger phrases, node types, variables
4. For Power Automate: exact triggers, actions, expressions, connections
5. For Dataverse: exact table/column names, types, relationships
6. For Azure: exact endpoints, API calls, config steps
7. **Every agent action must log to `Decision_Rationale`** — non-negotiable
8. Working demo > perfect architecture; hardcoded sample data is fine
9. If something isn't feasible, say so and suggest the closest alternative
10. Tell the team what they should *see on screen* at each step

## Confidentiality
- Never write the host org name into any committed file. Use `<HOST_ORG>` as placeholder.
- Sample policyholder names in `docs/02_architecture.md` are fictional — keep them so.

## Current sprint phase
**Week 2 — Day 8 (2026-05-11)** — Frontend done. Confluence (PRD + Schema) published. Jira backlog CSV ready for import. Backend kickoff: Dataverse schema + Copilot Studio FNOL_Start topic. Sprint extended to **30 days, target 2026-06-10**.

## Confluence pages (PM space at aieliteltm.atlassian.net)
- [Glass Box AI — Product Requirements](https://aieliteltm.atlassian.net/wiki/spaces/PM/pages/1802274) — verbatim brief + scope + 22 requirements + open questions
- [Glass Box AI — Dataverse Schema](https://aieliteltm.atlassian.net/wiki/spaces/PM/pages/1802251) — 5 tables, slim+JSON pattern, sample data
- More child pages may be added (Architecture, Decisions Log, Implementation Tips)

## Decisions already made (see docs/decisions.md for rationale)
- **US market framing** (2026-05-05). Sample data, validation APIs, agent prompts all US-specific. Pitch leads with regulatory compliance (Colorado SB21-169 / NAIC).
- **Channel mix**: Mobile App (web chat in phone frame) + Web + Email + Teams + SMS. WhatsApp deferred to roadmap (US adoption ≈ 0%). Voice/IVR architecture-only.
- **Policy Agent** built as Power Automate flow calling Azure AI Search API directly (not Copilot Studio multi-agent handoff). Reason: agent-to-agent handoff strips citations.
- **External validation APIs**: NOAA Weather + NHTSA Recalls are **real** (free public APIs). ISO ClaimSearch / NICB / CARFAX / DMV / KBB / telematics all **mocked** via Power Automate HTTP-trigger flows.
- **Telematics**: mocked (Suraj). Fitbit/health sensors **deferred** to roadmap.
- **Azure OpenAI model** = GPT-4.1 or GPT-5 (GPT-4o retired Oct 2025).
- **Named owners**: Prasad on Policy data + RAG; Suraj on telematics mock.
- **Frontend stack** (2026-05-06): Vite + React 18 + Tailwind in `frontend/`. Single SPA serves both customer (`/customer/*`) and handler (`/handler/*`) surfaces. Hosted on Azure Static Web Apps. Mock SSO today, Microsoft Entra ID via SWA built-in auth in production (config in `frontend/staticwebapp.config.json`).
- **Carrier name in demo** = AI Elites. Glass Box AI stays as the underlying product credit.
- **Theater Mode** (2026-05-06): full-screen handler view + customer Processing screen, both animate the agent pipeline. Mock-driven via `frontend/src/data/agentTimelines.js` today, swap to real polling against Power Automate Decision_Rationale rows when backend exists.
- **Scope clarified** (2026-05-11): Personal Auto product line only (per brief), but **all 11 Auto loss types + all 5 lifecycle phases (incl Reopen) are in the build**. Demo stage-manages 2 Auto scenarios. "Property/Specialty out of scope" in the brief refers to separate product lines (homeowners, boat, etc.), NOT to Auto sub-types — Auto Liab-PD IS in scope.
- **Production scope locked — Option A** (2026-05-07): All system components production-grade. Industry-controlled data feeds use **sandbox adapters** with production-final interfaces. Procurement cycles (60–90+ days for ISO, NICB, CARFAX, DMV, KBB, telematics) run in parallel during demo build. No "mock" language — call them sandbox adapters.
- **30-day timeline** (2026-05-07): target 2026-06-10. Internal pilot scope (synthetic claims through full pipeline; no real money settles).
- **Verbatim hackathon brief** secured 2026-05-11 from Prasad's PM-space template. Stack mandate confirmed.

## How to run
- **Frontend** (now exists): `cd frontend && npm install && npm run dev` → http://localhost:5173. Full customer + handler demo playable with mock data. See `frontend/README.md`.
- **Backend** (Power Platform / Azure) lives outside this repo — Copilot Studio, Power Automate, Dataverse, Azure AI services. This repo holds the configs, schemas, JSON snippets, and decision logs that document those builds.

This repo holds:
- Sprint plan & daily tasks
- Architecture docs
- Frontend (Vite + React + Tailwind, customer + handler + Theater Mode)
- Configuration snippets, JSON schemas, Adaptive Card templates
- Sample data definitions
- Demo scripts

## Session protocol
At session start: read `CHANGELOG.md` to see where we left off. At session end: append a CHANGELOG entry.
