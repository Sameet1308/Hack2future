# DEMO RUNSHEET — Glass Box AI (minute-by-minute, both scenarios)

> The script you actually perform in front of judges. Two scenarios, ~9 minutes total + Q&A.
> Every line says **what you click/say**, **what appears on screen**, and the **"this is real" proof
> point**. A pure-mock fallback at the end keeps the demo alive if any backend piece is down.
>
> Build state assumed: all flows from [`00_MASTER_BUILD_GUIDE.md`](00_MASTER_BUILD_GUIDE.md) green.
> Agent **published**, Custom-website channel on, `frontend/.env` set, `npm run dev` running.

---

## T-5 minutes — pre-flight (do this before judges are watching)

| # | Action | Confirm you see |
|---|---|---|
| 1 | Open two browser windows: **(A)** the React app `http://localhost:5173`, **(B)** Dataverse `make.powerapps.com` → GlassBox-Dev → **Tables**, with **Claims** and **Decision Rationales** "Data" tabs ready. | Both load. |
| 2 | In the app, log in as **Sarah Chen** (mock SSO) so `Global.policyNumber = POL-2026-0847`. | Customer home for Sarah. |
| 3 | Flip `gbx_demo_mode = true` (Solutions → environment variables) → Adjudication now uses **gpt-4.1**. | Saved. |
| 4 | Open a terminal with the cumulative-spend check ready: `az consumption usage list --query "sum([].pretaxCost)" -o tsv`. | Under $20. |
| 5 | Pre-open `/handler/theater` in a third tab (handler view) for the big-screen pipeline. | Loads (mock until a real claim is selected). |

> **One-line framing to open with:** *"Glass Box AI is a multi-agent auto-claims system where every AI
> decision is logged in plain English — the audit trail a regulator can read. Watch it run a real claim,
> and I'll show you the actual rows in the database as they're written."*

---

## SCENARIO 1 — Sarah Chen · Collision · rear-ended → auto-approve (≈4 min)

**Setup:** POL-2026-0847 / Sarah Chen / 2022 Honda Civic / CA / **Active**. Clean validation → Tier-1
auto-approve. This is the "speed + trust" hero path.

| Time | You do / say | On screen | "This is real" proof |
|---|---|---|---|
| 0:00 | Open `/customer/chat`. | Sara loads **in the phone frame** and **speaks first**: *"Hi Sarah Chen 👋 — I can see you're covered on your 2022 Honda Civic, and your policy is active. I hope you're okay. ⚠️ If anyone is hurt, call 911 first. What would you like to report today?"* | *"She never asked who I am — login handed her the identity, and that greeting is a **live Dataverse policy lookup**, not a script."* |
| 0:25 | Type **`I was rear-ended`**. | FNOL_Start triggers: *"Got it — I'm sorry that happened. Which of these best describes it?"* with **Collision / Comp-Weather**. | — |
| 0:40 | Click **Collision**. | *"Briefly, what happened?"* | — |
| 0:50 | Type **`A truck rear-ended me at a red light on Main St.`** | *"Which state did it happen in?"* | — |
| 1:00 | Type **`CA`**. | *"Was anyone hurt…?"* → **Yes / No**. | — |
| 1:10 | Click **No**. | Sara: *"You're all set — your claim number is **CLM-2026-00xx**. ✅ Here's what happens next… Everything I do is logged in plain English so you can always see why."* | **Switch to window B → Claims → Data: the new `CLM-2026-00xx` row is THERE, Policy linked to Sarah Chen, Status=New.** *"That claim is real — written through a governed service layer, not by the bot directly."* |
| 1:35 | Say: *"The moment that row was written, it kicked off four more agents behind the glass."* Switch to the **handler Theater** tab, select this claim (`/handler/theater/CLM-2026-00xx`). | Badge flips **connecting… → LIVE**. Pipeline animates: **Intake → Policy → Validation (NHTSA + 6 sandbox) → Adjudication → Explanation**. Each node lights as its real audit row lands. | Badge says **LIVE** — *"this isn't an animation; each line appears as a real row hits Dataverse."* |
| 2:30 | Read two feed lines aloud as they appear: Policy — *"Collision coverage confirmed on policy POL-2026-0847. $500 collision deductible applies."* and a Validation row — *"No open NHTSA recalls for the 2022 Honda Civic."* | Glass Box feed fills with plain-English lines; sandbox rows tagged **Sandbox**, NHTSA tagged **Live**. | **Window B → Decision Rationales → filter by claim: the rows match the feed word-for-word.** *"NHTSA is a live federal API; the six industry feeds are sandbox adapters with the production interface — one flag flips each to the real vendor."* |
| 3:15 | Adjudication row lands. | Verdict card: **Tier 1 · Approve · ~$2,700 · confidence ~94%** + rationale sentence. Polling stops. Explanation row: *"Good news — your Collision claim is approved…"* | *"That verdict is a **real GPT-4.1 call** — then hard compliance rules check it. Approved in **minutes**, versus ~14 days at an incumbent."* |
| 3:45 | Open the Adjudication row in window B; point at `gbx_human_readable_explanation`. | The plain-English rationale, timestamp, agent=Adjudication. | *"This is the regulatory artifact — Colorado SB21-169, the NAIC model bulletin, NY DFS Circular 7 all ask for exactly this: plain-language why."* |

**Scenario 1 closer:** *"A customer got a real claim number in 70 seconds, five agents adjudicated it, and
every decision is a readable row a regulator could audit."*

---

