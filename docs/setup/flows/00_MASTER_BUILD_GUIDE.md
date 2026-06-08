# 00 — MASTER BUILD GUIDE (the single ordered plan to a working demo)

> **Read this first.** It is the one ordered build plan that ties together the six flow runbooks
> in this folder. It says **what to build, in what order, why that order, what is real vs sandbox vs
> scripted, how long each piece takes, what it costs, and how you know each piece is done.** No
> shortcuts: every flow is built and verified before the next one depends on it.
>
> Environment: **GlassBox-Dev** (`https://orgc0207390.crm.dynamics.com`). Agent: **Glass Box Claims
> Assistant** ("Sara"). Owners (SESSION_BRIEF): Utkarsh — Copilot Studio topics · Suraj — Power Automate
> flows · Prasad — Policy + RAG + Adjudication prompt · Rahul — frontend wiring · Abhijit — Dataverse +
> data · Sameet — end-to-end + integration + demo.

---

## 0. The non-negotiable architecture rules (every step obeys these)

1. **Sara never writes Dataverse directly.** She calls a **service-layer flow** (`GlassBox-CreateClaim`,
   `GlassBox-LogDecision`, …). Separation of concerns + least-privilege + one identical audit format
   across web/SMS/Teams/email (ADR 2026-06-02).
2. **One plain-English `gbx_decisionrationale` row per step.** Every agent/step calls the *same*
   `GlassBox-LogDecision` flow with a different `agentName`. The uniform one-row-per-decision audit
   trail **is the differentiator** (Colorado SB21-169 / NAIC AI Model Bulletin / NY DFS Circular 7).
3. **Already built & verified — do NOT re-spec:** `GlassBox-GetPolicy` (policy lookup) + the proactive
   **Greeting** topic ("Sara speaks first"). Everything below builds on top of these (Runbook 03 §1–2,
   `visual_build_guide.md` §1–2).
4. **ONE real gpt-4.1 call on the whole demo path** — only Adjudication (Runbook 04 §C). Everything else
   is Dataverse reads, two free public APIs (NOAA/NHTSA), six sandbox HTTP flows, and templates.
5. **Choice columns take the INTEGER on write; choice TEXT on read needs the
   `@OData.Community.Display.V1.FormattedValue` annotation.** This bit us repeatedly — it is baked into
   every runbook's expressions.

---

## 1. Dependency diagram (build order — top unblocks everything below it)

```
                       ┌──────────────────────────────────────────────┐
   ✅ DONE (Runbook 03) │  GlassBox-GetPolicy  +  Greeting topic        │  "Sara speaks first"
                       │  (policy lookup · proactive greeting · $0)    │
                       └───────────────────────┬──────────────────────┘
                                               │ provides Global.policyNumber + policyGuid
                                               ▼
        ┌───────────────────────────────────────────────────────────────────────┐
   01   │  GlassBox-CreateClaim  (service-layer WRITE)                            │
        │  resolves policy GUID → writes ONE gbx_claim row → returns claimId +    │
        │  claimGuid.  THE chokepoint every channel hits.                         │
        └───────────────────────────────┬───────────────────────────────────────┘
                                         │ returns claimGuid (needed to link audit rows)
                                         ▼
        ┌───────────────────────────────────────────────────────────────────────┐
   02   │  GlassBox-LogDecision  (service-layer WRITE — the Glass Box audit)      │
        │  writes ONE gbx_decisionrationale row. Reused by ALL ten agents.        │
        │  (Runbook 04 §0.5 adds 4 optional inputs to it — do that here.)         │
        └───────────────────────────────┬───────────────────────────────────────┘
                          ┌──────────────┴───────────────┐
                          ▼                              ▼
   ┌──────────────────────────────────┐   ┌──────────────────────────────────────────┐
05 │  FNOL_Start topic (conversation) │ 04│  GlassBox-MasterOrchestration (pipeline)   │
   │  greeting → 4 Qs → CreateClaim → │   │  fires on new gbx_claim row →              │
   │  LogDecision → claim # on screen │   │  Policy → Validation(NOAA/NHTSA+6 sandbox) │
   └────────────────┬─────────────────┘   │  → Adjudication(gpt-4.1) → Explanation,    │
                    │ creates the row      │  one audit row per step.                   │
                    └──────────────────────┤  Needs 6 sandbox adapter flows (§B.4).     │
                       row insert triggers →└────────────────┬───────────────────────────┘
                                                            │ writes the audit rows
                                                            ▼
        ┌───────────────────────────────────────────────────────────────────────┐
   03   │  GlassBox-GetClaimAudit  (HTTP-trigger READ flow — for the browser)     │
        │  GET ?claimGuid=… → ordered JSON array of the claim's audit rows.       │
        └───────────────────────────────┬───────────────────────────────────────┘
                                         │ VITE_CLAIM_AUDIT_URL
                                         ▼
        ┌───────────────────────────────────────────────────────────────────────┐
   06   │  Frontend live Theater + Processing (hybrid: live rows win, mock fills) │
        │  + publish agent · enable Custom-website channel · VITE_COPILOT_EMBED   │
        └───────────────────────────────────────────────────────────────────────┘
```

