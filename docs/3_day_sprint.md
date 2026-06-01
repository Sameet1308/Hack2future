# Glass Box AI — 3-Day Sprint Plan

> **Window**: 2026-06-06 evening → 2026-06-08 EOD · **Demo**: 2026-06-09 morning
> **Budget**: $55 Azure credits (target spend $7-12)
> **Owner**: Sameet · **Scribe**: Claude

---

## TL;DR — one paragraph

Ship Glass Box AI v1 in 3 days by leveraging the **existing React frontend** + **Microsoft Power Platform (Copilot Studio + Power Automate + Dataverse) as the entire agent layer** + **Azure OpenAI for Adjudication + Azure AI Search for Policy RAG + Document Intelligence for Extraction**. Every feature in the blueprint has a home — nothing is silently dropped. Tier-A items run real for both demo scenarios end-to-end; Tier-B items use real Power Automate flows with mock JSON behind a single config flag (`gbx_use_real_<X>`); Tier-C items are provisioned, wired, and lightly exercised during the demo so the panel sees they exist. The Glass Box audit (`Decision_Rationale`) is 100% real because that is the story.

---

## Three tiers — every feature classified, nothing skipped

### Tier A — Real for demo, deeply exercised (the core demo path)

| Feature | Microsoft service | Demo behaviour |
|---|---|---|
| Copilot Studio Intake — parent topic | Copilot Studio | `FNOL_Start` topic with U1-U11 universal questions + sentiment hook + gate-check call |
| 2 polished loss-type child topics | Copilot Studio | `FNOL_Collision` (Sarah scenario), `FNOL_Comp_Weather` (Jennifer scenario) |
| 9 stub loss-type child topics | Copilot Studio | Correct routing, return *"we'll follow up by phone"* with claim # |
| Create_Claim flow | Power Automate | HTTP trigger from Copilot, inserts Claim + Document rows in Dataverse |
| Master_Orchestration | Power Automate | Trigger on Claim row insert → fan-out → join → Adjudication → tier route |
| Notify_Customer | Power Automate | ACS for SMS, Outlook for email, Teams for in-band |
| Log_To_Audit (child flow) | Power Automate | Called by every agent, writes one row to Decision_Rationale |
| Validation parent flow | Power Automate | Fans out to 8 sub-flows (Tier A: NOAA + NHTSA live; Tier B for the other 6) |
| Adjudication Agent | Azure OpenAI (GPT-4.1 demo / GPT-4o-mini dev) | Real reasoning over coverage + extraction + validation, returns decision + tier + payout |
| Explanation Agent | Copilot Studio + Azure OpenAI | Reads Decision_Rationale rows, summarises in plain English, posts back via Notify |
| Policy Agent | Azure AI Search (Free tier) + AOAI | Vector RAG over 5 indexed policy PDFs, returns coverage matrix + citations |
| Extraction Agent (documents) | Document Intelligence (Free F0) | Real OCR on police reports, repair estimates |
| Teams Adaptive Card (Tier 2) | Power Automate Teams connector | Real card to real Teams channel, adjuster clicks Approve → Process_TeamsResponse fires |
| Dataverse 9 tables | Dataverse | All real, all populated |
| Decision_Rationale audit | Dataverse | Real row every agent step — this is the story |
| Entra ID + Key Vault + App Insights | Azure | Real, in Bicep |
| React customer SPA + Sara animated character | Static Web Apps Free | Already built, wire to live |
| React handler console + Theater Mode | Static Web Apps Free | Already built, rewire from mock to live Decision_Rationale polling |

### Tier B — Real interface + mock data behind a config flag (one-line flip to live)

Every Tier-B item has the **real Power Automate flow** with the **real JSON schema** the production version uses. Mock-vs-real is a Dataverse environment variable: `gbx_use_real_<adapter> = true/false`.

| Feature | Mock behaviour | Flip to real |
|---|---|---|
| GPT-4o Vision (Extraction Agent for accident photos) | Returns saved JSON from `docs/setup/mocks/vision_extraction_*.json` | `gbx_use_real_vision = true` → flow calls AOAI vision endpoint |
| ISO ClaimSearch (cross-carrier dup check) | Returns `{matches: 0}` | URL swap to ISO sandbox endpoint (procurement closes ~60-90 days) |
| NICB (fraud watchlist) | Returns `{fraud_flag: false}` | URL swap to NICB sandbox |
| CARFAX (vehicle history) | Returns canned VIN history | URL swap |
| DMV (driver record) | Returns clean record | URL swap |
| KBB / NADA (ACV for total-loss) | Returns calculation from a lookup table | URL swap |
| Telematics (UBI g-force + GPS) | Returns Suraj's pre-recorded sensor stream | URL swap (per `decisions.md` 2026-05-05 ADR) |