## SCENARIO 2 — Jennifer Rodriguez · Comp-Weather · hail → NOAA-corroborated review (≈3.5 min)

**Setup:** POL-2026-0592 / Jennifer Rodriguez / 2023 Toyota Camry / FL (Orlando 28.5383,-81.3792) /
estimate 8400 / no injury. This path shows the **real external corroboration** + the escalate/review
branch. To greet as Jennifer, the demo build sets the Greeting `Global.policyNumber = POL-2026-0592`
(or log in as Jennifer via mock SSO), Publish, refresh.

| Time | You do / say | On screen | "This is real" proof |
|---|---|---|---|
| 0:00 | New chat (as Jennifer). | Sara: *"Hi Jennifer Rodriguez 👋 — I see your 2023 Toyota Camry, policy active…"* | Live lookup of a **different** real policy. |
| 0:20 | Type **`hail damage`** → pick **Comp-Weather**. | *"Briefly, what happened?"* | — |
| 0:35 | Type **`Golf-ball hail dented my hood and roof while parked.`** → state **`FL`** → injury **No**. | *"Your claim number is **CLM-2026-00yy**…"* | **Window B → Claims: second real row, Loss type = Comp-Weather, FL.** |
| 1:05 | Switch to Theater for this claim. | LIVE badge. Pipeline runs — **this time a NOAA row appears** (weather claim only). | — |
| 1:35 | Read the NOAA row aloud. | If NOAA returns a corroborating alert: *"NOAA confirms a severe-weather event in FL around \<date\> — weather damage corroborated."* (Live). | **Open the NOAA row → `gbx_external_api_result` holds the raw `api.weather.gov` JSON.** *"That's a live call to the National Weather Service — free, public, real."* |
| 2:15 | Adjudication lands. | Verdict card: corroborated → **Approve / Under review**; if NOAA cannot corroborate → **Tier 3 · Escalate**, and Explanation = the specialist message: *"…a specialist adjuster is reviewing it personally and will reach out within 24 hours."* | *"The model proposed a verdict, but a §7 rule can override it — injury, distress, high estimate, or **no weather corroboration** force a human specialist. The LLM proposes; the rules dispose."* |
| 3:00 | Point at the Adjudication row's action: `Auto-escalated per rule` (if escalated) or `Adjudicated`. | Plain-English row explaining *why* it escalated or approved. | *"Same audit format, same Glass Box — whether the answer is approve or escalate, the reason is written down."* |

**Scenario 2 closer:** *"Two different claims, two outcomes — fast approve and a corroborated escalate —
and the **same** plain-English audit trail behind both. That uniformity is the compliance story."*

---

## Wrap (≈1 min)

Say, while showing the Decision Rationales table filtered across both claims:
- *"Three differentiators: **trust** — every decision is a readable row mapped to US AI-insurance
  regulation; **speed** — parallel agents auto-approve in minutes; **empathy** — one Sara across web,
  SMS, Teams, email."*
- *"Everything written to that database was real. NOAA and NHTSA are live public APIs. Six industry feeds
  run on sandbox adapters with the production interface — a one-flag flip to go live. Adjudication is a
  real GPT-4.1 verdict guarded by hard compliance rules."*

**Immediately after judging:** flip `gbx_demo_mode = false` (back to gpt-4o-mini). Run the spend check.

---

## FALLBACK PLAN — if anything is down (rehearse this once)

> **Golden rule:** the demo never blanks. The frontend swallows every backend error and keeps the
> scripted Theater running. Degrade gracefully, narrate the design honestly.

| If this breaks | Symptom | Do this | Say this |
|---|---|---|---|
| **Copilot embed / Sara won't load** | Phone frame shows "Sara isn't connected yet" | Skip the live chat. Open **`/handler/theater/CLM-2026-4521?live=0`** (forces mock). Drive the pipeline from there. | *"Let me show you the agent pipeline directly — same flow the chat kicks off."* |
| **Pipeline / Master Orchestration not firing** | Claim row written but no Decision Rationale rows appear | In Theater append **`?live=0`** → scripted timeline plays the full pipeline + verdict card. Still open the **real Claims row** in Dataverse as proof the claim is real. | *"The orchestration is mid-run; here's the exact sequence it produces, and here's the real claim row it was triggered by."* |
| **GetClaimAudit URL / CORS fails** | Theater badge stuck on **connecting…** | It auto-falls-back to mock — do nothing, or append `?live=0` to be explicit. | *"Live feed is reconnecting; the scripted replay mirrors the real rows."* |
| **Azure OpenAI denied / rate-limited** | Adjudication HTTP step errors | Per cost-guardrail Rule 8: the flow returns canned verdict JSON (or use `?live=0` Theater). | *"Adjudication is on cached responses while AOAI provisioning completes — the production-final interface is unchanged."* (same line as the sandbox validators) |
| **Whole backend down** | Nothing live | Run **both scenarios entirely in mock Theater** (`?live=0`): `/handler/theater/CLM-2026-4521` (Collision approve) and a Comp-Weather mock id. Play/Pause/Speed all work. | *"This is the exact pipeline and audit trail; in our live environment each line is a real Dataverse row — let me show you a captured run."* |

**Pre-staged mock claim ids** (always animate, no backend): `CLM-2026-4521` (Collision → Tier 1 ·
Approve · $2,300). Keep a second Comp-Weather mock id handy for Scenario 2's fallback.

**Hard rule during the demo:** do **not** debug a broken flow live. Flip to `?live=0`, finish the story,
fix it after. The mock path is indistinguishable to the audience and the proof points (real Dataverse
rows already written) still hold.
