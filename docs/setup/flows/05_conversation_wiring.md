# Runbook 05 — Wire the Flows into the Conversation (live FNOL → real claim → audit row)

> **What this builds:** the FNOL intake conversation that, right after Sara's proactive greeting,
> asks the four demo-critical questions, then **calls `GlassBox-CreateClaim` and `GlassBox-LogDecision`**
> so a real `gbx_claim` row + its first `gbx_decisionrationale` audit row are written live during the chat.
> **Why it matters for the demo:** this is the moment the talking bot becomes a working claims system —
> the customer gets a real claim number on screen, and the Glass Box audit trail starts. It is the
> single most important "it actually works" beat of the demo.

This runbook assumes **Runbook 03** is done and verified:
- `GlassBox-GetPolicy` flow exists and returns `holderName / vehicle / status / state / policyGuid`.
- `GlassBox-CreateClaim` flow exists (inputs in Runbook 03 §3; returns `claimId` + `claimGuid`).
- `GlassBox-LogDecision` flow exists (inputs in Runbook 03 §4; returns `logId`).
- The **Greeting** topic already sets `Global.policyNumber` (test stand-in `POL-2026-0847`), calls
  `GlassBox-GetPolicy`, and branches Active vs Expired ("Sara speaks first").

> Environment: **GlassBox-Dev** (`https://orgc0207390.crm.dynamics.com`). Agent: **Glass Box Claims
> Assistant** ("Sara"). Build everything below **inside Copilot Studio** unless it says Power Automate.

---

## 0 — The shape of what we're building

We add ONE new topic — **`FNOL_Start`** — that runs after the greeting. Demo scope is the **two
scenarios only** (Collision "rear-ended", Comp-Weather "hail"), so the intake is deliberately minimal
but **real** — no faked values flow to Dataverse.

```
Greeting topic (DONE) ── Sara greets, "what would you like to report today?" ──► customer free-texts
                                                                                      │
                                                                                      ▼
FNOL_Start topic (THIS RUNBOOK)
  Trigger: phrases "rear-ended", "hail", "accident", "claim"… (the agent chooses)
    ↓
  Q1  Question: lossType         (Multiple-choice: Collision / Comp-Weather)      → Topic.lossType
    ↓
  Q2  Question: description       (User's entire response — free text narrative)   → Topic.description
    ↓
  Q3  Question: incidentState     (User's entire response — 2-letter state)        → Topic.incidentState
    ↓
  Q4  Question: injuryFlag        (Multiple-choice: Yes / No)                       → Topic.injuryFlag
    ↓
  Action: GlassBox-CreateClaim   (pass policyNumber + the 4 captured fields)       → claimId, claimGuid
    ↓
  Set Global.claimId  = Topic.claimId        (so other topics / the app can read it)
  Set Global.claimGuid = Topic.claimGuid
    ↓
  Action: GlassBox-LogDecision   (agentName=Intake, action="Claim created", explanation=FNOL summary)
    ↓
  Message: "You're all set — your claim number is {Global.claimId}. Here's what happens next…"
    ↓
  (Master Orchestration flow fires automatically off the new gbx_claim row — Stage 7)
```

Choice→integer mapping is done **inside the flows** (Runbook 03 §3/§4), so the topic passes plain
**text** ("Collision", "Intake", etc.) and never touches the choice integers. Keep it that way.

---

## 1 — Create the `FNOL_Start` topic

1. Copilot Studio → environment **GlassBox-Dev** → open agent **Glass Box Claims Assistant**.
2. **Topics** tab → **+ Add a topic** → **From blank**.
3. Top-left title → rename to **`FNOL_Start`**.
4. Click the **Trigger** node → set trigger type **Phrases** ("The agent chooses when to trigger"
   in newer UI). Add these trigger phrases (one per line):
   - `I was rear-ended`
   - `rear-ended`
   - `hail damage`
   - `hail`
   - `I had an accident`
   - `I want to file a claim`
   - `report a claim`
   - `start a claim`
