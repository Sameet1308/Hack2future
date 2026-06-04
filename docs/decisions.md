# Architectural Decisions Log

Lightweight ADR-style log. Append a new entry whenever the team makes a design choice that future-us would otherwise have to re-derive.

Format:
```
## YYYY-MM-DD — <Title>
Context: <what problem / forcing function>
Decision: <what we chose>
Consequence: <what this enables / costs>
```

---

## 2026-05-04 — Policy Agent built as Power Automate, not Copilot Studio multi-agent
Context: Knowledge file `03_implementation_tips.md` flags that Copilot Studio's master agent summarizes sub-agent responses and may strip citations/links. The Glass Box differentiator depends on preserving exact policy clause references.
Decision: Build the Policy Agent as a Power Automate flow that calls Azure AI Search API directly, then uses Azure OpenAI to extract structured coverage data. Copilot Studio is reserved for user-facing conversation only (Intake, Explanation).
Consequence: Citations preserved end-to-end. Slight loss of "look how cool multi-agent is" demo narrative — recover by showing the parallel branches in Power Automate.

## 2026-05-04 — MCP validation mocked via Power Automate HTTP triggers
Context: Real MCP wiring (weather, contractor registry, fraud lookup) needs API keys, accounts, possibly vendor approval. Hackathon timeline doesn't justify it.
Decision: Each external check is a separate Power Automate flow with "When a HTTP request is received" trigger that returns hardcoded JSON. The Validation Agent calls these like real APIs.
Consequence: Demo looks identical to real integration. If asked, we say "production swaps these endpoints for real APIs — interface is unchanged." Tip file Option 2 path.

## 2026-05-04 — Voice/IVR dropped from live demo
Context: Voice channel requires Dynamics 365 Contact Center license, almost certainly not in our tenant. Listed as P3 in `02_architecture.md`.
Decision: Show Voice in the architecture diagram and pitch deck only. Don't attempt live deployment. Live demo channels = Web Chat + Teams + Email + (WhatsApp if Day 1 test passes).
Consequence: Pitch becomes "5 channels live, Voice in roadmap" instead of "6 channels". More honest, less risky.

## 2026-05-04 — Azure OpenAI model = GPT-4.1 or GPT-5
Context: Day 1 task originally said "deploy GPT-4o", but tip file notes GPT-4o was retired Oct 2025.
Decision: Deploy GPT-4.1 (preferred) or GPT-5 if available in our region. Update Adjudication and Explanation Agent prompts accordingly.
Consequence: One Day 1 checklist item corrected. No downstream changes — APIs are compatible.

