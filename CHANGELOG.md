# Changelog

Sprint log for Glass Box AI. Append a section per session.

## 2026-05-04 — Day 1 — Repo bootstrap
- Initialized repo with project context (`CLAUDE.md`) so future sessions auto-load.
- Imported four knowledge files into `docs/` (sanitized: host org → `<HOST_ORG>`).
- Logged baseline architectural decisions in `docs/decisions.md` (Policy Agent via Power Automate, mocked MCP validation, Voice deferred, model = GPT-4.1/5).
- Pushed initial commit to `https://github.com/Sameet1308/Hack2future.git`.

### Open items going into Day 2
- [ ] Whole team: complete Day 1 environment verification checklist (`docs/04_daily_tasks.md` → Day 1)
- [ ] Test WhatsApp channel availability in Copilot Studio — if unavailable, lock in Web Chat + Email + Teams as the demo channels
- [ ] Assign team roles (Person 1–5) and record in `docs/decisions.md`
- [ ] Confirm Azure OpenAI model deployment (GPT-4.1 or GPT-5)

## 2026-05-05 — Day 2 — US market pivot + flow consolidation
- Pivoted from geography-neutral (India-leaning) to **US auto-insurance** framing. Reason: US market size + regulatory tailwind (Colorado SB21-169, NAIC AI Bulletin, NY DFS Circular Letter No. 7). Glass Box becomes a literal compliance artifact, not just an explainability nice-to-have.
- Created `docs/us_market_context.md` consolidating four reference tables: flow components × US context, US-specific data points, real-vs-mocked external APIs, team ownership map.
- Updated `docs/02_architecture.md`: channel table (Mobile App in, WhatsApp out of P0), document requirements per claim type (US doc names), 5 sample policies rewritten as US (Sarah Chen CA, Michael Johnson TX, Jennifer Rodriguez FL, David Park NY, Amanda Williams OH), demo Scenario 1+2 rewritten with NOAA/NHTSA real-API calls and ISO ClaimSearch/NICB/telematics mocks.
- Updated `docs/04_daily_tasks.md` Day 1 (NOAA + NHTSA reachability check) and Day 13-14 (Mobile App + SMS, no WhatsApp).
- Logged 4 new decisions in `docs/decisions.md`: US pivot, NOAA + NHTSA real / others mocked, telematics mocked + Fitbit deferred, Prasad on Policy and Suraj on Telematics.
- Pushed end-to-end claim flow diagram (`docs/diagrams/architecture.html`) earlier in the session.

### Open items going into Day 3
- [ ] Whole team: complete Day 1 env-verification checklist (still outstanding from Day 1)
- [ ] Decide on the actual mobile-frame mockup approach (CSS phone frame around web chat — pick a template)
- [ ] Identify which 2 of the 5 unnamed Persons (1–5) take on which structural role; record in decisions.md
- [ ] Prasad: gather 2-3 sample US auto policy PDFs (or generate synthetic with the structure described in `docs/03_implementation_tips.md`) for AI Search indexing
- [ ] Suraj: draft the JSON shape for the mocked telematics endpoint (g-force, GPS, timestamp)

## 2026-05-05 — Day 2 (continued) — Intake Agent data spec
- Created `docs/intake_data_spec.md` — full FNOL data spec for the Intake Agent. Covers: loss taxonomy (11 types), 11 universal questions asked for every claim, 3 reusable sub-flows (other-party / witness / injury-triage), per-loss-type Q&A flows for all 11 types (Collision, Comp-Weather/Theft/Vandalism/Fire/Animal/Glass, Liab-PD/BI, PIP/MedPay, UM/UIM), consolidated documents matrix, time-sensitive flags, auto-escalate triggers, Dataverse column strategy (slim schema + LossTypeDetails JSON column), Copilot Studio topic structure (parent + 11 children + 3 sub-flows).
- Updated `docs/02_architecture.md` Intake Agent section to point at the spec as source of truth and describe the topic structure.
- Updated `docs/04_daily_tasks.md` Day 3-4 with explicit build order (FNOL_Start → SubFlow_InjuryTriage → FNOL_Collision → FNOL_Comp_Weather → others → FNOL_Confirm) and the slim-schema + JSON-column note.