5. **Save**. *(What you should see: a topic with one Trigger node and an empty canvas under it.)*

> ⚠️ The greeting topic ends with the open question; it does **not** call FNOL_Start directly. The
> customer's free-text answer ("I got rear-ended") matches these trigger phrases and the agent routes
> into FNOL_Start on its own. That is the intended hand-off.

---

## 2 — Q1: capture `lossType` (Question node, multiple choice)

1. Under the Trigger, click **+** → **Ask a question**.
2. **Question message** (the text Sara says):
   `Got it — I'm sorry that happened. Which of these best describes it?`
3. **Identify** → choose **Multiple choice options**.
4. Add exactly two options (the demo's two scenarios). Type each as an option label:
   - `Collision` → set the second line "user phrases" to `rear-ended, collision, hit, crash, accident`
   - `Comp-Weather` → user phrases `hail, weather, storm, flood, wind`
   > The **option label must be the literal string `Collision` / `Comp-Weather`** because the
   > CreateClaim flow maps those exact strings to the choice integers (Collision→10000,
   > Comp-Weather→10001). Do not rename them to "Collision (rear-end)" etc.
5. **Save response as** → rename the variable to **`lossType`** (Usage stays **Topic**).
   *(What you should see: `Topic.lossType` now exists.)*

---

## 3 — Q2: capture `description` (Question node, free text)

1. **+** under Q1 → **Ask a question**.
2. **Question message:** `Briefly, what happened? Just tell me in your own words.`
3. **Identify** → **User's entire response** (free text — this is the FNOL narrative U6).
4. **Save response as** → **`description`** (Topic).

---

## 4 — Q3: capture `incidentState` (Question node, free text)

1. **+** under Q2 → **Ask a question**.
2. **Question message:** `Which state did it happen in? (just the two-letter code, like CA or FL)`
3. **Identify** → **User's entire response**.
4. **Save response as** → **`incidentState`** (Topic).

> Demo note: for the two scripted policies use `CA` (Sarah Chen) or `FL` (Jennifer Rodriguez). The
> flow stores the raw string in `gbx_incident_state` (text), so any value is accepted; no validation.

---

## 5 — Q4: capture `injuryFlag` (Question node, multiple choice → boolean)

1. **+** under Q3 → **Ask a question**.
2. **Question message:** `Was anyone hurt — you, anyone in your vehicle, or anyone else?`
3. **Identify** → **Multiple choice options**. Add two options:
   - `Yes`
   - `No`
4. **Save response as** → **`injuryFlag`** (Topic). This stores the text `"Yes"` / `"No"`.

> The CreateClaim flow's `injuryFlag` input is a **Yes/No (boolean)** trigger input. Passing the text
> `"Yes"`/`"No"` from a multiple-choice answer coerces correctly. If your tenant's Question node returns
> an option **object** instead of text, in step 7 pass `Topic.injuryFlag.Value` (the label string)
> rather than `Topic.injuryFlag`. Check the chip preview when you wire it.

---

## 6 — (Empathy) optional injury soft-stop message

This keeps the demo honest to the spec (§7: injury = auto-escalate) without building the full triage:

1. **+** under Q4 → **Add a condition**.
2. Condition: `Topic.injuryFlag` **is equal to** `Yes`.
   - **TRUE branch** → **Send a message:**
     `I'm really sorry — your wellbeing comes first. ⚠️ If anyone needs medical help, please call 911. I'll flag this claim for one of our specialists to review personally.`
   - **All other conditions (No)** → leave empty (falls through).
3. After the condition, the flow **continues to step 7 for both branches** (we still create the claim —
   "Day-1 claim number, always," §1.5). Make sure the next node (CreateClaim) is placed **below and
   outside** the condition so both paths reach it.

*(What you should see: a small Yes-branch message, then the canvas re-joins to a single trunk.)*

---

## 7 — Call `GlassBox-CreateClaim` (writes the real claim row)

1. **+** under the condition (on the re-joined trunk) → **Add a tool** → pick **GlassBox-CreateClaim**.
   *(If it's not listed: open the Tools tab, confirm the flow is **Saved/Published**, then return.)*
2. Map the inputs (the node shows one field per trigger input you defined in Runbook 03 §3). Use these
   exact values — pick the dynamic-content chip where a variable is named:

   | CreateClaim input | Value to set |
   |---|---|
   | `policyNumber` | `Global.policyNumber` (chip — set by the greeting) |
   | `channel` | type the literal text `Web` |
   | `lossType` | `Topic.lossType` (chip) |
   | `subType` | type literal `Rear-ended` *(demo Collision)*; for the Comp-Weather demo type `Hail`. **Simplest robust option:** leave `subType` blank — it's optional in the flow. |
   | `incidentDate` | use the formula chip `System.Conversation.StartTime` (or leave blank — `gbx_incident_date` is nullable for the demo) |
   | `incidentState` | `Topic.incidentState` (chip) |
   | `location` | leave blank (optional) |
   | `description` | `Topic.description` (chip) |
   | `vin` | leave blank (optional) |
   | `injuryFlag` | `Topic.injuryFlag` (chip) — see §5 note if it must be `.Value` |

3. The tool node returns outputs **`claimId`** and **`claimGuid`**. Copilot Studio auto-creates topic
   variables `Topic.claimId` and `Topic.claimGuid`. Leave the names as-is.

*(What you should see: a tool node "GlassBox-CreateClaim" with the input map filled and two outputs.)*

---

## 8 — Promote claimId / claimGuid to Global vars

So later topics ("What's my claim status") and the app can read the claim without re-querying:

1. **+** under the CreateClaim node → **Variable management → Set a variable value**.
   - Variable: create `claimId`, **Usage = Global**. **To value:** `Topic.claimId` (chip).
2. **+** again → **Set a variable value**.
   - Variable: create `claimGuid`, **Usage = Global**. **To value:** `Topic.claimGuid` (chip).

*(What you should see: `Global.claimId` and `Global.claimGuid` now exist in the variable list.)*

---

## 9 — Call `GlassBox-LogDecision` (writes the first Glass Box audit row)

1. **+** under the Set-variable nodes → **Add a tool** → **GlassBox-LogDecision**.
2. Map the inputs (Runbook 03 §4 trigger inputs). Exact values:

   | LogDecision input | Value to set |
   |---|---|
   | `claimGuid` | `Global.claimGuid` (chip) — the GUID, **not** the CLM- number |
   | `agentName` | type literal `Intake` |
   | `action` | type literal `Claim created` |
   | `policyReference` | `Global.policyNumber` (chip) |
   | `dataPointsJson` | the formula below (one line — builds a small JSON of what we captured) |
   | `explanation` | the formula below (the plain-English Glass Box line) |
   | `adapterStatus` | type literal `NotApplicable` |

   **`dataPointsJson`** — click the input, switch to **Formula** (fx), paste:
   ```
   Concatenate(
     "{""lossType"":""", Topic.lossType,
     """,""incidentState"":""", Topic.incidentState,
     """,""injuryFlag"":""", Topic.injuryFlag,
     """,""channel"":""Web""}"
   )
   ```
   *(If Power Fx is unavailable in your topic, instead type a literal JSON and drop chips inline:*
   `{"lossType":"{Topic.lossType}","incidentState":"{Topic.incidentState}","injuryFlag":"{Topic.injuryFlag}","channel":"Web"}` *.)*

   **`explanation`** — switch to **Formula**, paste:
   ```
   Concatenate(
     "FNOL captured for policy ", Global.policyNumber,
     " — loss type ", Topic.lossType,
     " in ", Topic.incidentState,
     ". Injuries reported: ", Topic.injuryFlag,
     ". Claim ", Global.claimId,
     " created on the Web channel; policy active. Routed to downstream pipeline."
   )
   ```
   *(Literal-with-chips fallback:* `FNOL captured for policy {Global.policyNumber} — loss type {Topic.lossType} in {Topic.incidentState}. Injuries reported: {Topic.injuryFlag}. Claim {Global.claimId} created on the Web channel; policy active. Routed to downstream pipeline.` *)*

3. The node returns `logId` → `Topic.logId` (leave as-is; we don't surface it to the customer).

*(What you should see: a tool node "GlassBox-LogDecision" with `claimGuid` bound to the real GUID.)*

---

## 10 — Confirmation message to the customer (Stage 6 → Stage 8)

1. **+** under LogDecision → **Send a message**. Paste (chips for `Global.claimId`):
   ```
   You're all set — your claim number is {Global.claimId}. ✅

   Here's what happens next:
   • Our agents are already reviewing your claim — coverage, photos, and a fraud/weather check.
   • You'll get a document checklist within the hour, and your adjuster's name within 24 hours.
   • You can check status anytime here, or just say "What's my claim status".

   Everything I do on your claim is logged in plain English so you can always see exactly why a
   decision was made.
   ```
2. **+** under the message → **Topic management → End current topic** (returns control to the agent so
   generative answering handles any follow-up).
3. **Save** the topic.

*(What you should see: the canvas ends with the confirmation message → End current topic.)*

---

## 11 — Note: Master Orchestration fires automatically (no wiring here)

The new `gbx_claim` row is the trigger for the downstream pipeline. **You do not call orchestration
from the conversation.** A separate Power Automate flow (built elsewhere) uses the Dataverse trigger
**"When a row is added — table: Claims (`gbx_claim`)"** and fans out to Policy → Validation →
Adjudication → Explanation, each writing its own `gbx_decisionrationale` row. From the conversation's
point of view, the job is done once CreateClaim + LogDecision return. Call this out in the demo
narration ("…and behind the glass, the new claim just kicked off four more agents — each logging its
own plain-English entry").

---

## 12 — TEST the full conversation (test pane)

1. Open the **test pane** (flask icon) → **Refresh/Reset** the conversation.
2. The greeting fires: *"Hi Sarah Chen 👋 … 2022 Honda Civic … active … what would you like to report
   today?"* (this proves `Global.policyNumber = POL-2026-0847` is seeded).
3. Type **`I was rear-ended`**.
   - **Expect:** FNOL_Start triggers → "Which of these best describes it?" with Collision / Comp-Weather.
4. Pick **Collision** → narrative prompt → type `A truck rear-ended me at a red light`.
5. State prompt → type `CA`.
6. Injury prompt → pick **No**.
7. **Expect:** *"You're all set — your claim number is **CLM-2026-00xx**…"* (a **real** number).
8. **Verify the data landed** (make.powerapps.com → GlassBox-Dev):
   - **Tables → Claims → Data:** new row, `gbx_loss_type = Collision`, `gbx_incident_state = CA`,
     `gbx_injury_flag = No`, `gbx_status = New`, Policy linked to **Sarah Chen**.
   - **Tables → Decision Rationales → Data:** one new row, `gbx_agent_name = Intake`,
     `gbx_action = Claim created`, `gbx_human_readable_explanation` = the FNOL sentence, linked to the
     claim you just created.
9. **Run the second scenario:** reset → "Hi" → `hail damage` → pick **Comp-Weather** →
   `Golf-ball hail dented my hood and roof` → `FL` (this is Jennifer Rodriguez's state) → injury **No**.
   *(To greet as Jennifer, temporarily set the greeting's `Global.policyNumber` to `POL-2026-0592` and
   re-test; otherwise the greeting still says Sarah but the claim still writes against POL-2026-0847.)*
   **Expect:** a second real claim + a second Intake audit row, `gbx_loss_type = Comp-Weather`.

**Gate:** both scenarios produce a real claim number on screen **and** a matching Claims row + Intake
Decision Rationale row in Dataverse. The live conversation now produces a real claim + audit trail.

---

## 13 — PUBLISH the agent

1. Top-right → **Publish** → confirm. Wait for "Publishing…" → **Published** (≈30–60s).
2. **What publishing does:** makes the latest topics (including FNOL_Start) live on every channel,
   and is required before the web-chat channel reflects your changes. Publishing is **free**.

*(What you should see: a green "Published" toast with a timestamp.)*

---

## 14 — Enable the "Custom website" channel + copy the embed URL

1. Left nav → **Channels** (or **Settings → Channels** depending on tenant).
2. Tile **Custom website** → open it.
3. Copy the **iframe** snippet's **`src` URL**. It looks like:
   ```
   https://copilotstudio.microsoft.com/environments/<env-id>/bots/<bot-id>/webchat?...
   ```
   Copy the **URL inside `src="…"`** only (not the whole `<iframe>` tag).

*(What you should see: a ready-to-copy iframe code block and a live preview of Sara in the panel.)*

---

## 15 — Wire the URL into the frontend (`frontend/.env`)

The React app is **already wired** — `src/config.js` reads `VITE_COPILOT_EMBED_URL` and
`src/customer/Chat.jsx` renders it in the phone frame at route `/customer/chat`. You only set the env var.

1. In the repo, open (or create) **`frontend/.env`** and add:
   ```
   VITE_COPILOT_EMBED_URL=<paste the src URL from step 14>
   ```
   *(A template lives at `frontend/.env.example` — copy it to `.env` and fill the value.)*
2. **Restart the dev server** (Vite reads env only at startup):
   ```
   cd frontend
   npm run dev
   ```
3. Browse to **http://localhost:5173/customer/chat**.
   **Expect:** Sara loads **inside the phone frame** and greets you (the "🔌 Sara isn't connected yet"
   fallback is gone). Type `I was rear-ended` and walk the same flow — a real claim number appears.

> `.env` is gitignored — never commit the URL. Each teammate pastes their own from their published agent.

---

## 16 — Passing the logged-in policyNumber (demo vs production)

- **Demo (today):** `Global.policyNumber` is hardcoded to `POL-2026-0847` in the **Greeting** topic's
  first "Set a variable value" node (Runbook 03 §2 step 2). That's why Sara greets Sarah Chen in the
  iframe with no login. To demo Jennifer, change that one node to `POL-2026-0592`, **Publish**, refresh.
- **Production:** the app passes the authenticated user's policy number into the conversation instead of
  hardcoding it. Two supported mechanisms:
  1. **Embed variable** — when the app mounts the web chat, set the global variable on the
     conversation-start payload. With the Microsoft Web Chat / Direct Line embed you send an
     `event` activity `{ name: "startConversation", value: { policyNumber: "<from Entra/SSO>" } }`,
     and the Greeting topic reads it instead of the hardcoded value (delete the test "Set a variable"
     node, keep `Global.policyNumber` populated by the inbound event).
  2. **Authenticated agent** — turn on **Authentication = Microsoft Entra ID** in agent Settings;
     `System.User.*` then comes from the Entra token and you resolve the policy number from the signed-in
     user. This is the cleaner production path (Sara holds no broad data rights; she only sees the one
     identity the token grants).
- Either way the **conversation is identical** — only the source of `Global.policyNumber` changes
  (decision in `end_to_end_flow.md` §4 and ADR 2026-06-02).

---

## Gotchas

- **"Flow" is now "Workflows."** When you add a tool, the tile is **Workflows**, not "Flow". The
  three flows here were built that way in Runbook 03 — you only **reference** them as tools now.
- **The tool isn't in the picker** → the flow isn't **Saved/Published**. Save (and Publish if prompted)
  the flow in Power Automate, then reopen the Tools list in the topic.
- **Pass text, not integers.** The topic passes `"Collision"` / `"Intake"` / `"NotApplicable"` as plain
  text; the flows convert to choice integers internally. Never type `10000` in a topic.
- **Choice-option value vs object.** A multiple-choice answer may be stored as an option **object**.
  If CreateClaim/LogDecision receives a blank for `lossType` or `injuryFlag`, bind `Topic.lossType.Value`
  / `Topic.injuryFlag.Value` (the label string) instead of the bare variable. Verify via the chip
  preview before saving.
- **`claimGuid` vs `claimId` to LogDecision.** LogDecision's `claimGuid` input must be the **GUID**
  (`Global.claimGuid`), which becomes the `gbx_ClaimId@odata.bind` lookup. Passing the human `CLM-…`
  number there will not link the audit row and the row will save orphaned.
- **Both injury branches must reach CreateClaim.** "Day-1 claim number, always" — the Yes branch only
  adds a soft message; it must **not** end the topic before CreateClaim. Keep CreateClaim on the
  re-joined trunk below the condition.
- **Publish before testing the iframe.** The test pane uses the unpublished draft; the **Custom website**
  iframe uses the **published** version. After any topic edit, Publish again or the iframe lags.
- **Restart Vite after editing `.env`.** Vite only reads env vars at server start; a hot reload won't
  pick up a new `VITE_COPILOT_EMBED_URL`.
- **Don't set autonumbers.** `gbx_claim_id` and `gbx_log_id` are auto-generated — never pass them.
- **Greeting must run first.** FNOL_Start depends on `Global.policyNumber` already being set by the
  Greeting topic. If you test FNOL_Start in isolation, `policyNumber` is empty and CreateClaim's policy
  lookup returns nothing → no row. Always start the conversation from the greeting.

---

## Gotchas added from the 2026-06-11 build (hit live, fixes verified)

- **New trigger UI = description, not phrases.** With generative orchestration the trigger is
  "The agent chooses" + a description box. Write the description rich with example utterances
  ("I was rear-ended", "hail damage", "start a claim"…). It also slot-fills: a sentence like
  "I was rear-ended by a sleepy driver" can answer lossType *and* description in one go.
- **Choice variables (EmbeddedOptionSet) can't go into String flow inputs raw.** Wrap them:
  `Text(Topic.lossType)`, `Text(Topic.injuryFlag)` — both as action inputs and inside
  `Concatenate(...)` formulas. The enum-literal syntax `'FNOL_Start.lossType'.Collision` does
  not work in this tenant.
- **Power Fx variable names are case-sensitive.** `Global.claimId` ≠ `Global.claimID`. Always
  pick from the autocomplete dropdown instead of typing the name.
- **Message placeholders are inserted, not typed.** Typing `{claimId}` literally throws
  *"Identifier not recognized"* — use **+ Add → Variable** (or type `{` and pick the chip).
- **`gbx_incident_state` is max-length 4.** A customer typing "California" hard-crashes the
  CreateClaim Add-row (BadGateway in the topic). Demo fix on the flow-input side:
  `Upper(Left(Topic.incidentState, 2))`. Production fix: proper state-code validation.
- **Don't hard-redirect the Greeting into the intake topic.** A "Go to topic" at the end of the
  greeting makes FNOL fire before the customer answered ("Got it — I'm sorry that happened"
  in reply to "hi"), and breaks with `redirectToDisabledTopic` if the target is disabled.
  End the greeting after the open question; the reply triggers FNOL_Start by itself.
- **Disabled topics with stale flow bindings block Publish** (`BindingKeyNotFoundError`).
  Delete dead topics (e.g. the old `FNOL_Intake`) rather than leaving them toggled off.
- **No "Custom website" channel? Check Authentication.** Settings → Security → Authentication
  → **No authentication** → Save → **Publish again**. Otherwise only Teams/M365/SharePoint
  channels exist and the iframe shows a sign-in wall. The embed URL is the **`/webchat`** one
  (Channels → Web app → iframe `src`); the `/canvas` URL is the standalone demo site.
- **flowActionBadGateway in the test pane = the flow failed internally.** The real error is in
  Power Automate → the flow → 28-day run history → the red card. Check the trigger card's
  outputs first to see what the topic actually sent.