**Why this order:**
- `CreateClaim` (01) must exist before `LogDecision` (02) can be tested — LogDecision needs a real
  `claimGuid` to link to.
- `FNOL_Start` (05) and `MasterOrchestration` (04) both depend on 01+02 but are **independent of each
  other**: the conversation writes the claim row; the orchestration fires off that row insert. Build 04
  first (it produces the audit rows), then 05 (it produces the trigger), so when you wire the
  conversation the pipeline is already waiting.
- `GetClaimAudit` (03) can only return rows once 02+04 have written some — build it after the pipeline
  produces real rows.
- Frontend (06) is last because it consumes 03's URL and the published agent's embed URL.

> **File numbering note:** the `0x` filename order is **not** the build order. Build order is
> **GetPolicy/Greeting (done) → 01 → 02 → 04 → 05 → 03 → 06**. The map below is canonical.

---

## 2. What is REAL vs SANDBOX vs SCRIPTED (be able to say this to a judge)

| Element | Mode | Detail |
|---|---|---|
| Policy lookup (GetPolicy) | **REAL** | Live Dataverse `crcce_policy` read. Sarah Chen / Jennifer Rodriguez are real rows. |
| Greeting ("Sara speaks first") | **REAL** | Deterministic topic + real lookup. $0, no model call. |
| Claim creation (CreateClaim) | **REAL** | A real `gbx_claim` row (`CLM-2026-000x` autonumber) is written. |
| Audit trail (LogDecision → `gbx_decisionrationale`) | **REAL** | Every row is a real Dataverse write. This is the Glass Box — open the table live. |
| Master Orchestration pipeline | **REAL flow** | A real Power Automate background flow fires on the row insert. |
| Policy agent (coverage) | **REAL read / scripted wording** | Reads the real Policy row; deductible language is canned per loss family (prod = Azure AI Search over PDFs — noted in the audit row). |
| NOAA weather corroboration | **REAL API** | `api.weather.gov` — free, no key, `adapterStatus = Live`. |
| NHTSA recall check | **REAL API** | `api.nhtsa.gov/recalls` — free, no key, `adapterStatus = Live`. |
| ISO / NICB / CARFAX / DMV / KBB / Telematics | **SANDBOX** | Six HTTP-trigger flows returning canned JSON, `adapterStatus = Sandbox`. Production-final interface; `gbx_use_real_<x>` flag flips mock→real with no flow change. |
| Adjudication verdict | **REAL gpt-4.1 call** | The ONE live model call. `response_format: json_object`. The §7 rules then deterministically override it. |
| §7 auto-escalate overrides | **REAL deterministic rules** | Injury/distress/estimate/fraud-token rules; the LLM proposes, the rules dispose. |
| Explanation (customer message) | **SCRIPTED template** | Composed from the parsed verdict — NOT a 2nd model call (cost guardrail). Prod option = gpt-4o-mini. |
| Theater / Processing screens | **HYBRID** | Live audit rows win per-agent; scripted mock backfills any not-yet-logged step so the screen never looks half-finished. Pure-mock is the always-working fallback. |