This is the honest production story — same schema as live, swap URLs when partner contracts close.

### Tier C — Provisioned + wired + lightly exercised in demo (proves architecture is real)

Earlier marked "skipped" — now we provision and the panel sees each one work, even briefly.

| Feature | What we build | Demo moment |
|---|---|---|
| **Azure AI Foundry Agent** | Create Foundry project + deploy basic agent + add `/customer/avatar-preview` route in React calling Foundry | 30-sec live moment showing *"alternative voice channel via Foundry — same Dataverse, same audit, swappable agent runtime"* |
| **Azure Speech Avatar** (real-time talking head) | Provision Speech F0 + clone Microsoft sample into `frontend/src/customer/AvatarTalkingHead.jsx` + wire to Foundry | Pre-recorded 60-sec working video as primary, live mode behind feature flag (flipped only if Day-3 connectivity good) |
| **MCP server** | FastMCP container in Container Apps Consumption (idle = $0). 2 tools: `lookup_policy`, `log_to_audit`. Foundry agent calls MCP for those 2 tools. | 15-sec architectural slide + screen-grab of an MCP tool call — proves the design is real |
| **Tier 3 CSR Teams Chat** | Real Teams group chat with one team member as "CSR Maria" + Power Automate flow that initiates the chat | Brief Day-3 moment: Jennifer's distress sentiment triggers escalation → Teams chat opens with full transcript + claim summary → CSR acknowledges → audit logged |
| **Power BI Ops Dashboard** | Power BI Desktop `.pbix` file connected to Dataverse (free with Pro trial / Desktop free) — 4 tiles: claims volume, tier mix, fraud-flag rate, time-to-decision | 20-sec dashboard reveal at the end of demo |
| **Closure / CSAT / Recovery / Compliance reporting agents** | Add tables (or columns) + Power Automate flow skeleton that fires when Claim status → CLOSED → writes one row to Decision_Rationale + sends survey via ACS | Architectural slide + brief demo if time permits |
| **Avatar as 6th channel** | Add `Avatar` to `gbx_channel` choice on Claim/Communication/Document | Documented as 6th channel in deck + Tier-C Foundry/Avatar demo above |

---

## Phases — hour by hour

### Phase 1 — Tonight (June 6, evening)

**Exit criterion**: Customer types policy # in web chat → bot pulls real Dataverse policy → bot greets by name.

| Hours | Track | Tasks |
|---|---|---|
| H0-0.5 | Critical path | (1) Submit AOAI access request at `https://aka.ms/oai/access` for `gpt-4o-mini`, `gpt-4.1`, `gpt-4o` (vision) in East US 2. (2) `az login` from this terminal. (3) Power Platform admin (whoever has tenant System Administrator) confirms access. |
| H0.5-2 | Azure provisioning | Bicep deploys RG + AI Search Free + Storage + Doc Intel F0 + Key Vault + App Insights + Speech F0 + Container Apps env (for MCP later). Outputs all keys to Key Vault. |
| H0.5-2 | Power Platform | Dataverse environment + `gbx` publisher + "Glass Box AI" solution. PAC CLI script creates 9 tables. |
| H0.5-2 | Copilot Studio | Environment linked to Dataverse env. Blank "Glass Box Intake" agent created. Web channel enabled. |
| H2-4 | Power Platform | Import sample data CSVs (51 StateRule + 5 policies + 10 adjusters + 25 vendors + 4 sample claim docs). |
| H2-4 | Copilot Studio | `FNOL_Start` topic — U1 policy lookup + U2 identity confirm built. Dataverse lookup action wired. |
| H2-4 | Power Automate | `Create_Claim` skeleton — HTTP trigger, inserts Claim row, returns `claim_id`. |
| H4-6 | Frontend | Existing React confirmed running locally. Direct Line token broker Function created. Web chat in React talks to real Copilot Studio. |
| H4-6 | Hello World test | Sarah scenario step 1-2 works: type policy # → bot greets. Bug-fix, commit. |
| H6 | Wrap | Commit, push, daily spend check, update sprint plan with what slipped. |

### Phase 2 — Day 2 (June 7)

**Exit criterion**: Sarah CA Collision T1 scenario works end-to-end live.

