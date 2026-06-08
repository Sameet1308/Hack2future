# Flow — GlassBox-LogDecision (service-layer WRITE: the Glass Box audit trail)

**What this flow does:** Writes ONE plain-English `gbx_decisionrationale` row, linked to a claim, every time any agent in the pipeline takes a step.
**Why it matters for the demo:** This is THE differentiator. Every Intake / Policy / Validation / Adjudication / etc. step calls this *same* flow, so the audit trail is uniform, regulator-readable, and provable — the "Glass Box" that no incumbent insurer shows the customer.

> **Reused by every agent.** Do not build a per-agent logger. All ten agents (Intake, Extraction, Policy, Validation, Adjudication, Explanation, Notification, Adjuster, AssignmentEngine, VendorEngine) call THIS one flow with a different `agentName` string. Identical audit format across the whole pipeline is the whole point — one chokepoint, one schema, one plain-English line per step (ADR 2026-06-02: service-layer writes, agent never writes Dataverse directly).

Environment: **GlassBox-Dev** (`https://orgc0207390.crm.dynamics.com`).
Agent: **Glass Box Claims Assistant** (Sara). Tables already built + verified.
Builds on the established pattern in `docs/setup/03_flows_and_greeting_runbook.md` (GetPolicy + CreateClaim already done).

---

## Schema quick-reference (use these EXACT names)

**Decision Rationale** — table `gbx_decisionrationale` (entity set `gbx_decisionrationales`):

| Purpose | Logical name | Notes |
|---|---|---|
| Log # (primary, AUTONUMBER) | `gbx_log_id` | do **NOT** set — auto `LOG-{yyyy}-{0000001}` |
| Claim lookup | `gbx_claimid` | bind `gbx_ClaimId@odata.bind = /gbx_claims(<guid>)` |
| Agent name (choice) | `gbx_agent_name` | set INTEGER (Intake=10000 … VendorEngine=10009) |
| Sub agent (text 50) | `gbx_sub_agent` | optional — not used by this flow |
| Action (text 255) | `gbx_action` | short verb phrase |
| Policy reference (text 255) | `gbx_policy_reference` | clause / rule cited |
| Data points JSON (memo) | `gbx_data_points` | structured evidence |
| Confidence contribution (decimal) | `gbx_confidence_contribution` | optional |
| External API result JSON (memo) | `gbx_external_api_result` | not used by this flow |
| Adapter status (choice) | `gbx_adapter_status` | set INTEGER (Live=10000, Sandbox=10001, NotApplicable=10002) |
| Flag raised (bool) | `gbx_flag_raised` | optional |
| Flag severity (choice) | `gbx_flag_severity` | set INTEGER (Low=10000, Medium=10001, High=10002) |
| Human-readable explanation (memo) | `gbx_human_readable_explanation` | **the plain-English Glass Box line** |
| Latency (ms) (int) | `gbx_latency_ms` | optional |
| Timestamp | `gbx_timestamp` | set to `utcNow()` |

---

## Inputs (on the agent trigger)

Add these on the **"When an agent calls the flow"** trigger, in this order. Type is in the second column.

