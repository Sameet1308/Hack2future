# Glass Box AI — End-to-End Real-World Flow

> The single shared mental model for how a real customer moves through the system, from
> opening the app to a settled claim. Read this before building any topic or flow so
> everyone is wiring toward the same picture.
>
> Companion docs: `intake_data_spec.md` (the questions + gate checks), `02_architecture.md`
> (the 4-layer system), `data_architecture_reference.md` (scale + service-layer rule),
> `decisions.md` (the ADRs this flow rests on).

---

## 0. The one-paragraph version

A customer **logs into the app first** — identity is established *before* the chat, using
their policy number / customer ID + password (mock SSO today, Microsoft Entra ID in
production). The app then opens the chat and **hands Sara the authenticated identity**. Sara
**speaks first**: she greets the customer by name, confirms the vehicle she already sees on
the policy, drops a one-line safety triage ("if anyone's hurt, call 911"), and asks the one
open question — *"What would you like to report today?"* From the answer she branches into the
right loss-type sub-flow, asks **only the mandatory questions for that loss type**, runs the
10 pre-claim gate checks, and **creates a real Claim** (via a service-layer flow, never a
direct table write). Every decision along the way logs to `Decision_Rationale` — the Glass
Box. The new claim then flows through the downstream agents (Policy → Validation →
Adjudication → Explanation), and the customer is told the outcome and what happens next.

The key principle: **Sara never asks what the app already knows.** Login knows who you are;
Sara receives it and opens with it.

---

## 1. The whole flow at a glance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 0 — LOGIN (the app, NOT Sara)                                          │
│  User opens app → enters policy # / customer ID + password (SSO / Entra ID)   │
│  → app authenticates → app now holds the policyholder identity                │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                     │  passes identity (policyNumber) into the chat
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1 — CONTEXT HANDOFF                                                     │
│  App embeds Sara + sets global variable  Global.policyNumber = POL-2026-0847  │
│  Sara starts the conversation already holding the identity (no "who are you?") │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                     │  Conversation Start system topic fires
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2 — PROACTIVE GREETING + SAFETY TRIAGE  (Sara speaks first)            │
│  Lookup policy by number → "Hi Sarah, I see you're covered on your 2022 Honda │
│  Civic, policy active. Hope you're okay. ⚠️ If anyone is hurt, call 911 first. │
│  What would you like to report today?"                                         │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                     │  customer describes the incident
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 3 — INTAKE: universal questions (U1–U11) → branch on LossType (U5)     │
│  Pre-filled from policy (name, vehicle, coverage). One question per turn.      │
│  Sentiment check each turn. U5 routes to the right loss-type child topic.      │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                     │  loss-type-specific mandatory questions
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 4 — LOSS-TYPE SUB-FLOW (only the questions that loss type needs)        │
│  e.g. Collision → CollisionSubType, airbag, fault, damage areas + sub-flows    │
│  (other-party §3.1, witness §3.2, injury-triage §3.3 as applicable)            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                     │  confirm-before-commit summary
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 5 — 10 PRE-CLAIM GATE CHECKS (intake_data_spec §1.5)                    │
│  Policy exists · active on DOL · identity · not excluded driver · DOL in dates │
│  · no duplicate · coverage matches loss · vehicle on policy · min fields · SIU │
│  All pass → issue claim #.  Fail → remediation / warm human handoff.           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                     │  Sara CALLS the service layer (never writes table directly)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 6 — CLAIM CREATION + AUDIT  (the service layer = the differentiator)    │
│  GlassBox-CreateClaim  → writes gbx_claim row → returns Claim #                │
│  GlassBox-LogDecision  → writes Decision_Rationale audit row(s)                │
│  "Your claim number is 2026-CLM-04521."                                        │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                     │  new gbx_claim row triggers Master Orchestration
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 7 — DOWNSTREAM PIPELINE (agents, in parallel where possible)            │
│  Policy Agent (coverage/RAG) → Extraction (docs/photos) → Validation (NOAA,    │
│  NHTSA, sandbox adapters) → Adjudication (GPT-4.1) → Explanation (plain English)│
│  EVERY step logs its own Decision_Rationale row.                               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                     │  decision reached
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 8 — OUTCOME + WHAT'S NEXT                                               │
│  Auto-approve (minutes) / route to adjuster tier / request more docs.          │
│  Customer told outcome + next steps + how to check status. Notification Agent  │
│  chases any missing fields/docs (§5.5 cadence). Save-and-resume available.     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stage-by-stage — what the user sees vs what happens behind the glass

### Stage 0 — Login (the app's job, not Sara's)

- **User sees:** the app's login screen. Enters policy number (or customer ID / email) +
  password. In production this is **Microsoft Entra ID** via Azure Static Web Apps built-in
  auth; in the demo it's **mock SSO** (a button that sets a known identity).
- **Behind the glass:** the app authenticates and now holds the policyholder's identity. This
  is the authority boundary — **identity is proven here, once, and never re-asked inside the
  chat.**
