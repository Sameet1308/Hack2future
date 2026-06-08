# 06 — Frontend Integration: Live-backed Theater & Processing

**What this builds:** wires the React demo to the real backend so Theater Mode and the customer Processing screen play the *actual* `gbx_decisionrationale` (Glass Box) rows of a claim, while keeping the scripted mock as an always-working fallback.

**Why it matters for the demo:** judges see the same animated agent pipeline either way — but with the live flip on, every line in the Glass Box feed is a real Dataverse audit row written by the agent flows. That is the differentiator, proven end to end.

---

## What changed

| File | Change |
|---|---|
| `frontend/src/hooks/useClaimAudit.js` | **NEW.** Polls `CLAIM_AUDIT_URL` for one claim's `gbx_decisionrationale` rows every ~1.5s and maps them into the exact shape `useAgentTimeline` returns (`agents`, `subs`, `latencies`, `summaries`, `log`, `verdict`). Stops polling when the Adjudication verdict row arrives. No-ops when `CLAIM_AUDIT_URL` is unset. |
| `frontend/src/handler/Theater.jsx` | **HYBRID.** Runs the scripted mock *and* `useClaimAudit`. When real rows exist, live state wins per-agent and the mock backfills any step the backend hasn't logged yet (so the pipeline always looks complete). A `LIVE / connecting… / mock` badge shows the mode. Pure-mock behavior is unchanged when no URL is set. |
| `frontend/src/customer/Processing.jsx` | **HYBRID (low-risk).** Mock keeps driving the clock/progress/animation; real agent states + verdict override when live rows exist. |
| `frontend/src/config.js` | (already present) exports `COPILOT_EMBED_URL` and `CLAIM_AUDIT_URL` from Vite env. |

No routes changed. No component prop contracts changed — `AgentFlow` and `GlassBoxLiveFeed` render identically for both paths.

---

## The mapping (Decision_Rationale → timeline shape)

`useClaimAudit` reads these `gbx_decisionrationale` columns:

- `gbx_agent_name` (choice int **or** its `@OData.Community.Display.V1.FormattedValue` text) → pipeline node
  `Intake→INTAKE, Extraction→EXTRACTION, Policy→POLICY, Validation→VALIDATION, Adjudication→ADJUDICATION`.
- `gbx_sub_agent` (text) → validation sub-chip (`NOAA / NHTSA / ISO / NICB / DMV / Telematics / EstimateRule`).
- `gbx_flag_raised` (bool) → `flagged` state + amber feed line.
- `gbx_human_readable_explanation` (memo) → feed text + agent summary.
- `gbx_policy_reference` (text) → feed citation (`→ Section 4.2 …`).
- `gbx_latency_ms` (int) → per-agent latency (shown in seconds).
- `gbx_timestamp` → feed clock + row ordering.

**Verdict row** = the Adjudication row carrying a `gbx_recommendation`. It also reads
`gbx_tier` (10000→1, 10001→2, 10002→3), `gbx_confidence_score`, and `gbx_settlement_amount`.

> Choice text comes from the `@OData.Community.Display.V1.FormattedValue` annotation, **not** a `<col>name` column — the hook checks the annotation first, then falls back to the raw integer. This matches the same gotcha called out for `crcce_policystatus` in the flow runbooks.

### Expected read-flow payload

`GlassBox-GetClaimAudit` (the HTTP-triggered read flow, file `05_*`) should return the claim's rows as JSON. The hook accepts any of:

```json
{ "value": [ { "gbx_agent_name": 10000, "gbx_sub_agent": "",
  "gbx_human_readable_explanation": "11 universal + 6 collision questions answered…",
  "gbx_flag_raised": false, "gbx_latency_ms": 1800, "gbx_timestamp": "2026-05-04T09:46:02Z" } ] }
```