| # | Input name | Type | Required? | Default | Notes |
|---|---|---|---|---|---|
| 1 | `claimGuid` | Text | Required | — | the claim row GUID (from CreateClaim's `claimGuid` output) |
| 2 | `agentName` | Text | Required | — | "Intake" / "Policy" / "Adjudication" / … (one of the 10) |
| 3 | `action` | Text | Required | — | short verb phrase, e.g. "Claim created" |
| 4 | `policyReference` | Text | Optional | (empty) | clause/rule cited, e.g. "Collision §IV.A" |
| 5 | `dataPointsJson` | Text | Optional | (empty) | JSON string of structured evidence |
| 6 | `explanation` | Text | Required | — | the plain-English audit sentence |
| 7 | `adapterStatus` | Text | Optional | `NotApplicable` | "Live" / "Sandbox" / "NotApplicable" |
| 8 | `flagRaised` | Yes/No | Optional | No | true if this step raised a flag |
| 9 | `flagSeverity` | Text | Optional | (empty) | "Low" / "Medium" / "High" (only meaningful if flagRaised) |
| 10 | `latencyMs` | Number | Optional | 0 | step latency in milliseconds |
| 11 | `confidenceContribution` | Number | Optional | 0 | this step's contribution to the confidence score |

> **Marking inputs optional:** on each input row in the trigger, click the **…** (or the dropdown arrow on the input) → make sure required ones stay required; for optional ones the agent may omit them. If your build of the trigger does not expose a per-input "optional" toggle, leave them all present — the expressions below tolerate empty/blank values.

---

## Step-by-step build

### 1. Create the flow
1. Copilot Studio → environment **GlassBox-Dev** → open agent **Glass Box Claims Assistant**.
2. Top tabs → **Tools** → **+ Add a tool** → **New tool** → **Workflows**.
   *(There is no "Flow" tile anymore — it is under **Workflows**.)* This scaffolds a **"When an agent calls the flow"** trigger + a **"Respond to the agent"** action.
3. Rename the flow (top-left title) → **GlassBox-LogDecision**.

**You should see:** a two-node flow — trigger at top, "Respond to the agent" at bottom.

### 2. Add the 11 trigger inputs
4. On the **"When an agent calls the flow"** trigger → **+ Add an input** → pick the type from the table above → name it exactly as listed. Repeat for all 11.
   - For `flagRaised` choose **Yes/No**.
   - For `latencyMs` and `confidenceContribution` choose **Number**.
   - All others are **Text**.
5. For `adapterStatus`, after adding it, set its **default value** to `NotApplicable` (type it in the default field). For `flagRaised` set default **No**; for `latencyMs` and `confidenceContribution` set default `0`.

**You should see:** 11 named inputs on the trigger.

### 3. Compose `agentInt` (map the agent-name string → choice integer)
6. Between the trigger and the response, click **+** → **Add an action** → search **Compose** (Data Operation) → add it. Rename it **agentInt**.
7. In the **Inputs** box of `agentInt`, switch to the expression editor (fx) and paste **exactly**:

```
if(equals(triggerBody()?['agentName'],'Intake'),10000,if(equals(triggerBody()?['agentName'],'Extraction'),10001,if(equals(triggerBody()?['agentName'],'Policy'),10002,if(equals(triggerBody()?['agentName'],'Validation'),10003,if(equals(triggerBody()?['agentName'],'Adjudication'),10004,if(equals(triggerBody()?['agentName'],'Explanation'),10005,if(equals(triggerBody()?['agentName'],'Notification'),10006,if(equals(triggerBody()?['agentName'],'Adjuster'),10007,if(equals(triggerBody()?['agentName'],'AssignmentEngine'),10008,if(equals(triggerBody()?['agentName'],'VendorEngine'),10009,10000))))))))))
```

> Mapping: Intake→10000, Extraction→10001, Policy→10002, Validation→10003, Adjudication→10004, Explanation→10005, Notification→10006, Adjuster→10007, AssignmentEngine→10008, VendorEngine→10009. The final fallback `10000` (Intake) means a typo never breaks the write — but pass the exact strings.

> **Note on the input token:** the trigger-body key is the input's internal name. If the expression editor shows your input as `triggerBody()['text']`, `triggerBody()['text_1']`, etc. instead of `triggerBody()?['agentName']`, prefer the **dynamic-content chip** for that input and wrap the `if()` around the chip. The names above assume the inputs are addressable by name (current Workflows behavior). If unsure, type the first `if(equals(` then insert the `agentName` dynamic-content chip where `triggerBody()?['agentName']` appears.

### 4. Compose `adapterInt` (map adapterStatus string → choice integer)
8. **+** → **Add an action** → **Compose** → rename **adapterInt**.
9. In its **Inputs** (fx) paste **exactly**:

```
if(equals(triggerBody()?['adapterStatus'],'Live'),10000,if(equals(triggerBody()?['adapterStatus'],'Sandbox'),10001,10002))
```

> Mapping: Live→10000, Sandbox→10001, everything else (incl. empty / "NotApplicable") → 10002. This is why `NotApplicable` is the safe default.

### 5. Add the Dataverse "Add a new row" action
> The in-product Copilot **cannot** add the Dataverse connector ("connector not found"). Add it **manually**.

10. **+** → **Add an action** → search **Microsoft Dataverse** → choose **Add a new row**.
11. **Table name**: select **Decision Rationales** (`gbx_decisionrationale`).
12. Fill the fields. Use the field's **fx/expression** option for the expression rows, and dynamic-content chips for plain pass-throughs:

| Field (UI label) | What to set | Value / expression |
|---|---|---|
| **Claim (Claims)** — `gbx_ClaimId` | lookup bind | type the related-row reference: `/gbx_claims(@{triggerBody()?['claimGuid']})` *(see Gotcha A — the lookup field expects the GUID; the connector binds it as `gbx_ClaimId@odata.bind`)* |
| **Agent name** — `gbx_agent_name` | expression | `@{outputs('agentInt')}` |
| **Action** — `gbx_action` | dynamic chip | `action` |
| **Policy reference** — `gbx_policy_reference` | dynamic chip | `policyReference` |
| **Data points (JSON)** — `gbx_data_points` | dynamic chip | `dataPointsJson` |
| **Human readable explanation** — `gbx_human_readable_explanation` | dynamic chip | `explanation` |
| **Adapter status** — `gbx_adapter_status` | expression | `@{outputs('adapterInt')}` |
| **Timestamp** — `gbx_timestamp` | expression | `@{utcNow()}` |
| **Flag raised** — `gbx_flag_raised` | dynamic chip | `flagRaised` |
| **Flag severity** — `gbx_flag_severity` | expression (optional) | `@{if(empty(triggerBody()?['flagSeverity']),null,if(equals(triggerBody()?['flagSeverity'],'Low'),10000,if(equals(triggerBody()?['flagSeverity'],'Medium'),10001,10002)))}` |
| **Latency (ms)** — `gbx_latency_ms` | dynamic chip | `latencyMs` |
| **Confidence contribution** — `gbx_confidence_contribution` | dynamic chip | `confidenceContribution` |

> **Leave `gbx_log_id` blank** — the autonumber fills it (`LOG-{yyyy}-{0000001}`).
> **Do NOT** set `gbx_sub_agent` or `gbx_external_api_result` here — those are populated by specialized flows (e.g. validators write the raw API JSON to `gbx_external_api_result`). This generic logger leaves them empty.

### 6. Wire the response
13. Open the terminal **Respond to the agent** action → **+ Add an output** → **Text** → name `logId`.
14. Set its value (fx) to:

```
@{outputs('Add_a_new_row')?['body/gbx_log_id']}
```

> If your Add-a-row action is named differently (e.g. `Add_a_new_row_to_selected_environment`), match the action name inside `outputs('...')`. Use the dynamic-content chip **gbx_log_id (Decision Rationale)** to be safe.

15. **Save**. If prompted, **Publish** so the agent can call it as a tool.

**You should see:** a five-step flow — trigger → `agentInt` → `adapterInt` → Add a new row (Decision Rationales) → Respond to the agent (`logId`).

---

## Test

1. Power Automate (or Copilot Studio test) → open **GlassBox-LogDecision** → **Test** → **Manually** → **Test**.
2. Use a real `claimGuid` from the GlassBox-CreateClaim test (section 3 of `03_flows_and_greeting_runbook.md` returns `claimGuid`). Fill:
   - `claimGuid` = *(paste the GUID from a real claim row)*
   - `agentName` = `Intake`
   - `action` = `Claim created`
   - `policyReference` = `Personal Auto — Collision`
   - `dataPointsJson` = `{"lossType":"Collision","subType":"Rear-ended","injuries":false}`
   - `explanation` = `FNOL captured for POL-2026-0847, Collision/Rear-ended; policy active, no injuries reported.`
   - `adapterStatus` = `NotApplicable`
   - `flagRaised` = `No` · `flagSeverity` = *(blank)* · `latencyMs` = `120` · `confidenceContribution` = `0`
3. **Run.**

**Expected output:** the flow returns `logId` like **`LOG-2026-0000001`**.

**Verify in Dataverse:** make.powerapps.com → **Tables** → **Decision Rationales** → **Data** → a new row exists:
- linked to the claim (Claim lookup populated),
- **Agent name = Intake**, **Adapter status = NotApplicable**,
- **Human readable explanation** = the sentence above,
- **Timestamp** populated.

**Second test (sandbox + flag path):** `agentName` = `Validation`, `action` = `ISO ClaimSearch query`, `adapterStatus` = `Sandbox`, `flagRaised` = `Yes`, `flagSeverity` = `Medium`, `explanation` = `Prior-claim hit on VIN within 90 days — flagged for adjuster review.` → expect a second `LOG-…` row with **Adapter status = Sandbox**, **Flag raised = Yes**, **Flag severity = Medium**.

**Gate:** both rows land correctly before any agent is wired to call this flow.

---

## Gotchas

**A. Lookup binding (`gbx_ClaimId`).** "Add a new row" shows the lookup as **Claim (Claims)**. The connector wants the related-row reference; behind the scenes it becomes `gbx_ClaimId@odata.bind = /gbx_claims(<guid>)`. Type `/gbx_claims(@{triggerBody()?['claimGuid']})` into that field. If the field only accepts a raw GUID, paste just `@{triggerBody()?['claimGuid']}` — the connector prepends the set. Do **not** invent a `gbx_claimidname` text column; the lookup is the only way to relate the row.

**B. Choice columns take the INTEGER, not the text.** `gbx_agent_name` and `gbx_adapter_status` must receive `@{outputs('agentInt')}` / `@{outputs('adapterInt')}` (e.g. `10004`), never the string `"Adjudication"`. Setting a choice to a string silently fails or errors. (Reading a choice back as text later needs the `@OData.Community.Display.V1.FormattedValue` annotation — that bit us on policy status — but on WRITE you give the int.)

**C. `agentName` must match exactly.** The map is case-sensitive on the string. Pass `AssignmentEngine`, not `Assignment Engine`. The final fallback `10000` (Intake) keeps a typo from crashing the flow, but it mislabels the row — so callers must use the exact ten strings.

**D. Optional inputs left blank.** If a caller omits `flagSeverity`, the `if(empty(...))` wrapper writes `null` instead of a bad choice value. For `latencyMs` / `confidenceContribution` the defaults of `0` keep numeric columns valid. Do not remove the empty-guard on `flagSeverity`.

**E. Trigger-body token names.** Newer Workflows triggers expose inputs by their friendly name (`triggerBody()?['agentName']`); some builds use `triggerBody()['text']`, `['text_1']`, … in field order. If an expression shows a value of `null` on test, open the run history, inspect the trigger outputs to see the real key names, and either rename via dynamic-content chips or adjust the `triggerBody()?['…']` keys to match. Insert the dynamic-content chip when in doubt — it always resolves to the correct key.

**F. Save then Publish.** A flow must be **saved** (and often **published**) before the agent can invoke it as a tool. If Sara says "I don't have that tool," re-publish the flow and the agent.

**G. One row per step — no batching.** Every agent step = exactly one call to this flow = exactly one audit row. Do not loop multiple logs through one call; the uniform one-row-per-decision shape is what makes the Glass Box readable and is the regulatory pitch (Colorado SB21-169 / NAIC AI Model Bulletin).