- **Why it matters:** this is the difference between a bot that interrogates ("what's your
  policy number?") and an agent that already knows you. It also means Sara holds *no* broad
  data-access rights of her own — she only ever sees the one identity the app handed her.

### Stage 1 — Context handoff into Sara

- **User sees:** nothing — the chat panel just opens.
- **Behind the glass:** the app embeds the Copilot Studio agent and sets a **global variable**
  on the conversation, e.g. `Global.policyNumber = "POL-2026-0847"` (and optionally a signed
  user token). Sara begins the conversation already holding that value.
- **Mechanism:** Copilot Studio global variables can be seeded from the embedding canvas. In
  production the cleaner form is an **authenticated** agent where `System.User.*` comes from
  the Entra token; the policy number is resolved from the authenticated user.
- **Demo stand-in:** we set `Global.policyNumber` directly from the mock-login selection. Same
  downstream behavior.

### Stage 2 — Proactive greeting + safety triage (Sara speaks first)

- **User sees:**
  > *"Hi Sarah — I see you're covered on your 2022 Honda Civic, and your policy is active.
  > I hope you're okay. ⚠️ If you or anyone else is hurt, please call 911 first. Whenever
  > you're ready — what would you like to report today?"*
- **Behind the glass:** the **Conversation Start system topic** fires the moment the chat
  opens. It (1) looks up the policy by `Global.policyNumber`, (2) pre-fills name + vehicle +
  status, (3) renders the greeting + the safety line, (4) asks the single open question.
- **Mechanism note (honest constraint):** a bot can't speak out of literal nothing — *some*
  signal triggers turn 1. The embed sends a `startConversation` event when the panel opens,
  which fires the Conversation Start topic. To the user it looks exactly like Sara greeted
  them first. This is standard, not a fudge.
- **If the policy lookup fails** (rare — they're logged in): fall to a graceful "let me pull
  up your details" path → gate-check §1.5 #1 handling.

### Stage 3 — Intake: universal questions, then branch

- **User sees:** a warm, one-question-at-a-time conversation. Crucially, Sara **skips anything
  already on the policy** (name, vehicle, coverage, deductible) — UX rule §2.5 #1.
- **Behind the glass:** the `FNOL_Start` parent topic walks U1–U11 (`intake_data_spec` §2).
  U5 ("What kind of incident was it?") is the **branch point** — it routes to the matching
  loss-type child topic. Each customer turn runs a **sentiment check**; distress → softer tone
  + `DistressFlag = Y`.
- **What gets collected:** date/time, location (→ state, drives no-fault routing + NOAA),
  narrative, injury flag, police report, drivable, other party involved.

### Stage 4 — Loss-type sub-flow (only what that loss type needs)

- **User sees:** questions tailored to what happened — and *nothing irrelevant* (no
  "other-party" questions on a single-vehicle hailstorm).
- **Behind the glass:** the child topic (e.g. `FNOL_Collision`) asks just its mandatory set,
  and calls reusable sub-flows as needed: other-party §3.1, witness §3.2, injury-triage §3.3.
- **The 11 loss types** (full branch detail in `intake_data_spec` §4): Collision, Comp-Weather,
  Theft, Vandalism, Fire, Animal, Glass, Liability-PD, Liability-BI, PIP/MedPay, UM/UIM.
- **Confirm before commit (§2.5 #6):** Sara summarizes back what she captured and asks "does
  that look right?" before generating a claim number.

### Stage 5 — The 10 pre-claim gate checks

- **User sees:** usually nothing — a brief "let me get this set up." Only sees a difference if
  a check fails (e.g. a warm handoff to a specialist).
- **Behind the glass:** `intake_data_spec` §1.5 — 10 checks, each mapped to a Power Automate
  action, run in order. Guiding rule: **"Day-1 claim number, always."** Even on incomplete
  fields the customer leaves with a number (`PENDING_INCOMPLETE`) and the Notification Agent
  chases the rest. Hard stops only for: no policy, inactive on DOL, identity fail, excluded
  driver, coverage mismatch → specialist handoff with full transcript.
- **Every gate outcome logs** a `Decision_Rationale` row (`agent = 'intake_gate'`) so an
  auditor can trace exactly why a claim # was or wasn't issued.

### Stage 6 — Claim creation + audit (the service layer = the differentiator)

- **User sees:**
  > *"You're all set — your claim number is **2026-CLM-04521**. Here's what happens next…"*
- **Behind the glass — and this is the architectural rule that matters (ADR 2026-06-02):**
  Sara **does not write Dataverse directly.** She **calls a service-layer flow**:
  - **`GlassBox-CreateClaim`** — validates + writes the `gbx_claim` row → returns the Claim #.
  - **`GlassBox-LogDecision`** — writes the `Decision_Rationale` audit row(s), linked to the
    claim.
- **Why a service layer (not a direct "Add a row" tool):** separation of concerns (agent =
  conversation, service = business rules/idempotency/retries), least-privilege (Sara holds no
  broad write perms), and reuse — web / SMS / Teams / email all hit the *same* service → one
  identical audit format. One governed chokepoint for logging + throttling + monitoring.

### Stage 7 — Downstream pipeline

- **Behind the glass:** the new `gbx_claim` row triggers **Master Orchestration** (Power
  Automate), which fans out to the specialist agents:
  - **Policy Agent** — coverage confirmation + policy-language RAG (Azure AI Search).
  - **Extraction Agent** — reads uploaded docs/photos (Document Intelligence + Vision).
  - **Validation Agent** — NOAA weather + NHTSA recalls (real), ISO/NICB/CARFAX/DMV/KBB +
    telematics (sandbox adapters, production-final interfaces).
  - **Adjudication Agent** — GPT-4.1 reasons over the assembled facts → decision + confidence.
  - **Explanation Agent** — turns the decision into plain-English rationale.
- **Every agent writes its own `Decision_Rationale` row.** The Glass Box is the *thread* that
  runs through all of them, not a single log line.

### Stage 8 — Outcome + what's next

- **User sees:** the outcome — auto-approved in minutes / routed to an adjuster tier / "we need
  a couple more documents" — plus an explicit "here's what happens next" (claim #, document
  checklist, adjuster name within 24h, how to check status), per §2.5 #10.
- **Behind the glass:** auto-escalate triggers (§7) can override auto-approve (injury, distress,
  high estimate, fraud signals, etc.). The **Notification Agent** runs the §5.5 chase cadence on
  the customer's original channel (+ email backup) for anything still missing. **Save-and-resume**
  is always available via the claim #.

---

## 3. The Glass Box thread (why this whole design exists)

Every stage that makes a decision writes a `Decision_Rationale` row in plain English:

| Stage | Example audit entry (`agent`) |
|---|---|
| Gate checks | `intake_gate` — "Policy POL-2026-0847 active on DOL 2026-06-03 → PASS" |
| Claim creation | `intake` — "Claim 2026-CLM-04521 created, loss type Collision/Rear-ended" |
| Policy | `policy` — "Collision coverage confirmed, $500 deductible applies" |
| Validation | `validation` — "NOAA confirms no weather event; NHTSA no open recall" |
| Adjudication | `adjudication` — "Auto-approve, confidence 0.94, est. $3,200 < $25k threshold" |
| Explanation | `explanation` — customer-facing plain-English summary |

This is the product. Maps directly to Colorado SB21-169, the NAIC AI Model Bulletin, and NY
DFS Circular Letter No. 7 — "show, in plain language, why the AI decided what it decided."

---

## 4. Demo vs production — what's real today, what swaps later

| Stage | Demo (June build) | Production |
|---|---|---|
| Login / identity | Mock SSO sets a known policyholder | Microsoft Entra ID via SWA built-in auth |
| Context handoff | `Global.policyNumber` set from mock login | Authenticated user token → policy resolved |
| Policy lookup | Copilot Studio "knowledge" over 5-row Dataverse Policy table (generative) | Indexed API call to policy master (Azure SQL / core system), ~200M policies, millisecond seek |
| Coverage wording | Same 5 policies | Azure AI Search (vector + keyword) over policy PDFs |
| Claim + audit writes | `GlassBox-CreateClaim` / `GlassBox-LogDecision` → Dataverse | Same flows, same Dataverse working set |
| External validation | NOAA + NHTSA real; others sandbox adapters | Real ISO / NICB / CARFAX / DMV / KBB / telematics (procurement in parallel) |

The conversation the customer experiences is **identical** demo vs production — only the
backend each step talks to changes. (Full scale rationale: `data_architecture_reference.md`.)

---

## 5. What this means for what we build next

The flow reshapes the build order slightly — the **front door** now comes first:

1. **Conversation Start topic** (Stage 2) — receive `Global.policyNumber`, look up the policy,
   proactive greeting + 911 safety triage + the open question. *This replaces today's "type a
   policy number" Hello World scaffold.*
2. **`GlassBox-CreateClaim` + `GlassBox-LogDecision`** (Stage 6) — the service-layer flows, so
   a real Claim + audit row get written. *(Already queued — still the differentiator.)*
3. **`FNOL_Start` + the two polished child topics** (Stages 3–4) — Collision (Scenario 1) and
   Comp-Weather (Scenario 2), wired to the gate checks and the CreateClaim flow.
4. Downstream agents + frontend wiring (Stages 7–8) — already partly built in the React app's
   Theater Mode; swap mock timelines for live `Decision_Rationale` polling.

---

*Owners (from SESSION_BRIEF): Utkarsh — Copilot Studio topics · Suraj — Power Automate flows ·
Prasad — Policy Agent + RAG + Adjudication · Rahul — frontend wiring · Abhijit — Dataverse +
data · Sameet — end-to-end + integration + demo.*