> The honest one-liner for judges: *"Everything you see written to Dataverse is real. Two external
> checks (NOAA, NHTSA) are live public APIs. Six industry feeds run on sandbox adapters with the
> production interface — a single flag flips each to the real vendor once procurement clears.
> Adjudication is a real GPT-4.1 verdict, then hard compliance rules can override it."*

---

## 3. Realistic 2-day, time-boxed schedule

> Assumes the team works in parallel by owner but the **critical path is serial** (01→02→04→05→03→06).
> Hours are critical-path hours; parallel work (e.g. building the 6 sandbox flows, frontend polish)
> overlaps. Total critical path ≈ **11–13 hours** across two days.

### Day 1 — service layer + pipeline (the engine)

| Block | Hours | Build | File | Owner |
|---|---|---|---|---|
| Morning 1 | 1.0 | **Pre-flight:** confirm env alive (`az account show`, `verify_tables.py`, `peek_schema.py`); confirm GetPolicy + Greeting still work in test pane. | `visual_build_guide.md` §0 | Abhijit/Sameet |
| Morning 2 | 1.5 | **Build `GlassBox-CreateClaim`** + Test A/B. Gate: real `CLM-2026-000x` row linked to Sarah Chen. | **`01_create_claim.md`** | Suraj |
| Morning 3 | 1.5 | **Build `GlassBox-LogDecision`** (7 inputs) + both tests (Intake row + Sandbox/flag row). **Then add the 4 optional inputs** (Runbook 04 §0.5) and re-publish. Gate: `LOG-2026-0000001` lands, linked to the claim. | **`02_log_decision.md`** + `04_pipeline_agents.md` §0.5 | Suraj |
| Afternoon 1 | 1.0 | **Build the 6 sandbox adapter flows** (`GlassBox-Sandbox-ISO` then clone ×5). Store each POST URL as a `gbx_url_sandbox_<x>` env var. Can run in parallel with the morning. | `04_pipeline_agents.md` §B.4 | Suraj/Abhijit |
| Afternoon 2 | 2.0 | **Build `GlassBox-MasterOrchestration` §1 + §A (Policy) + §B (Validation)**. Dataverse trigger on Added/Claims, variables, Policy agent, NOAA (weather only), NHTSA, six sandbox blocks. | `04_pipeline_agents.md` §1, §A, §B | Suraj |
| Afternoon 3 | 1.5 | **Pipeline §C (Adjudication) + §D (Explanation)**. Wire the gpt-4.1 HTTP call (key/endpoint from env vars), parse verdict, §7 overrides, write verdict to claim, log Adjudication + Explanation rows. **Validate against `scripts/pipeline/run_pipeline.py` first ($0).** | `04_pipeline_agents.md` §C, §D | Prasad/Suraj |

**End of Day 1 gate:** create a Claim directly in Dataverse (or via the CreateClaim test) → the pipeline
fires → Decision Rationales fills with Policy → NHTSA → 6 sandbox → Adjudication → Explanation rows, each
plain-English, correct `adapterStatus`. Adjudication wrote a real verdict onto the claim. **The Glass Box
is live end-to-end on the backend.** (Keep `gbx_demo_mode=false` → gpt-4o-mini for all of Day-1 testing.)

### Day 2 — conversation + frontend + dress rehearsal