### Open items going into Day 3 (updated)
- [ ] Whole team: complete Day 1 env-verification checklist (still outstanding)
- [ ] Decide on mobile-frame mockup approach
- [ ] Identify which 2 of the 5 unnamed Persons (1–5) take on which structural role
- [ ] Prasad: gather 2-3 sample US auto policy PDFs for AI Search indexing
- [ ] Suraj: draft the JSON shape for the mocked telematics endpoint
- [ ] Person 3 (Data Lead): build slim Claims table with universal columns + `LossTypeDetails` JSON column per spec §8
- [ ] Person 1 (Copilot Studio Lead): start FNOL_Start parent topic — universal questions U1–U11 from spec §2

## 2026-05-06 — Day 3 — Frontend (customer + handler) + Theater Mode
Big day. Stack got finalized and a working frontend shipped end-to-end.

**Stack lock-in**:
- Confirmed Microsoft Power Platform + Azure AI is the backend (no FastAPI, no Postgres pivot — brief mandates this stack and we'd lose the regulatory pitch by leaving it).
- Frontend hosted on **Azure Static Web Apps** (free tier, GitHub auto-deploy). Tiny token-broker Azure Function lives next to it for Direct Line.
- For the handler SSO question: **mocked today, production-ready Microsoft Entra ID config already in `frontend/staticwebapp.config.json`** under `_PRODUCTION_SSO_SNIPPET_READY_TO_PASTE` — flip a config block to enable Entra ID auth for `/handler/*` with zero React change.
- **Carrier name** in the demo = **"AI Elites"**. Glass Box AI stays as the underlying product/tech credit.

**Frontend shipped (Vite + React 18 + Tailwind, 36 files, ~3,000 LOC)**:
- Single SPA at `frontend/` serving both surfaces from one Static Web App
- **Customer** (`/customer/*`): 8 phone-frame screens — login → dashboard → Sara avatar greeting → loss type → mandatory questions form → docs → review → **processing (Theater Mode)** → success
- **Handler** (`/handler/*`): mock SSO → queue with 3 demo claims → claim detail with Glass Box panel → **Theater Mode** full-screen agent visualization
- **Sara persona**: real photo (randomuser.me) with initials fallback, persistent in customer header, prominent on greeting + success
- **AI Elites branding**: landing splash, handler header, sign-in
- Mock data covers all 3 routing tiers: Sarah (auto-approve, 94% confidence), Jennifer (Tier-2 with 3 fraud flags), David (Tier-3 BI auto-escalate)

**Theater Mode (the headline demo lever)**:
- Full-screen animated visualization of agent execution (handler) + customer-friendly mirror (customer Processing screen)
- 5-agent flow: Intake → parallel(Extraction, Policy, Validation) → Adjudication
- Validation expands into 7 sub-checks (NOAA, NHTSA, ISO, NICB, DMV, Telematics, EstimateRule)
- Live Glass Box feed with auto-scroll, flag highlighting, policy citations
- Speed control (0.5× / 1× / 2×), pause/play, replay
- Customer Processing screen plays at 1.5× and auto-routes to Success when done
- 100% mock-driven via `agentTimelines.js` — works offline, will swap to real polling against Power Automate later
- New files: `data/agentTimelines.js`, `hooks/useAgentTimeline.js`, `components/AgentFlow.jsx`, `components/GlassBoxLiveFeed.jsx`, `handler/Theater.jsx`, `customer/Processing.jsx`

**Verified locally**: `npm install` + `npm run dev` runs at http://localhost:5173. Full demo arc playable end-to-end. Server stopped at session end.

### Open items going into Day 4
- [ ] **Backend kickoff** — finally start on Power Platform side. Person 3 builds slim Claims table + `LossTypeDetails` JSON column in Dataverse (per intake_data_spec §8). Person 1 starts FNOL_Start parent topic in Copilot Studio (per spec §2).
- [ ] **Connect frontend Submit → real backend** — replace `navigate('/customer/processing/CLM-2026-4521')` in `frontend/src/customer/Review.jsx` with a `fetch()` to the Power Automate "Create Claim" flow URL. Returns the new ClaimID, pass it to `/customer/processing/:id`.
- [ ] **Connect handler Queue → Dataverse** — replace `mockClaims` import in `frontend/src/handler/Queue.jsx` with a `fetch()` to a Power Automate flow returning live claims.
- [ ] **Connect Theater → live Glass Box polling** — when ready, swap `useAgentTimeline` in `Theater.jsx` for a hook that polls `Decision_Rationale` rows for the claim and renders them as they appear.
- [ ] **Deploy frontend to Azure Static Web Apps** — connect this GitHub repo, set `app_location: "frontend"`, `output_location: "dist"`. Get a real public URL for the demo.
- [ ] **Day 1 env-verification checklist** still outstanding (NOAA + NHTSA reachability test, Copilot Studio access confirmed, Azure resources provisioned).
- [ ] **Names for Persons 1-5** — still 2 unassigned beyond Prasad and Suraj.
- [ ] **Sample policy PDFs** — Prasad's deliverable, blocks Day 8-9 RAG work.

### Where we left off (for Day 8)
Frontend demo is **fully functional locally** with mocked agent execution. Both customer and handler views work. Theater Mode is the showpiece. Day 4–7 pivot is **starting the actual Microsoft backend build** — Dataverse schema and the FNOL_Start Copilot Studio topic. Once those exist, swap the mocks one by one for real Power Automate flow calls.

## 2026-05-11 — Day 8 — Confluence published + scope clarified + verbatim brief secured
- Found the **verbatim hackathon brief** for the first time. It was in Prasad's "Template - Product requirements" Confluence page (PM space, page 229562). Full text now embedded in our PRD. **Stack mandate confirmed**: Copilot Studio + Azure AI + Power Automate + Dataverse + Teams + MCP tools. Our build aligned all along — no course correction needed.
- **Scope clarified** (per user direction): Personal Auto only as a *product line*, but **all 11 Auto loss types and all 5 lifecycle phases (including Reopen) are in the build**. Demo focuses on 2 stage-managed Auto scenarios (Sarah Collision Tier-1, Jennifer Comp-Weather Tier-2). The brief's "Property/Specialty out of scope" refers to *separate insurance product lines* (homeowners, boat, RV, etc.) — NOT to Auto sub-types like Liab-PD which IS in scope.
- **30-day timeline confirmed** (extended from initial 21-day estimate). Target: 2026-06-10.
- **Production scope locked (Option A)**: All system components are real and production-grade. Industry-controlled data feeds (ISO, NICB, CARFAX, DMV, KBB, telematics) use **sandbox adapters** with production-final interfaces — production endpoints get configured during the carrier's standard procurement cycle (60–90+ days, not in the team's hand). Renamed all "mock" language to "sandbox adapter" / "stub adapter".

