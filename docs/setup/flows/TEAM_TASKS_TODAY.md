# Team Tasks — Parallel Build (hand this out)

> **Goal today: get to ~80% — a working LIVE demo.** Sameet is building **GlassBox-LogDecision**.
> Everyone else: pick your assignment below and run it in parallel. Each task is self-contained and
> points to its runbook. **Read the "Gotchas Cheat Sheet" FIRST — it will save you an hour each.**
>
> Environment: **GlassBox-Dev** (`https://orgc0207390.crm.dynamics.com`). Agent: **Glass Box Claims Assistant**.

---

## ⚡ GOTCHAS CHEAT SHEET (read before building ANY flow)

We learned these the hard way building GetPolicy + CreateClaim. Every flow hits them:

1. **"Flow" is now "Workflows".** Build flows via Copilot Studio → **Tools → + Add a tool → New tool → Workflows** (no "Flow" tile exists). It scaffolds a *"When an agent calls the flow"* trigger + *"Respond to the agent"*.
2. **The in-product Copilot CANNOT add Dataverse actions** ("connector not found"). Add **List rows / Add a new row** MANUALLY: the **+** between cards → **Add an action** → search "Dataverse".
3. **Your inputs get renamed to `text, text_1, text_2…`** (in the order you add them) — NOT the names you typed. So `triggerBody()['lossType']` FAILS. Either insert the **dynamic-content chip** (⚡), or reference by position: 1st input = `triggerBody()['text']`, 2nd = `['text_1']`, etc.
4. **Filter rows is OData:** `crcce_policynumber eq '` + ⚡chip + `'` — the word **`eq`**, value as a **chip wrapped in single-quotes**, **Row count = 1**.
5. **Read one row without a loop:** `first(outputs('List_rows_X')?['body/value'])?['column']` (rename the List-rows card so `X` matches).
6. **Lookups need the FULL path, not the bare GUID:** set a lookup field via fx to `concat('/<entityset>(', <guid>, ')')`. Examples: Policy → `concat('/crcce_policies(', <guid>, ')')`; Claim → `concat('/gbx_claims(', <guid>, ')')`. **Bare GUID fails with "Resource not found for the segment <guid>".**
7. **Choice columns on WRITE take the INTEGER.** Either pick the label from the dropdown, or switch the field to **"Enter custom value"** and give the integer (often via a Compose with nested `if()`).
8. **Choice TEXT on READ** comes from the annotation `<col>@OData.Community.Display.V1.FormattedValue` — there is **no** `<col>name` column.
9. **Autonumber primary columns (`gbx_claim_id`, `gbx_log_id`) are marked "required" by the connector** but you can't set them normally → generate one: `concat('CLM-', formatDateTime(utcNow(),'yyyy'), '-', substring(replace(guid(),'-',''),0,6))`.
10. **Expression action names = the card's display name with spaces → underscores.** "Add a new row" → `outputs('Add_a_new_row')?['body/<col>']`. Picking from the ⚡ dynamic-content list avoids guessing.

**Choice integers you'll need a lot:**
- `gbx_loss_type`: Collision=10000, Comp-Weather=10001, …, UM-UIM=10010
- `gbx_status`: New=10000, Processing=10001, UnderReview=10003, Approved=10004, Escalated=10006
- `gbx_agent_name`: Intake=10000, Extraction=10001, Policy=10002, Validation=10003, Adjudication=10004, Explanation=10005
- `gbx_adapter_status`: Live=10000, Sandbox=10001, NotApplicable=10002
- `gbx_recommendation`: Approve=10000, Deny=10001, Partial=10002, Escalate=10003, Adjust=10004
- `gbx_tier`: 1=10000, 2=10001, 3=10002

---

## 🟦 SURAJ — GlassBox-GetClaimAudit (HTTP read flow)  ⏱️ ~30 min
**Runbook:** [`03_get_claim_audit.md`](03_get_claim_audit.md) · **Unblocks the live Theater UI.**

This one is **HTTP-triggered** (not an agent flow) because the React app fetches it. In Power Automate
(make.powerautomate.com → GlassBox-Dev) create a flow with **"When an HTTP request is received"** trigger.
- Input: `claimGuid` (or `claimId`) from the query string.
- **Dataverse List rows** on **Decision Rationales**, filter `_gbx_claimid_value eq <guid>` *(GUID — UNQUOTED)*, sort `gbx_timestamp asc`.
- **Data Operation → Select** → build a JSON array of: `agent` (use the `gbx_agent_name@OData.Community.Display.V1.FormattedValue` text), `action`, `explanation` (`gbx_human_readable_explanation`), `adapterStatus` text, `flagRaised`, `latencyMs`, `timestamp`.
- **Respond** 200 with that JSON + header `Access-Control-Allow-Origin: *` (CORS for the browser).
**Done =** `GET <url>&claimGuid=<a-real-claim-guid>` returns a JSON array of that claim's rows, agent/adapter as TEXT. **Give the trigger URL to Rahul** (→ `VITE_CLAIM_AUDIT_URL`).

---

## 🟦 SURAJ / ABHIJIT — 6 Sandbox adapter flows  ⏱️ ~45 min
**Runbook:** [`04_pipeline_agents.md`](04_pipeline_agents.md) §B.4 · independent, no dependency.