| Block | Hours | Build | File | Owner |
|---|---|---|---|---|
| Morning 1 | 1.5 | **Build `FNOL_Start` topic** — 4 questions → CreateClaim → set Globals → LogDecision → confirmation message. Test both scenarios in the test pane; verify rows in Dataverse. | **`05_conversation_wiring.md`** §1–12 | Utkarsh |
| Morning 2 | 0.5 | **Publish the agent** + enable **Custom website** channel; copy the embed `src` URL. | `05_conversation_wiring.md` §13–14 | Utkarsh |
| Morning 3 | 1.5 | **Build `GlassBox-GetClaimAudit`** HTTP read flow + all three tests (GUID, by-number, empty). Confirm FormattedValue annotations present. Grab the signed GET URL. | **`03_get_claim_audit.md`** | Suraj |
| Afternoon 1 | 1.0 | **Frontend wiring** — set `frontend/.env` (`VITE_COPILOT_EMBED_URL`, `VITE_CLAIM_AUDIT_URL`), `npm run dev`, verify mock path then live path. `npm run build`. | **`06_frontend_integration.md`** | Rahul |
| Afternoon 2 | 1.5 | **Full dress rehearsal** of both scenarios end-to-end (login → chat → claim # → Theater → audit rows → verdict), using `gpt-4o-mini` (`gbx_demo_mode=false`). Fix timing/wording. | `DEMO_RUNSHEET.md` | Sameet/all |
| Afternoon 3 | 0.5 | **Fallback drill** — practice the pure-mock Theater path (`?live=0`) so a backend hiccup never stalls the demo. Confirm kill-switch + spend check commands handy. | `DEMO_RUNSHEET.md` §Fallback | Sameet |

**5 minutes before judging:** flip `gbx_demo_mode = true` (→ gpt-4.1). Flip back to `false` immediately
after. **Never** leave demo mode on outside the judging window.

---

## 4. Cost guardrail (keep this in view the whole build)

> **Budget $55 · projected spend $7–12 · only Adjudication spends credit.** Full rules in
> [`../00_cost_guardrails.md`](../00_cost_guardrails.md).

- **The entire front door is $0:** GetPolicy, Greeting, CreateClaim, LogDecision, FNOL_Start,
  GetClaimAudit, the 6 sandbox flows, NOAA, NHTSA, Explanation template, publishing, the frontend — **none
  call a paid model.**
- **Only the Adjudication gpt-4.1 HTTP call spends credit** (~$0.15/call in demo mode). Dev/rehearsal runs
  use **gpt-4o-mini** (`gbx_demo_mode=false`, ~67× cheaper). Flip to gpt-4.1 only in the live judging
  window.
- **Freeze provisioning at $20 cumulative. Kill switch at $30.** Daily check + kill commands:
  ```
  az consumption usage list --query "sum([].pretaxCost)" -o tsv          # cumulative spend
  az group delete --name rg-glassbox-dev --yes --no-wait                  # kill switch
  ```
- Secrets (AOAI key, sandbox SAS URLs, the GetClaimAudit signed URL, the embed URL) live in **Dataverse
  environment variables** / `frontend/.env` (gitignored) — **never** typed into a flow definition or
  committed.

---

## 5. Per-flow build checklist + "done =" acceptance check

Tick each only when its **done =** check passes. Do not start a dependent flow until its prerequisite is green.

- [x] **GlassBox-GetPolicy** — *(DONE, Runbook 03 §1)* · **done =** `POL-2026-0847` → `Sarah Chen / 2022 Honda Civic / Active / found=true`; `POL-2026-0998` → `Amanda Williams / Expired`; bogus → `found=false`.
- [x] **Greeting topic** — *(DONE, `visual_build_guide.md` §2)* · **done =** test pane: Sara greets by name+vehicle+911 line for Active, denial-aware path for Expired, **no** "what's your policy number?" prompt.

- [ ] **01 · GlassBox-CreateClaim** → [`01_create_claim.md`](01_create_claim.md)
  **done =** Test A returns `claimId` ≈ `CLM-2026-0001` + a `claimGuid`; Dataverse Claims has the row, Policy linked to Sarah Chen, Channel=Web, Loss type=Collision, Status=New. Test B (`Comp-Weather`/`MobileApp`) maps `10001`/`10000`.

- [ ] **02 · GlassBox-LogDecision** → [`02_log_decision.md`](02_log_decision.md)
  **done =** test returns `LOG-2026-0000001`; Decision Rationales row linked to the claim, Agent=Intake, Adapter=NotApplicable, plain-English explanation, Timestamp set. Second test (Validation/Sandbox/flag Medium) lands too. **Plus** the 4 optional inputs from Runbook 04 §0.5 added and the flow re-published (test pane shows 11 inputs).

- [ ] **04 · GlassBox-MasterOrchestration (+ 6 sandbox flows)** → [`04_pipeline_agents.md`](04_pipeline_agents.md)
  **done =** creating a Collision claim (estimate 3200, no injury) drives status New→Processing→**Approved(10004)**, writes `gbx_recommendation`/`confidence`/`tier=1`/`settlement`, and produces audit rows in order: Policy → NHTSA(Live) → 6 Sandbox → Adjudication → Explanation (no NOAA row for Collision). Comp-Weather claim adds a NOAA(Live) row. Expired-policy claim writes a Policy denial row and **terminates after §A** (no Validation/Adjudication). Offline `scripts/pipeline/run_pipeline.py` matches the same status ints first.

- [ ] **05 · FNOL_Start topic (conversation wiring)** → [`05_conversation_wiring.md`](05_conversation_wiring.md)
  **done =** in the test pane, greeting → `I was rear-ended` → Collision → narrative → `CA` → injury No → **"your claim number is CLM-2026-00xx"** on screen; Dataverse shows the new Claims row + a matching Intake Decision Rationale row. Second scenario (`hail damage` → Comp-Weather → `FL`) writes a second real claim + Intake row.

- [ ] **03 · GlassBox-GetClaimAudit (HTTP read flow)** → [`03_get_claim_audit.md`](03_get_claim_audit.md)
  **done =** `GET <url>&claimGuid=<real-guid>` returns a 200 JSON array of the claim's rows in `gbx_timestamp asc` order, with `agent`/`adapterStatus` as TEXT (FormattedValue present); `&claimId=CLM-2026-0001` resolves the same; a bogus GUID returns `200 []` not an error.

- [ ] **06 · Frontend live Theater + publish/embed** → [`06_frontend_integration.md`](06_frontend_integration.md)
  **done =** mock path: `/handler/theater/CLM-2026-4521` animates + shows a verdict card with badge `mock`. Live path: with `VITE_CLAIM_AUDIT_URL` set + a real claim run, the same view flips badge `connecting…→LIVE`, feed/timestamps/verdict match the real Dataverse rows, polling stops after the verdict. `npm run build` succeeds. Sara loads in the phone frame at `/customer/chat` with `VITE_COPILOT_EMBED_URL` set.

**Whole-system gate (both must pass before the runsheet is "ready"):**
1. A claim created **through Sara** (FNOL_Start) appears in Dataverse, fires the pipeline, and the live
   Theater replays its real audit rows ending in the real verdict.
2. The pure-mock Theater path still plays cleanly with the audit URL unset / `?live=0` — the fallback
   never blanks the screen.

---

## 6. File map (each `0x` runbook, in build order)

| Build step | Runbook | What it delivers |
|---|---|---|
| (prereq) | `../03_flows_and_greeting_runbook.md` · `../visual_build_guide.md` | GetPolicy + Greeting (done) |
| 01 | [`01_create_claim.md`](01_create_claim.md) | service-layer claim write → `claimId` + `claimGuid` |
| 02 | [`02_log_decision.md`](02_log_decision.md) | the reusable Glass Box audit-row writer |
| 04 | [`04_pipeline_agents.md`](04_pipeline_agents.md) | Master Orchestration + Policy/Validation/Adjudication/Explanation + 6 sandbox flows |
| 05 | [`05_conversation_wiring.md`](05_conversation_wiring.md) | FNOL_Start topic → live claim # + first audit row + publish + channel |
| 03 | [`03_get_claim_audit.md`](03_get_claim_audit.md) | HTTP read flow the browser polls |
| 06 | [`06_frontend_integration.md`](06_frontend_integration.md) | hybrid live-backed Theater + Processing + embed |

Companion context: [`../../end_to_end_flow.md`](../../end_to_end_flow.md) (the 8-stage mental model),
[`DEMO_RUNSHEET.md`](DEMO_RUNSHEET.md) (the minute-by-minute demo script for both scenarios).