| Hours | Track | Tasks |
|---|---|---|
| H0-3 | Copilot Studio | All U1-U11 universal questions + sentiment hook + branching to `FNOL_Collision` + `FNOL_Comp_Weather` topics. 9 other loss types as stubs. |
| H0-3 | Power Automate | `Master_Orchestration` complete (fan-out to 3 parallel + join + call Adjudication + tier route). `Log_To_Audit` child flow. |
| H0-3 | AI Search + Policy | Upload 5 policy PDFs to Blob. Create AI Search index. Test query against Sarah's collision claim. |
| H3-6 | Adjudication | AOAI deployment (gpt-4o-mini for dev). Prompt engineered. Power Automate flow calling AOAI built. Test with Sarah's payload. |
| H3-6 | Validation | NOAA + NHTSA live calls work. 6 sandbox sub-flows return mock JSON. `gbx_use_real_*` env vars set up. |
| H6-9 | Extraction | Document Intelligence flow built. Mock vision JSON wired (saves cost). Real Doc Intel for police report + repair estimate. |
| H6-9 | Theater Mode | Rewire from `agentTimelines.js` mock to real Decision_Rationale polling. Verify pipeline visualises live. |
| H9-12 | E2E test | Sarah scenario: web chat → FNOL → Create → Master → 3 agents → Adjudication T1 → Notify. Audit log shows every step. Bug fixes. |
| H12 | Wrap | Commit, push, spend check. If on track, Jennifer scenario starts tomorrow. |

### Phase 3 — Day 3 (June 8)

**Exit criterion**: Jennifer scenario E2E (T2 + Teams card + adjuster Approve) + all Tier C provisioned + dress rehearsal done.

| Hours | Track | Tasks |
|---|---|---|
| H0-3 | T2 path | Jennifer Comp-Weather scenario. Teams Adaptive Card to real Teams channel. `Process_TeamsResponse` flow. Adjuster click-Approve updates Claim. |
| H0-3 | Explanation Agent | Copilot Studio + AOAI prompt that reads Decision_Rationale and posts a plain-English message back via Notify_Customer. |
| H3-6 | Tier C | Foundry project created. Basic agent deployed. `/customer/avatar-preview` route in React calls Foundry. |
| H3-6 | Tier C | MCP server FastMCP scaffolded, dockerised, pushed to Container Apps. 2 tools (`lookup_policy`, `log_to_audit`). Foundry agent calls MCP. |
| H6-9 | Tier C | Speech Avatar provisioned. Microsoft sample cloned to `AvatarTalkingHead.jsx`. Pre-recorded 60-sec demo video added to `frontend/public/avatar_demo.mp4`. |
| H6-9 | Tier C | Tier 3 CSR Teams chat — real Teams group chat + Power Automate `Initiate_CSR_Chat` flow. |
| H6-9 | Tier C | Power BI Desktop `.pbix` connected to Dataverse, 4 tiles built. |
| H9-12 | Dress rehearsal | Full demo run-through. Both scenarios + all Tier-C reveals. Time the demo (target 8-10 min). Bug fixes. |
| H12 | Wrap | Final commit, push, freeze. Confirm spend < $15. |

### Phase 4 — Demo (June 9 AM)

| Hours | Activity |
|---|---|
| H-1 | Spin up environment, verify all services healthy, dry-run once |
| Demo | Live demo per `docs/demo_script.md` |
| H+1 | Tear down via `az group delete --name rg-glassbox-dev --yes --no-wait` (optional, if no follow-up demo) |

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| AOAI access not approved by Day 2 | Med | Submit tonight (first 30 min). Mock adjudication with hardcoded JSON until approved. Same flow schema. |
| Speech Avatar provisioning fails in East US 2 | Med | Fallback = pre-recorded 60-sec video already in `frontend/public/`. Tier C demo unaffected. |
| Power Platform learning curve eats time (team is new per CLAUDE.md) | High | I provide importable artifacts (PAC CLI script, flow runbooks with exact action steps). Team imports + tests, doesn't design from scratch. |
| AI Search free tier exceeds limits (50MB / 10K docs) | Low | 5 policy PDFs ≈ 25MB. Well within limits. |
| MCP server deployment fails in Container Apps | Low | Tier C feature — can demo as architectural slide if blocked. |
| Teams Adaptive Card requires Teams Premium for some features | Low | Use basic Adaptive Card schema 1.4 (no Premium features). Tested with free Teams. |
| Demo connectivity issues | Med | Have a recorded backup of both scenarios + Tier-C reveals as final fallback. |
| Spend overshoots $55 | Low | Daily spend check, kill switch documented, free-tier SKUs pinned in Bicep, gpt-4o-mini in dev, vision mocked. |

---

## Cost guardrails — summarised here, detailed in `docs/setup/00_cost_guardrails.md`

- **Free tier pinned** in Bicep for AI Search, Doc Intel, Speech, Static Web Apps, Functions Consumption
- **Pay-per-token** AOAI: `gpt-4o-mini` for all dev/test; `gpt-4.1` only on the live demo Adjudication path; `gpt-4o` vision only at demo time
- **Kill switch**: `az group delete --name rg-glassbox-dev --yes --no-wait`
- **Daily spend check**: `az consumption usage list --start-date <today> --end-date <today>`