## 2026-05-05 — Pivot to US auto-insurance market framing
Context: Original brief was geography-neutral but skewed India (FIR, RC book, RTO, IRDAI surveyor, WhatsApp-first). US market is ~$310B personal auto premium and offers a much stronger pitch lever — Glass Box maps directly to Colorado SB21-169, NAIC AI Model Bulletin (20+ states), NY DFS Circular Letter No. 7, and CA AB 2930. Regulatory compliance becomes the #1 selling point, not just empathy/speed.
Decision: All sample data, agent prompts, validation APIs, and demo scenarios use US-specific terminology (VIN, Driver's License by state, DMV, DRP shops, Police Report, Insurance Card, no-fault vs at-fault state routing). Five sample policyholders rewritten for US (Sarah Chen CA, Michael Johnson TX, Jennifer Rodriguez FL no-fault, David Park NY no-fault, Amanda Williams OH expired). WhatsApp dropped from primary channel mix; replaced with **Mobile App** (Copilot Studio web chat styled as a phone frame). Full mapping in `docs/us_market_context.md`.
Consequence: Pitch leads with "Colorado-compliant by design." Channel mix becomes Mobile App + Web + SMS + Email + Teams. Demo scenarios rewritten — Sarah Chen CA fender bender (auto-approve) and Jennifer Rodriguez FL water damage (escalation with ISO ClaimSearch + NICB + telematics flags).

## 2026-05-05 — Two real public APIs (NOAA + NHTSA), rest mocked
Context: All external validation was originally going to be mocked. Both NOAA Weather (api.weather.gov) and NHTSA Recalls (vpic.nhtsa.dot.gov) are free, public, no-auth APIs. Wiring them up is a half-day each.
Decision: Validation Agent calls NOAA and NHTSA for real. ISO ClaimSearch, NICB, CARFAX, DMV, KBB, telematics all remain mocked Power Automate HTTP-trigger flows.
Consequence: When judges ask "is anything actually real?" — yes, two of the eight validation APIs. Adds ~1 day of work (Person 3) but earns credibility.

## 2026-05-05 — Telematics mocked, Fitbit deferred to roadmap
Context: Suraj proposed full IoT (InfluxDB sensor stream) and Fitbit (heart-rate / health) integrations as differentiators. Telematics is genuinely valuable for fraud detection (g-force corroboration). Fitbit adds an OAuth dance and minimal demo value for an *auto* claim.
Decision: Telematics shipped as a Power Automate HTTP-trigger flow returning a pre-recorded sensor stream (g-force spike at incident time, GPS match). Pitched as "InfluxDB-backed sensor adapter, currently mocked, production interface unchanged." Fitbit removed from sprint scope; appears on the roadmap slide for PIP/MedPay claim corroboration.
Consequence: Suraj owns telematics mock + roadmap deck. No real OAuth or InfluxDB build in 3 weeks.

## 2026-05-05 — Team role assignments
Context: Five generic Person 1–5 placeholders + two named SMEs.
Decision: **Prasad** owns Policy data and RAG (components 9, 10 in `us_market_context.md` Table 1). **Suraj** owns telematics mock + Fitbit roadmap. Person 1–5 still TBD by name; structural roles unchanged.
Consequence: Two domain owners locked in. Daily-task file references map cleanly to people.

## 2026-05-06 — Stack frozen: no FastAPI, no full SPA framework swap
Context: Mid-build, the team raised whether to swap to React + FastAPI + Postgres. This was the right moment to interrogate the impulse, not later.
Decision: Stay on the brief-mandated Microsoft stack (Copilot Studio + Power Automate + Dataverse + Azure AI). Add **one minimal piece of code**: a static React frontend hosted on Azure Static Web Apps, talking to the existing Microsoft backend via Direct Line (chat) and Power Automate HTTP-trigger flows (data). No FastAPI, no Postgres, no second backend service.
Consequence: Brief intact, regulatory pitch intact (Glass Box compliance artifact lives in Dataverse, not a homegrown table). Frontend gives us the consumer-app polish without doubling the systems to operate.

## 2026-05-06 — Frontend on Azure Static Web Apps, Direct Line for chat
Context: Need to host the React app and bridge it to the Copilot Studio Intake Agent.
Decision: **Azure Static Web Apps** (free tier) for hosting + GitHub auto-deploy from this repo. **Bot Framework Direct Line** + Web Chat for the Copilot Studio embed when we wire it. Tiny **Azure Function inside SWA** acts as token broker so the Direct Line secret never reaches the browser.
Consequence: One Azure resource, GitHub-driven deploys, free-tier sufficient for hackathon. Custom UX without abandoning the Microsoft stack. The token-broker pattern is production-correct, not just demo glue.

## 2026-05-06 — Mock SSO today, Microsoft Entra ID config ready for production
Context: Handler routes need protection. Real Entra ID setup involves AAD app registration, secrets, and tenant configuration — out of scope for hackathon Day 3.
Decision: Mock the handler sign-in (button → localStorage session) for the demo. Ship the production Entra ID configuration **already written and commented out** in `frontend/staticwebapp.config.json` under `_PRODUCTION_SSO_SNIPPET_READY_TO_PASTE`. To go live in production, move that block to top-level `auth` and `routes`, set `AAD_CLIENT_ID` and `AAD_CLIENT_SECRET` in SWA Configuration. Zero React code change required.
Consequence: Demo isn't blocked on AAD work. The "production-ready SSO" claim is honest — the config exists, just needs activation.

## 2026-05-06 — Theater Mode (live agent execution visualization)
Context: The "agentic swarm" pitch is abstract on a slide. Glass Box was rendered as a static log in the handler view, missing the parallel-execution story entirely.
Decision: Build **Theater Mode** — full-screen animated visualization of the 5 agents executing, with Validation expanding into 7 sub-checks, a live Glass Box feed streaming on the right. Same component drives a customer-side **Processing screen** (friendlier labels, no jargon, plays between Submit and Success). Mock-driven today via `frontend/src/data/agentTimelines.js`; will swap to real polling against Power Automate `Decision_Rationale` rows when backend exists.
Consequence: Best demo lever per LOC in the entire build. Live and replay modes both work from the same component. Customer-side Processing screen materializes the "radical transparency" Glass Box pitch — no other insurer shows the customer their own audit trail being written in real time.

## 2026-05-06 — Carrier name = AI Elites (fictional)
Context: Demo needs an insurance-company name on the customer-facing UI. Hackathon confidentiality rule prevents using the host org name. Generic "Insurance Inc" is forgettable.
Decision: Use **"AI Elites"** as the fictional insurance carrier across all UI surfaces. Glass Box AI remains the product/tech credit ("Powered by Glass Box AI").
Consequence: Distinct, AI-forward branding that signals modernity. Easy to swap to a real carrier name later (single token across the codebase).

## 2026-05-07 — Production scope locked (Option A)
Context: User pushed "30 days, no mocks, full working product". Honest analysis: a fully-real production system needs 60-90+ day procurement cycles for industry-controlled data feeds (ISO ClaimSearch, NICB, CARFAX, state DMVs, KBB, carrier telematics). Not achievable in 30 days regardless of effort.
Decision: **Option A** — every system component is real and production-grade. Industry-controlled data feeds use **sandbox adapters** with production-final interfaces. Renamed "mock" language to "sandbox adapter" / "stub adapter (production endpoint pending procurement)" everywhere. Procurement workstream runs in parallel during demo build. Pitch line: *"Production-ready. Industry-data adapters are sandbox today; production endpoints configured during carrier procurement — same as how every real insurance integration works at launch."*
Consequence: Honest framing, no engineering debt, no judge surprised when asking "is this real?" Sprint extended to 30 days.

## 2026-05-11 — Verbatim hackathon brief secured
Context: Until now we'd been building from a derivative brief in `docs/01_project_brief.md` — the team's interpretation, not the original. Found the actual brief in Prasad's PM-space Confluence template page (id 229562).
Decision: Embedded verbatim brief in the new Confluence PRD page. **Stack mandate confirmed** (Copilot Studio + Azure AI + Power Automate + Dataverse + Teams + MCP tools). **Brief excludes**: Commercial / Personal-Property / Personal-Specialty as separate product lines. **Brief includes**: all of FNOL Intake + Assignment + Management + Closure + **Reopen** in the lifecycle.
Consequence: Confirms our direction, adds Reopen process to scope (was missing from our schema and intake spec), reaffirms Personal Auto as the product line.

## 2026-05-11 — Scope clarification: Personal Auto product line + ALL 11 loss types + ALL 5 lifecycle phases
Context: Earlier scope language could be misread as restricting the system to Collision + Comp-Weather only. User explicitly clarified: demo focuses on Auto, but the BUILD must include all auto loss types and the entire claim lifecycle.
Decision: **Build supports all 11 Personal Auto loss types** (Collision, Comp-Weather, Comp-Theft, Comp-Vandalism, Comp-Fire, Comp-Animal, Comp-Glass, Liab-PD, Liab-BI, PIP-MedPay, UM-UIM) **and all 5 claim lifecycle phases** (FNOL Intake, Assignment, Management, Closure, Reopen). Demo stage-manages 2 polished Auto scenarios (Sarah Collision Tier-1, Jennifer Comp-Weather Tier-2) but if a judge files a different test claim, the system handles it. **Auto Liab-PD is explicitly IN scope** — it's an Auto coverage, not standalone Property insurance.
Consequence: Confluence PRD updated to v2 with explicit "In Scope" section. Schema page updated to include Reopen status + parent-claim lookup. Build estimate unchanged because all 11 loss types were already specified in `intake_data_spec.md`.

## 2026-05-11 — Reopen process added to Claim lifecycle + schema
Context: 5-phase claim lifecycle in the brief includes Reopen. Our schema and agent design didn't model it.
Decision: Add `Reopen` value to `gbx_status_claim_choice`. Add new column `gbx_parent_claim` (Lookup → Claim) on the Claim table to link a reopened claim to its original. Reopened claims flow through the same 5 agents but the Adjudication Agent prompt includes the parent claim's outcome + new evidence as additional context.
Consequence: Schema delta is small (1 status value + 1 lookup column). Build effort: ~Day 19. UI work for customer-initiated reopen: stretch.

## 2026-05-11 — Confluence as additional surface; GitHub repo remains source of truth
Context: Confluence pages started getting created (PRD + Schema). Risk of drift between Confluence and GitHub.
Decision: **GitHub repo `Sameet1308/Hack2future` is the canonical source of truth.** Confluence pages mirror selected docs for stakeholders who live in Atlassian. Whenever a Confluence page is updated, the corresponding GitHub doc must also be updated in the same session. Each Confluence page links to the GitHub source.
Consequence: Single source of truth maintained. Team that prefers Confluence has read-friendly views. CHANGELOG entries note when both have been updated.

## 2026-05-11 — Jira project setup deferred to manual creation
Context: Atlassian OAuth token has Confluence scopes only — no Jira scopes. Cannot create Jira project or issues programmatically.
Decision: Generate `docs/jira_backlog.csv` as Jira-importable CSV (6 epics + 22 stories per Confluence PRD R1–R22). Provide step-by-step manual setup instructions in `docs/jira_setup.md`. Sameet creates the Jira `GBX` project manually in 5 min and bulk-imports the CSV.
Consequence: Jira board exists outside Claude's control loop. To enable Claude-driven Jira management later, an Atlassian admin re-authorizes the MCP server with Jira scopes (read:jira-work, write:jira-work).

## 2026-06-06 — 3-day sprint scope: every feature has a home, nothing skipped
Context: Build window opens June 6 evening; demo June 9 morning. $55 Azure credit budget. Team is new to Power Platform. Earlier sprint plans either over-promised (12-day build window) or proposed dropping Avatar/Foundry/MCP/Tier-3 outright. User pushed back — *"do not compromise on any feature, make a provision for real integration"*.

Decision: **3-tier feature classification** captured in `docs/3_day_sprint.md`:
- **Tier A — real for demo, deeply exercised**: Copilot Studio Intake (parent + 2 polished + 9 stub child topics); Power Automate flows (Create_Claim, Master_Orchestration, Notify_Customer, Log_To_Audit, Validation parent); Azure OpenAI Adjudication (gpt-4o-mini dev, gpt-4.1 demo); Azure AI Search Free tier RAG over 5 policy PDFs; Document Intelligence F0; NOAA + NHTSA live; Dataverse 9 tables + sample data; Teams Adaptive Card T2; Decision_Rationale audit; React frontend wired to live data; Sara animated character in chat UI.
- **Tier B — real interface + mock data behind a config flag**: 6 sandbox validators (ISO / NICB / CARFAX / DMV / KBB / Telematics) and GPT-4o Vision photo extraction. Same JSON schema as production. One Dataverse env var `gbx_use_real_<X>` flips mock → real.
- **Tier C — provisioned + wired + lightly exercised in demo**: Azure AI Foundry Agent (created, basic agent deployed, React `/customer/avatar-preview` route calls it briefly); Azure Speech Avatar real-time video (provisioned F0 free tier, Microsoft sample cloned, pre-recorded 60-sec fallback video as primary); MCP server (FastMCP container in Container Apps Consumption, 2 tools wired); Tier 3 CSR Teams chat (real, one team member plays CSR Maria); Power BI Desktop dashboard; Closure / CSAT / Recovery / Compliance reporting (skeleton agents with audit row + survey link).

Decision: **Microsoft-only stack, Copilot Studio is canonical agent layer.** Foundry stays as Tier C "alternative voice channel" preview, not the primary intake path. Maintains continuity with all blueprint artifacts (PRD R1-R25 + Confluence Schema v4 + 5 drawio diagrams + intake_data_spec.md §1.5 gate checks + §5.5 chase cadence).

Decision: **`gpt-4o-mini` for all dev/test calls; `gpt-4.1` only on live demo Adjudication path; `gpt-4o` vision mocked in dev (`gbx_use_real_vision = false`), flipped only at demo time** (~3 photo calls = ~$0.15). Saves ~$40 of $55 credit.

Decision: **"Sara animated character"** in the existing web chat = our demo "avatar". The real-time video talking head is Tier C — wired but not the primary demo path.

Decision: **Cost guardrails**: free-tier SKUs pinned in Bicep for AI Search / Doc Intel / Speech / Static Web Apps / Functions. Container Apps Consumption only. Kill switch `az group delete --name rg-glassbox-dev --yes --no-wait`. Daily spend check via `az consumption usage list`. Projected spend $7-12 of $55.

Consequence: Every feature in the blueprint has a home — nothing is silently dropped. Glass Box audit story stays fully real (all agent steps write real `Decision_Rationale` rows) because that is the differentiator. Demo lands with both scenarios live end-to-end + Tier-C reveals that prove the production architecture is real. Spend remains under $15 with $40+ safety margin. Detailed runbooks in `docs/setup/` are the team's executable plan; `docs/3_day_sprint.md` is the master and `docs/demo_script.md` is the panel-facing script.

## 2026-06-02 — Tiered data architecture for scale + service-layer writes (agent never writes Dataverse directly)
Context: While building the Copilot Studio Intake agent (Sara), two enterprise-architecture questions surfaced: (1) Is it acceptable for the agent to write directly to Dataverse tables? (2) At production scale (~200M policies), generative/keyword search over a Dataverse "Policy" table would be slow and costly — how is policy lookup actually handled? The demo currently uses Copilot Studio "knowledge" doing generative retrieval over a 5-row Dataverse Policy table, which works for a demo but does NOT represent the production data architecture.

Decision — **Writes go through a service layer, never agent→table directly.** Pattern: `Agent (Sara) → Orchestration/API layer (Power Automate flow or Azure Function) → Dataverse`. The agent calls well-defined actions (`GlassBox-CreateClaim`, `GlassBox-LogDecision`), not raw "Add a row". Rationale: separation of concerns (agent = conversation; service = business rules/validation/idempotency/retries), least-privilege identity (agent holds no broad write perms), reuse (web/SMS/Teams/email all hit the same service → identical audit format), and a single governed chokepoint for logging/throttling/monitoring.

Decision — **Tiered data stores; the 200M-policy master does NOT live in Dataverse.**
- **Policy system of record (~200M policies)**: core policy admin system (Guidewire-equivalent) or **Azure SQL / Cosmos DB**. Lookup is by **unique indexed key** (policy number) → O(log n), millisecond latency at any volume. Never a table scan, never RAG, for exact-match lookup.
- **Policy coverage *language* (PDF wording)**: **Azure AI Search** (vector + keyword index) for semantic retrieval at scale — consistent with the 2026-05-04 "Policy Agent via Power Automate → Azure AI Search" decision.
- **Claims in flight + the `Decision_Rationale` audit trail**: **Dataverse** — a small transactional working set (active claims), which is exactly what Dataverse is good at. NOT the 200M policy master.
- **Agent integration**: Sara → service layer → routes to the correct backend (policy API for exact lookup, AI Search for coverage wording, Dataverse for claim/audit writes).

Decision — **The demo's Dataverse Policy table (5 rows) is an explicit stand-in** for "the policy system." Production swap = replace the Copilot Studio Dataverse-knowledge lookup with (a) an API call to the policy DB for exact policy-number lookup, and (b) Azure AI Search for coverage-language questions. Same conversation, scalable backend. Keep the stand-in for the demo (fine at 5 rows); document the swap so it's pitch-ready when a judge asks the scale question.

Consequence: Architecture is honest and defensible under scrutiny — "how does this handle 200M policies / millions of claims?" has a crisp answer (indexed key lookup in a purpose-built store + AI Search for RAG; Dataverse only for the claim/audit working set). Build effort: the audit/claim writes become a reusable Power Automate flow (`GlassBox-LogDecision` + `GlassBox-CreateClaim`) instead of direct table tools — marginally more setup, materially better design and reuse across all 5 agents. No change to the demo experience; one note added to the architecture so the production data tiering is explicit.

Addendum (2026-06-02) — **Indexed exact-match lookup ≠ generative retrieval.** Two distinct mechanisms must not be conflated:
- **Exact policy-number lookup** = a **direct indexed query** (B-tree / alternate key). Finds 1 row among 200M in ~28 comparisons (log₂ 200M) → microseconds. Never scans the table. In Dataverse this is a unique **alternate key** on the policy-number column + "Retrieve by alternate key"; in a policy DB it's an index on the column; via API it's `GET /policies?policyNumber=...`.
- **Generative/semantic retrieval** (Azure AI Search, or Copilot Studio "knowledge") = vector+keyword search over *content*, for fuzzy "find relevant text" jobs (e.g. coverage wording). It is a scan-like cost model — fine for the 5-row demo Policy table, but the **wrong tool** for exact lookup at scale.
- **Our demo today** uses Copilot Studio "knowledge" (generative) over the 5-row Policy table — correct for the demo, explicitly swapped in production for an indexed API call. Generative search stays only for the coverage-language job where fuzziness is desired.
Net: "does the agent scan all 200M policies?" → **No.** It asks an indexed store for one specific record; only the *retrieval method* changes from demo (generative) to production (indexed API).

## 2026-06-04 — Authenticated context handoff + "Sara speaks first" (proactive, identity-aware greeting)
Context: While reasoning about the real-world flow, the question surfaced — in production the user *logs into the app before reaching Sara*, so identity (policy number / customer ID) is already established at login. Today's Hello World scaffold has Sara *ask* for the policy number inside the chat, which is backwards: it interrogates a user the system already knows. How should the conversation actually open?

Decision — **Identity is established at login (the app), never re-asked inside the chat.** The authority boundary is the app's auth (mock SSO in demo, Microsoft Entra ID via SWA built-in auth in production). After login the app holds the policyholder identity and **hands it to Sara** by seeding a Copilot Studio **global variable** (`Global.policyNumber`) on the embedded conversation — in production resolved from the authenticated Entra token (`System.User.*`). Sara therefore begins every conversation already holding the identity and holds no broad data-access rights of her own.

Decision — **Sara speaks first (proactive greeting) via the Conversation Start system topic.** The moment the chat panel opens, the embed sends a `startConversation` event that fires Copilot Studio's Conversation Start topic. That topic (1) looks up the policy by `Global.policyNumber`, (2) pre-fills name + vehicle + status, (3) greets by name and confirms the vehicle, (4) drops a one-line 911 safety triage, (5) asks the single open question *"What would you like to report today?"* This **replaces** the "type a policy number" Hello World behavior. Honest constraint acknowledged: a bot cannot speak from literal nothing — the `startConversation` event is the trigger; to the user it simply looks like Sara greeted them first. Standard pattern, not a fudge.

Decision — **Build-order consequence:** the Conversation Start (front-door) topic now precedes the FNOL intake topics. The end-to-end real-world flow (login → context handoff → proactive greeting + safety triage → universal questions → loss-type branch → gate checks → service-layer claim creation → downstream pipeline → outcome) is documented canonically in the new `docs/end_to_end_flow.md`, which ties together intake_data_spec §1.5/§2/§2.5/§4, the service-layer rule (ADR 2026-06-02), and the demo-vs-production tiering.

Consequence: The opening of the demo is sharper and more realistic — Sara greets *"Hi Sarah, I see you're covered on your 2022 Honda Civic…"* instead of asking who the customer is, which is both better UX (matches intake_data_spec §2.5 #1 "pre-fill from policy") and a stronger pitch beat. No new backend cost. One new front-door topic to build; the rest of the pipeline is unchanged. `docs/end_to_end_flow.md` becomes the team's shared mental model doc.