(also accepts a bare array, `{ "rows": [...] }`, or `{ "audit": [...] }`). The hook calls
`GET {CLAIM_AUDIT_URL}?claimId=<CLM-…>` (appending `&claimId=` if the SAS URL already has a query string).

---

## .env vars

Create `frontend/.env` (gitignored). See `frontend/.env.example` for the template.

```bash
# Published Copilot Studio web-chat URL (Settings → Channels → Custom website → iframe src)
VITE_COPILOT_EMBED_URL=https://copilotstudio.microsoft.com/environments/<env>/bots/<bot>/webchat?...

# GlassBox-GetClaimAudit HTTP-trigger flow URL ("When an HTTP request is received" → HTTP GET URL)
VITE_CLAIM_AUDIT_URL=https://prod-XX.westus.logic.azure.com:443/workflows/.../triggers/manual/paths/invoke?...
```

Restart `npm run dev` after editing `.env` — Vite only reads env at startup.

---

## How to flip live vs mock

| Goal | What to do |
|---|---|
| **Pure mock** (default demo fallback) | Leave `VITE_CLAIM_AUDIT_URL` unset. Badge shows `mock`. Play/Pause/Speed all work. |
| **Live** (real Dataverse audit) | Set `VITE_CLAIM_AUDIT_URL`, restart dev server. Badge shows `connecting…` then `LIVE` once the first real row is fetched. |
| **Force live intent on one view** | append `?live=1` to the URL (e.g. `/handler/theater/CLM-2026-4521?live=1`). |
| **Force mock even when URL is set** | append `?live=0`. Useful if the backend run is mid-flight and you want the clean scripted take. |

**Hybrid behavior:** if the backend has only written Intake + Policy rows so far, those two nodes show live state and the rest fall back to the scripted mock — the screen never looks half-finished. As more rows land each poll, live state takes over node by node until the Adjudication verdict arrives and polling stops.

---

## Test

1. **Mock path (no env):** `cd frontend && npm run dev` → open `/handler/theater/CLM-2026-4521`.
   Expect: badge `mock`, pipeline animates Intake→parallel→Adjudication, verdict card "Tier 1 · Approve · $2,300", feed fills with scripted lines. `/customer/processing/CLM-2026-4521` routes to `/customer/success` on completion.
2. **Live path:** set `VITE_CLAIM_AUDIT_URL`, restart, submit a claim through Sara so the agent flows write `gbx_decisionrationale` rows, then open `/handler/theater/<that CLM id>`.
   Expect: badge flips `connecting… → LIVE`; feed lines and timestamps match the real Dataverse rows; verdict reflects the real Adjudication row's recommendation/tier/confidence/amount; polling stops after the verdict.
3. **Build check:** `npm run build` — succeeds (61 modules, no errors).

---

## Gotchas

- **Choice text via annotation.** `gbx_agent_name` / `gbx_recommendation` text only arrives as `@OData.Community.Display.V1.FormattedValue`. The hook handles both that and raw integers — if your read-flow `select`s only raw columns, the integer maps still work.
- **CORS.** Browser `fetch` to the Logic Apps / Power Automate HTTP trigger needs CORS to allow the SWA origin (and `localhost:5173` for dev). If the live badge sticks on `connecting…`, check the browser console for a CORS error and add the origin to the flow's CORS config (or front it with the SWA managed API).
- **`claimId` must match the autonumber.** Pass the real `gbx_claim_id` (e.g. `CLM-2026-0001`), not the row GUID. The demo's `mockClaims` ids (`CLM-2026-4521`…) are illustrative — a real run will have its own autonumber.
- **Polling stop = verdict row only.** Polling halts when an Adjudication row with a `gbx_recommendation` lands. If adjudication legitimately doesn't emit a recommendation (e.g. pure Tier-3 auto-escalate), ensure that escalation row still sets `gbx_recommendation = Escalate (10003)` so the frontend knows the run is done.
- **Never breaks the demo.** Any fetch error is swallowed and the mock keeps rendering — there is no error state that blanks the screen.
