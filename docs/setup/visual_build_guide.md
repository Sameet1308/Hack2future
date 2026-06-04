# Glass Box AI — Visual Build Guide (Service Layer + Greeting)

> **Internal team guide.** Screenshot-by-screenshot walkthrough of building the front door
> (proactive greeting) + the service-layer flows (GetPolicy, CreateClaim, LogDecision) in the
> **current** Copilot Studio / Power Automate UI. Pairs with the text runbook
> [`03_flows_and_greeting_runbook.md`](03_flows_and_greeting_runbook.md) (exact field names + values).
>
> **How to use:** follow top to bottom. Each step has the click + a screenshot + "what you should
> see." Built live on 2026-06-04 against **GlassBox-Dev**.
>
> **Adding screenshots:** drop image files into [`images/`](images/) using the filename noted under
> each step (e.g. `03-01-add-tool-dialog.png`), and the image will render inline here.

---

## Conventions
- **Environment:** GlassBox-Dev (`https://orgc0207390.crm.dynamics.com`) — always check the top-right
  environment picker before building.
- **Agent:** Glass Box Claims Assistant ("Sara").
- ⚠️ = a gotcha worth flagging to the team.

---

## Section 0 — Environment is alive (do once per session)
Confirmed via scripts (no portal needed):
- `az account show` → subscription `Sandbox AI DS - 1003787` active.
- `python scripts/verify_tables.py` → all 9 tables present (Policy + 8 gbx_ tables).
- `python scripts/peek_schema.py` → exact column logical names + choice values (in the runbook).

If these pass, the backend is healthy and you can build. If the sandbox expired, re-provision first
(`docs/setup/BUILD_JOURNAL.md`) and re-run `scripts/create_dataverse_tables.py`.

---

## Section 1 — GlassBox-GetPolicy (the lookup flow)

**What it does:** takes a policy number → returns holder name, vehicle, status, state, and the policy
row GUID. The greeting and CreateClaim both depend on it.

### Step 1.1 — Start a new tool from the agent
- Open the agent → top tabs **Tools** → **+ Add a tool**.
- In the **Add tool** dialog, the modern UI no longer says "Flow" — the equivalent is the
  **"Add new — Workflows"** tile (blue branching icon, top row).

⚠️ **Naming change:** "Power Automate Flow" is now surfaced as **Workflows** in the Add-tool dialog.
Don't go looking for a "Flow" tile — there isn't one. The other tiles are *not* what we want:
Computer use = UI automation · Prompt = an AI-prompt tool · MCP = external MCP server · the connector
tiles (Outlook, Teams, SharePoint…) = single connector actions, not a full flow.

`images/03-01-add-tool-dialog.png`

![Add tool dialog](images/03-01-add-tool-dialog.png)

### Step 1.2 — build it (✅ DONE 2026-06-04)
Full click-by-click steps + the 5 output expressions are in the Word guide
[`GlassBox-GetPolicy-Build-Guide.docx`](GlassBox-GetPolicy-Build-Guide.docx) and the text runbook
[`03_flows_and_greeting_runbook.md`](03_flows_and_greeting_runbook.md) Section 1. Result: input
`policyNumber` → Dataverse List rows → returns `holderName / vehicle / status / state / policyGuid`.
Tested → Sarah Chen / 2022 Honda Civic / Active.

**Key gotchas (the things that bite):**
- "Flow" is now **Workflows** in the Add-tool dialog.
- The in-product Copilot **can't** add the Dataverse action — add **List rows** manually.
- Filter = `crcce_policynumber eq '`⟦policyNumber chip⟧`'` (word `eq`, chip between single-quotes).
- `status` text comes from `crcce_policystatus@OData.Community.Display.V1.FormattedValue`, **not** a
  `…name` column — otherwise it returns blank.

---

## Section 2 — Proactive greeting ("Sara speaks first") (✅ DONE 2026-06-04)

**What it does:** the moment the user greets, Sara looks up the policy from `Global.policyNumber`,
greets by name + vehicle with a 911 safety line, and branches Active vs inactive. Built by upgrading
the existing **Greeting** custom topic (Topics tab → Greeting).

**The topic structure we built:**
```
Trigger ("the agent chooses": Hi/Hello/…)
   ↓
Set variable value   →  Global.policyNumber = "POL-2026-0847"   (TEST stand-in; app sets this in prod)
   ↓                     (Usage = Global so the app can seed it)
Action: GlassBox-GetPolicy   (input policyNumber = Global.policyNumber → outputs holderName/vehicle/status/…)
   ↓
Condition: status  is not equal to  "Active"
   ├─ TRUE  → Message (denial): "Hi {holderName} — I'm looking at your {vehicle}, but your policy
   │          shows as {status}. I'm not able to start a new claim on an inactive policy, but I'll
   │          connect you with a teammate…"  →  End all topics   (stops before the greeting)
   └─ All other conditions (status = Active) → (falls through) ↓
Message (greeting): "Hi {holderName} 👋 — I can see you're covered on your {vehicle}, and your policy
   is {status}. I hope you're okay. ⚠️ If you or anyone else is hurt, please call 911 first.
   Whenever you're ready — what would you like to report today?"
```

**Steps (one-time):**
1. Topics → open **Greeting** → it has Trigger → Message ("Hello, how can I help…") → End.
2. **+ between Trigger and Message → Variable management → Set a variable value.** Create variable
   `policyNumber`, set **Usage = Global**, **To value = `POL-2026-0847`** (test stand-in).
3. **+ → Add a tool → GlassBox-GetPolicy.** Set input `policyNumber = Global.policyNumber`. It
   auto-creates the 5 output variables (holderName, vehicle, status, state, policyGuid).
4. **+ → Add a condition.** Set `status  is not equal to  Active`.
5. In the **TRUE** (left) branch: **Send a message** (the denial text, with `holderName/vehicle/status`
   chips) → then **Topic management → End all topics**.
6. **Rewrite the existing Message** (below the condition) into the warm greeting (chips for
   `holderName/vehicle/status`). It only runs when status = Active (the not-Active path ended above).
7. **Save.** Test (flask icon) → type **Hi**.

**Tested live (both demo scenarios):**
- `POL-2026-0847` → "Hi Sarah Chen 👋 … 2022 Honda Civic … Active … call 911 first … what would you
  like to report today?"
- `POL-2026-0998` → "Hi Amanda Williams — … 2019 Chevrolet Malibu … Expired … connect you with a
  teammate" (no greeting leak).

**Cost note:** this whole path is **$0** — a deterministic topic + a Dataverse lookup never call the
GPT model. Publishing is also free. (Screenshots: drop into `images/` as `04-0x-*.png` if desired.)

---

## Section 3 — GlassBox-CreateClaim (write the claim)
_Next session._ Steps in [`03_flows_and_greeting_runbook.md`](03_flows_and_greeting_runbook.md) Section 3.

---

## Section 4 — GlassBox-LogDecision (write the audit row)
_Next session._ Steps in [`03_flows_and_greeting_runbook.md`](03_flows_and_greeting_runbook.md) Section 4.