**Confluence published (PM space, `aieliteltm.atlassian.net`)**:
- [Glass Box AI — Dataverse Schema](https://aieliteltm.atlassian.net/wiki/spaces/PM/pages/1802251/Glass+Box+AI+Dataverse+Schema) — full 5-table schema with the slim+JSON design pattern
- [Glass Box AI — Product Requirements](https://aieliteltm.atlassian.net/wiki/spaces/PM/pages/1802274/Glass+Box+AI+Product+Requirements) — v2 with explicit "In Scope" section, all 11 loss types, all 5 lifecycle phases, all 6 open questions answered

**Jira can't be auto-created**: the team's Atlassian OAuth token only has Confluence scopes — Jira project-creation requires admin re-authorization. Workaround shipped: `docs/jira_backlog.csv` is a Jira-importable CSV with 6 epics + 22 stories. Manual import instructions in `docs/jira_setup.md`.

### Open items going into Day 9
- [ ] Person 3 (Data Lead): build the 5 Dataverse tables per Schema page (~3 hours)
- [ ] Person 1 (Copilot Studio Lead): start FNOL_Start parent topic — universal questions U1–U11
- [ ] Sameet: create Jira project `GBX` manually + bulk-import `docs/jira_backlog.csv`
- [ ] Re-authorize Atlassian OAuth with Jira scopes if you want Claude to manage Jira directly
- [ ] Prasad: gather 2-3 sample US Personal Auto policy PDFs for AI Search indexing
- [ ] Suraj: draft the JSON shape for the mocked telematics endpoint
- [ ] Names for Persons 1–5 — still 2 unassigned beyond Prasad and Suraj
- [ ] Day 1 env-verification checklist — STILL outstanding (NOAA + NHTSA reachability test, Copilot Studio access, Azure resources)