Build **one** HTTP-trigger flow **`GlassBox-Sandbox-ISO`** that returns canned JSON (e.g. `{ "match": false, "matches": [] }`), then **clone it 5×** for **NICB, CARFAX, DMV, KBB, Telematics** with their canned payloads (see runbook). Store each flow's POST URL as a Dataverse environment variable `gbx_url_sandbox_<x>`.
**Done =** each flow, when POSTed, returns its canned JSON in <1s.

---

## 🟩 UTKARSH — FNOL_Start intake topic  ⏱️ ~45 min
**Runbook:** [`05_conversation_wiring.md`](05_conversation_wiring.md) §1–12 · depends on CreateClaim (✅ done) + LogDecision (Sameet, almost done).

In Copilot Studio → agent → **Topics** → new topic **`FNOL_Start`** (trigger: after greeting / phrases like "file a claim", "I was in an accident"). Add **Question nodes** for the 4 demo-critical fields:
- **lossType** (multiple choice: Collision / Comp-Weather)
- **description** (free text — "tell me what happened")
- **incidentState** (free text — 2-letter, e.g. CA)
- **injuryFlag** (Yes/No)
Then **call GlassBox-CreateClaim** with those values → store `claimId`/`claimGuid` in **Global** variables → **call GlassBox-LogDecision** (agentName=`Intake`, action=`Claim created`, explanation = a one-line summary) → **Message** the customer their claim number.
**Done =** test pane: greeting → "I was rear-ended" → 4 questions → **"Your claim number is CLM-2026-xxxx"** on screen, and a new Claims row + Intake audit row appear in Dataverse.
**Then:** **Publish** the agent → **Settings → Channels → Custom website** → copy the chat embed URL → **give it to Rahul** (→ `VITE_COPILOT_EMBED_URL`).

---

## 🟩 RAHUL — Frontend wiring + verify  ⏱️ ~30 min then on standby
**Runbook:** [`06_frontend_integration.md`](06_frontend_integration.md) · code is already written.

1. `cd frontend && npm install && npm run dev` → open `http://localhost:5173`.
2. **Verify the MOCK path works** (our safety net): `/handler/theater/CLM-2026-4521` should animate the pipeline + Glass Box feed + verdict. Also check `/customer/chat` shows the "not connected yet" placeholder.
3. Copy `.env.example` → `.env`. As the URLs arrive:
   - `VITE_CLAIM_AUDIT_URL=` (from Suraj's GetClaimAudit)
   - `VITE_COPILOT_EMBED_URL=` (from Utkarsh's publish)
4. Restart dev → **verify LIVE path**: `/customer/chat` shows real Sara; Theater for a real claim shows the LIVE badge + real audit rows.
**Done =** mock path plays cleanly; live path renders real data once URLs are set. `npm run build` succeeds.

---

## 🟨 ABHIJIT — Reference data load  ⏱️ ~30 min
The 8 non-Policy tables are empty. The settlement/assignment steps need them. Load sample rows into **Adjuster** (10), **Vendor** (25 — DRP shops/tow/glass/rental), **State Rule** (51) tables — via CSV import or a Python script like `create_dataverse_tables.py`. (Sameet/Claude can generate the CSVs/script — ask.)
**Done =** Adjuster / Vendor / StateRule tables show sample rows in make.powerapps.com.

---

## 🟨 PRASAD — Adjudication prompt + Master Orchestration structure  ⏱️ ongoing
**Runbook:** [`04_pipeline_agents.md`](04_pipeline_agents.md) §C (depends on LogDecision).
- Refine the **gpt-4.1 Adjudication prompt** (assemble claim facts → JSON verdict `{recommendation, confidence, tier, settlementAmount, rationale}`). Validate offline first: `python scripts/pipeline/run_pipeline.py` ($0).
- Start the **GlassBox-MasterOrchestration** flow shell: Dataverse trigger "When a row is added → Claims", then the Policy → Validation → Adjudication → Explanation steps, each calling **LogDecision**. (Build the structure now; wire the gpt-4.1 HTTP call once LogDecision is confirmed.)
**Done =** offline run_pipeline matches expected verdicts; orchestration shell triggers on a new claim and logs a Policy row.

---

## Dependency map (who waits on whom)
```
Sameet: LogDecision  ─────┬──► Utkarsh: FNOL topic (needs CreateClaim✅ + LogDecision)
                          └──► Prasad: MasterOrchestration (calls LogDecision)
Suraj:  GetClaimAudit ───────► Rahul: VITE_CLAIM_AUDIT_URL
Utkarsh: Publish ────────────► Rahul: VITE_COPILOT_EMBED_URL
Suraj/Abhijit: 6 sandbox flows  (independent)
Abhijit: reference data         (independent)
```

## Definition of "80% done" by end of session
- [ ] LogDecision built + tested (Sameet)
- [ ] GetClaimAudit built (Suraj) → URL to Rahul
- [ ] FNOL topic: chat → real claim + audit row (Utkarsh)
- [ ] Agent published + embedded → Sara live in the app (Utkarsh → Rahul)
- [ ] Live Theater shows real audit rows for a real claim (Rahul, with Sameet's seeded data)
- [ ] Mock fallback still plays cleanly (Rahul)

**Anything not done = covered by the mock demo + the runbooks. Nobody is blocked: every task above is self-contained.**