**Projected total spend over 3 days + demo**: $7-12. Safety margin: $43+.

---

## Tracks (who owns what)

Capacity-matched — I (Claude) generate code/config/runbooks; humans click, test, fix.

| Builder | Track | Strength used |
|---|---|---|
| **Sameet** | E2E + provisioning + integration glue + demo presentation | Architecture |
| **Prasad** | Policy Agent + AI Search RAG + Adjudication prompt tuning | Already owns Policy/RAG per `decisions.md` |
| **Utkarsh** | Copilot Studio topics (FNOL_Start + 11 children + sub-flows + Explanation) | AI + UI = conversational design |
| **Rahul** | Frontend wiring (Direct Line, Theater Mode rewire, scenario polish) | UI |
| **Suraj** | Power Automate flows + Validation Agent + 8 sub-flows | Already owns telematics mock per `decisions.md` |
| **Abhijit** | Dataverse env + 9 tables + sample data + sample policy PDFs | Less capacity, bite-sized tasks |

Re-assignment fluid — if someone is blocked, the next free hand picks up.

---

## What I (Claude) ship to the repo for this sprint

```
docs/3_day_sprint.md                       ← this file
docs/decisions.md                          ← appended sprint ADR
docs/setup/00_cost_guardrails.md           ← non-negotiable rules
docs/setup/01_first_30_min.md              ← first 30 min runbook
infra/main.bicep                           ← all Azure resources, free-tier pinned
infra/deploy.sh                            ← one-command deploy
docs/setup/02_dataverse.md                 ← PAC CLI script for 9 tables
docs/sample_data/state_rules.csv           ← 51 US states + DC
docs/sample_data/policies.csv              ← 5 policies (Sarah/Michael/Jennifer/David/Amanda)
docs/sample_data/adjusters.csv             ← 10 adjusters with state licenses
docs/sample_data/vendors.csv               ← 25 vendors clustered in 5 states
docs/setup/03_copilot_FNOL_Start.md        ← exact bot wording per turn
docs/setup/04_power_automate_flows.md      ← 8 flows step-by-step
docs/setup/05_aoai_aisearch.md             ← AOAI deployment + AI Search index
docs/setup/06_foundry_mcp.md               ← Tier C: Foundry + MCP
docs/setup/07_avatar.md                    ← Tier C: Speech Avatar
docs/setup/08_t3_csr.md                    ← Tier C: Tier 3 CSR Teams chat
docs/setup/09_powerbi.md                   ← Tier C: Power BI Desktop dashboard
docs/setup/mocks/                          ← JSON fixtures for vision + sandbox adapters
docs/demo_script.md                        ← exact words + screen-by-screen for the panel
```

---

## Decision log — what we explicitly chose for this sprint (full ADR in `decisions.md`)

1. **Copilot Studio is the canonical agent layer.** Foundry stays as a Tier C "alternative voice channel" preview.
2. **"Sara animated character"** in the existing web chat = our demo "avatar". The real-time video talking head is Tier C (Microsoft sample + pre-recorded fallback).
3. **All 8 validators built as Power Automate flows with real production schemas.** 2 live (NOAA + NHTSA), 6 with mock JSON behind `gbx_use_real_*` flags.
4. **`gpt-4o-mini` for all dev calls; `gpt-4.1` only on the live demo Adjudication path.** Saves ~$40 of $55 credit.
5. **Vision (`gpt-4o`) calls are mocked in dev** — `gbx_use_real_vision = false`. Real demo flips the flag for ~3 photo calls (~$0.15 total).
6. **MCP server is built as Tier C** — wired but lightly exercised. Demonstrates the shared-tool architecture without becoming a critical path dependency.
7. **All 11 loss-type topics built**: 2 polished (Collision + Comp-Weather), 9 stubs that route correctly and return *"we'll follow up by phone"* with a claim #. Topic structure proves the design covers Personal Auto end-to-end.
8. **Tier 3 CSR Teams chat is real** but lightly exercised (one team member plays "CSR Maria" for the Jennifer demo moment).

---

## Tonight's hard milestone — the only thing that matters by midnight

> Open `http://localhost:5173` → web chat → type *"I want to file a claim"* → Copilot Studio responds → type policy number `POL-2026-0001` → bot looks up real Dataverse → bot responds *"Hi Sarah, confirming this is for your 2022 Honda Civic?"*

If we hit that by midnight, we're on plan. If not — triage at midnight, re-plan Day 2.
