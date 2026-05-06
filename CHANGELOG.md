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
