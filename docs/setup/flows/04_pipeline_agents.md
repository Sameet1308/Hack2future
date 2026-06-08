# Runbook 04 — Downstream Pipeline (Master Orchestration + Policy → Validation → Adjudication → Explanation)

> **What this flow does:** the moment a `gbx_claim` row is created, a Master Orchestration cloud
> flow runs the four downstream agents in order — Policy (coverage), Validation (NOAA/NHTSA real +
> 6 sandbox adapters), Adjudication (ONE gpt-4.1 call → verdict), Explanation (customer plain-English) —
> writing one `gbx_decisionrationale` row after **every** step.
>
> **Why it matters for the demo:** this is Stage 7 of `end_to_end_flow.md` and the live proof of the
> Glass Box differentiator — the panel watches the audit trail fill in real time, each row a plain-English
> sentence mapping to Colorado SB21-169 / NAIC. Adjudication is a real GPT verdict, not a script.

> Environment: **GlassBox-Dev** (`https://orgc0207390.crm.dynamics.com`). Agent: **Glass Box Claims
> Assistant** (Sara). Builds on the already-working **GlassBox-GetPolicy** + **GlassBox-LogDecision** +
> **GlassBox-CreateClaim** (Runbook 03) and the Greeting topic. Owner: Suraj (flows), Prasad (Adjudication
> prompt + RAG). Do **not** re-spec GetPolicy/Greeting.

---

## 0 — Architecture rules baked into this runbook (non-negotiable)

1. **The agent never writes Dataverse directly.** Master Orchestration is a *background* flow triggered by
   the row insert — it is the service layer for the pipeline. It calls **GlassBox-LogDecision** (Runbook 03 §4)
   after every step so all audit rows share one identical format.
2. **One audit row per step.** Policy, each validator, Adjudication, Explanation — every one writes a
   `gbx_decisionrationale` row in plain English. The Glass Box is the *thread*, not a single line.
3. **ONE real gpt-4.1 call on the demo path** — only Adjudication (§C). Everything else is Dataverse reads,
   public-API calls, sandbox-adapter HTTP calls, or a template. Cost guardrail (decisions.md 2026-06-06).
4. **Sandbox adapters are real interfaces with canned data**, flagged `gbx_adapter_status = Sandbox (10001)`.
   NOAA + NHTSA are `Live (10000)`. The `gbx_use_real_<x>` env-var pattern flips mock→real with no flow change.

---

## Schema quick-reference (use these EXACT names)

**Claim** `gbx_claim` (set `gbx_claims`) — PK `gbx_claim_id` (autonumber, NEVER set). Row GUID `gbx_claimid`.
Lookup `gbx_PolicyId@odata.bind = /crcce_policies(<guid>)`.
Choice ints used here:
- `gbx_loss_type`: Collision=10000, Comp-Weather=10001, Comp-Theft=10002, Comp-Vandalism=10003,
  Comp-Fire=10004, Comp-Animal=10005, Comp-Glass=10006, Liab-PD=10007, Liab-BI=10008, PIP-MedPay=10009, UM-UIM=10010.
- `gbx_status`: New=10000, Processing=10001, AwaitingDocs=10002, UnderReview=10003, Approved=10004,
  Denied=10005, Escalated=10006, Cancelled=10007, Reopen=10008.
- `gbx_recommendation`: Approve=10000, Deny=10001, Partial=10002, Escalate=10003, Adjust=10004.
- `gbx_tier`: "1"=10000, "2"=10001, "3"=10002.
- Other write targets: `gbx_confidence_score` (int 0–100), `gbx_settlement_amount` (money),
  `gbx_vin` (text), `gbx_incident_state` (text), `gbx_incident_date` (datetime), `gbx_description` (memo),
  `gbx_injury_flag` `gbx_distress_flag` `gbx_other_party_involved` (bool), `gbx_loss_type_details` (memo JSON).

**Policy** `crcce_policy` (set `crcce_policies`) — `crcce_policynumber`, `crcce_policyholdername`,
`crcce_vehicledescription`, `crcce_statecode`, `crcce_policyid` (GUID). Status TEXT via
`crcce_policystatus@OData.Community.Display.V1.FormattedValue` = "Active"/"Expired".

**Decision Rationale** `gbx_decisionrationale` (set `gbx_decisionrationales`) — PK `gbx_log_id` (autonumber).
Lookup `gbx_ClaimId@odata.bind = /gbx_claims(<guid>)`. Inputs we set via GlassBox-LogDecision:
`gbx_agent_name` (Intake=10000, Extraction=10001, Policy=10002, Validation=10003, Adjudication=10004,
Explanation=10005, Notification=10006, Adjuster=10007, AssignmentEngine=10008, VendorEngine=10009),
`gbx_adapter_status` (Live=10000, Sandbox=10001, NotApplicable=10002), `gbx_sub_agent`, `gbx_action`,
`gbx_policy_reference`, `gbx_data_points` (JSON), `gbx_external_api_result` (JSON),
`gbx_human_readable_explanation`, `gbx_confidence_contribution` (decimal), `gbx_flag_raised` (bool),
`gbx_flag_severity` (Low=10000, Medium=10001, High=10002), `gbx_latency_ms`, `gbx_timestamp`.

> ⚠️ **GlassBox-LogDecision contract.** Runbook 03 §4 built it with **Text** inputs `claimGuid`, `agentName`,
> `action`, `policyReference`, `dataPointsJson`, `explanation`, `adapterStatus`. To support the pipeline,
> §0.5 below adds **four optional inputs** to that flow once. Pass `agentName` as the **word**
> ("Policy"/"Validation"/"Adjudication"/"Explanation"); LogDecision maps it to the int internally.

---

## 0.5 — One-time prerequisite: extend GlassBox-LogDecision (4 optional inputs)

The pipeline needs structured fields LogDecision didn't expose. Add them once; existing callers are unaffected
(they're optional).

1. Copilot Studio → **Tools** → open **GlassBox-LogDecision** → **Edit**.
2. On the **trigger** ("When an agent calls the flow") → **+ Add an input** four times:
   | Name | Type | Notes |
   |---|---|---|
   | `externalApiResultJson` | Text | raw JSON from NOAA/NHTSA/adapter; default "" |
   | `confidenceContribution` | Number | per-step contribution, e.g. 0.15; default 0 |
   | `flagRaised` | Yes/No | escalation/anomaly flag; default No |
   | `subAgent` | Text | e.g. "NOAA", "NHTSA", "ISO-ClaimSearch"; default "" |
3. In the existing **Dataverse → Add a new row** (Decision Rationales), map the new columns:
   | Column | Value |
   |---|---|
   | External API result (JSON) — `gbx_external_api_result` | `externalApiResultJson` (dynamic chip) |
   | Confidence contribution — `gbx_confidence_contribution` | `confidenceContribution` |
   | Flag raised — `gbx_flag_raised` | `flagRaised` |
   | Sub agent — `gbx_sub_agent` | `subAgent` |
4. **Save → Publish.**

**You should see:** LogDecision test pane now lists 11 inputs (7 original + 4 new), all but the original
set optional.

---

## 1 — Master Orchestration: trigger + structure

**Goal:** fire on every new claim, load the full claim + policy context once, then run the four agents in order.
This flow is **not** a Copilot tool — it is a background automation. Build it in Power Automate directly.

### 1.1 Create the flow + Dataverse trigger

1. **make.powerautomate.com** → environment **GlassBox-Dev** → **+ Create** → **Automated cloud flow**.
   Name: **GlassBox-MasterOrchestration**. Trigger: search **Dataverse → When a row is added, modified or
   deleted** → **Create**.
2. Configure the trigger **exactly**:
   | Field | Value |
   |---|---|
   | **Change type** | `Added` |
   | **Table name** | `Claims` (`gbx_claim`) |
   | **Scope** | `Organization` |
   | **Select columns** (Advanced) | `gbx_claimid,gbx_loss_type,gbx_vin,gbx_incident_state,gbx_incident_date,gbx_description,gbx_injury_flag,gbx_distress_flag,gbx_other_party_involved,gbx_loss_type_details,_gbx_policyid_value` |

   *Select columns is a performance + loop-guard win: the flow re-fires on modify only if a listed column
   changes — and we only listen for `Added`, so the Adjudication write-back in §C won't re-trigger it.*

   **You should see:** trigger card titled "When a row is added, modified or deleted" with Change type = Added.

3. **Initialize working variables** — add these **Initialize variable** actions right after the trigger
   (Variable connector). Order matters; declare all before the branches:
   | Name | Type | Initial value |
   |---|---|---|
   | `varClaimGuid` | String | `@{triggerOutputs()?['body/gbx_claimid']}` |
   | `varLossTypeInt` | Integer | `@{triggerOutputs()?['body/gbx_loss_type']}` |
   | `varVin` | String | `@{coalesce(triggerOutputs()?['body/gbx_vin'],'')}` |
   | `varIncidentState` | String | `@{coalesce(triggerOutputs()?['body/gbx_incident_state'],'')}` |
   | `varIncidentDate` | String | `@{coalesce(triggerOutputs()?['body/gbx_incident_date'],'')}` |
   | `varDescription` | String | `@{coalesce(triggerOutputs()?['body/gbx_description'],'')}` |
   | `varInjuryFlag` | Boolean | `@{coalesce(triggerOutputs()?['body/gbx_injury_flag'],false)}` |
   | `varDistressFlag` | Boolean | `@{coalesce(triggerOutputs()?['body/gbx_distress_flag'],false)}` |
   | `varPolicyGuid` | String | `@{triggerOutputs()?['body/_gbx_policyid_value']}` |
   | `varValidationSummary` | String | `[]`  *(JSON array string; validators append here for §C)* |
   | `varEstimateAmount` | Float | `0`  *(parsed from loss_type_details if present)* |

   > **Loss-type as a word** (needed for prompts + adapter routing): add a **Compose** named `LossTypeWord`,
   > Expression:
   > ```
   > if(equals(variables('varLossTypeInt'),10000),'Collision',if(equals(variables('varLossTypeInt'),10001),'Comp-Weather',if(equals(variables('varLossTypeInt'),10002),'Comp-Theft',if(equals(variables('varLossTypeInt'),10003),'Comp-Vandalism',if(equals(variables('varLossTypeInt'),10004),'Comp-Fire',if(equals(variables('varLossTypeInt'),10005),'Comp-Animal',if(equals(variables('varLossTypeInt'),10006),'Comp-Glass',if(equals(variables('varLossTypeInt'),10007),'Liab-PD',if(equals(variables('varLossTypeInt'),10008),'Liab-BI',if(equals(variables('varLossTypeInt'),10009),'PIP-MedPay','UM-UIM')))))))))))
   > ```

4. **Mark Processing.** Add **Dataverse → Update a row** → table `Claims`, **Row ID** = `varClaimGuid`,
   **Status (`gbx_status`)** = `10001` (Processing). *(So the frontend/Theater shows the claim moving.)*

5. **Parse the estimate** (used by §7 escalation). Add a **Compose** `EstimateRaw`:
   ```
   @{if(empty(variables('varDescription')), variables('varLossTypeDetails'), variables('varDescription'))}
   ```
   then a **Set variable** `varEstimateAmount` =
   ```
   @{if(contains(coalesce(triggerOutputs()?['body/gbx_loss_type_details'],''),'estimate'), float(coalesce(json(triggerOutputs()?['body/gbx_loss_type_details'])?['estimate'],0)), 0)}
   ```
   *(If `gbx_loss_type_details` is a JSON object with an `estimate` number, this reads it; otherwise 0. Demo
   Scenario 1 seeds `{"estimate":3200}`, Scenario 2 `{"estimate":8400}`.)*

**Gate:** Save. Trigger card = Added/Claims/Organization, 11 variables + LossTypeWord initialized, status set
to Processing.

---

## A — POLICY agent (confirm coverage)

**Goal:** confirm the policy covers this loss type, capture deductible language, write a Policy audit row.
**Demo:** read the Policy row from Dataverse. **Production:** the same step calls Azure AI Search over the
policy PDFs (vector + keyword) — note that in the audit row's `gbx_policy_reference` so the panel sees the
production path is designed in.

1. **Dataverse → Get a row by ID** → table `Policies`, **Row ID** = `varPolicyGuid`. Rename action
   `Get_Policy_Row`. **Select columns**: `crcce_policynumber,crcce_policyholdername,crcce_vehicledescription,crcce_statecode,crcce_policystatus`.
2. **Compose `CoverageConfirmed`** — for the demo every active policy carries full Auto coverage; encode that
   plus the one denial path (Expired policy). Expression:
   ```
   @{if(equals(outputs('Get_Policy_Row')?['body/crcce_policystatus@OData.Community.Display.V1.FormattedValue'],'Active'), true, false)}
   ```
   > **Why the FormattedValue annotation:** choice TEXT ("Active"/"Expired") is NOT returned as a plain
   > column — it only comes via `crcce_policystatus@OData.Community.Display.V1.FormattedValue`. This bit us on
   > status before; use the annotation exactly.
3. **Compose `Deductible`** (demo-canned coverage language by loss family). Expression:
   ```
   @{if(or(equals(outputs('LossTypeWord'),'Comp-Weather'),equals(outputs('LossTypeWord'),'Comp-Glass')), '$100 comprehensive deductible (glass waived if view impaired)', if(startsWith(outputs('LossTypeWord'),'Comp'), '$250 comprehensive deductible', '$500 collision deductible'))}
   ```
4. **Call GlassBox-LogDecision** — add action **GlassBox-LogDecision** (it's a tool; in a non-Copilot flow it
   shows under your environment's flows/child-flows, or add via **+ → Run a Child Flow** if registered as such;
   otherwise replicate with a direct **Add a new row** to Decision Rationales — see §Gotchas). Inputs:
   | Input | Value |
   |---|---|
   | `claimGuid` | `varClaimGuid` |
   | `agentName` | `Policy` |
   | `action` | `Coverage confirmed` |
   | `policyReference` | `@{concat('Policy ', outputs('Get_Policy_Row')?['body/crcce_policynumber'], ' — coverage matrix (demo: Dataverse policy row; prod: Azure AI Search over policy PDF)')}` |
   | `dataPointsJson` | `@{concat('{"lossType":"', outputs('LossTypeWord'), '","policyStatus":"', outputs('Get_Policy_Row')?['body/crcce_policystatus@OData.Community.Display.V1.FormattedValue'], '","deductible":"', outputs('Deductible'), '"}')}` |
   | `explanation` | `@{if(outputs('CoverageConfirmed'), concat(outputs('LossTypeWord'), ' coverage confirmed on policy ', outputs('Get_Policy_Row')?['body/crcce_policynumber'], '. ', outputs('Deductible'), ' applies.'), concat('Policy ', outputs('Get_Policy_Row')?['body/crcce_policynumber'], ' is not active — coverage cannot be confirmed for ', outputs('LossTypeWord'), '.'))}` |
   | `adapterStatus` | `NotApplicable` |
   | `subAgent` | `CoverageCheck` |
   | `confidenceContribution` | `@{if(outputs('CoverageConfirmed'), 0.25, 0)}` |
   | `flagRaised` | `@{not(outputs('CoverageConfirmed'))}` |

5. **Branch on coverage.** Add a **Condition** `Coverage OK?`: `outputs('CoverageConfirmed')` is equal to `true`.
   - **If no** → Update Claim `gbx_status` = `10005` (Denied), `gbx_recommendation` = `10001` (Deny), then
     **Terminate** (Status: Succeeded). The denial path stops here — no point validating/adjudicating an
     uncovered loss. *(Scenario "Expired policy" demo.)*
   - **If yes** → continue to §B.

**You should see (test later):** a Decision Rationale row, agent = Policy, plain-English "Collision coverage
confirmed on policy POL-2026-0847. $500 collision deductible applies."

---

## B — VALIDATION agent (NOAA + NHTSA real, 6 sandbox adapters)

**Goal:** corroborate the claim against external sources. Two are **real public APIs** (no key); six are
**sandbox adapters** (HTTP-trigger flows returning canned JSON). Each writes its own audit row with the right
`adapterStatus` and the raw JSON in `externalApiResultJson`, and appends a one-line result to
`varValidationSummary` for Adjudication.

> **The `gbx_use_real_<x>` flag pattern (Tier B).** Each sandbox source has an environment variable, e.g.
> `gbx_use_real_iso`, `gbx_use_real_nicb`, `gbx_use_real_carfax`, `gbx_use_real_dmv`, `gbx_use_real_kbb`,
> `gbx_use_real_telematics` (Dataverse → Solutions → environment variables, Boolean, default **No**). Every
> adapter step is wrapped in a **Condition** on its flag: **No** → call the sandbox HTTP-trigger flow (canned
> JSON, `adapterStatus = Sandbox`); **Yes** → call the real vendor endpoint (production credential, `adapterStatus
> = Live`). The *interface and the audit row are identical either way* — only the data source and the flag
> flip. For the demo all flags = No. Read a flag with **Dataverse → list environment-variable value**, or the
> expression `@{outputs('Get_EnvVar_iso')?['body/value']}`.

### B.1 — NOAA (REAL, only for Comp-Weather)

Run **only** when `LossTypeWord = Comp-Weather` — wrap §B.1 in a **Condition** `Is weather claim?`:
`outputs('LossTypeWord')` is equal to `Comp-Weather`.

1. **HTTP** action (rename `NOAA_Points`):
   - **Method** `GET`
   - **URI** `https://api.weather.gov/points/@{variables('varLat')},@{variables('varLng')}`
     *(For the demo we hardcode the incident lat/long — add two **Initialize variable** `varLat`/`varLng` up
     in §1.3 seeded from a state→coord lookup Compose; Scenario 2 = Orlando FL `28.5383,-81.3792`. Production
     geocodes `gbx_location`.)*
   - **Headers**: `User-Agent: GlassBoxAI-Claims (demo@glassbox.ai)` *(NOAA requires a User-Agent or returns 403.)*
2. **HTTP** `NOAA_Alerts`:
   - **Method** `GET`
   - **URI** `https://api.weather.gov/alerts?area=@{variables('varIncidentState')}&start=@{addDays(variables('varIncidentDate'),-1)}&end=@{addDays(variables('varIncidentDate'),1)}`
   - **Headers**: same `User-Agent`.
   *(Queries active/historical alerts for the incident state in a ±1 day window. For a hail/wind claim we look
   for a corroborating Severe Thunderstorm / Flood alert.)*
3. **Parse** — **Compose `NOAA_Corroborated`**:
   ```
   @{greater(length(coalesce(body('NOAA_Alerts')?['features'], json('[]'))), 0)}
   ```
4. **Call GlassBox-LogDecision**:
   | Input | Value |
   |---|---|
   | `claimGuid` | `varClaimGuid` |
   | `agentName` | `Validation` |
   | `subAgent` | `NOAA` |
   | `action` | `Weather corroboration` |
   | `externalApiResultJson` | `@{string(body('NOAA_Alerts'))}` |
   | `explanation` | `@{if(outputs('NOAA_Corroborated'), concat('NOAA confirms a severe-weather event in ', variables('varIncidentState'), ' around ', variables('varIncidentDate'), ' — weather damage corroborated.'), concat('NOAA shows NO corroborating weather event in ', variables('varIncidentState'), ' on ', variables('varIncidentDate'), ' — flagged for review.'))}` |
   | `adapterStatus` | `Live` |
   | `confidenceContribution` | `@{if(outputs('NOAA_Corroborated'), 0.2, -0.3)}` |
   | `flagRaised` | `@{not(outputs('NOAA_Corroborated'))}` |
5. **Append to validation summary** — **Append to string variable** `varValidationSummary`. Append a
   **structured token** (`corroborated`|`noevent`), NOT the prose — §C.4 matches on tokens, and matching on
   free text is unsafe (e.g. "no duplicate found" contains "duplicate found"):
   `@{concat('NOAA:', if(outputs('NOAA_Corroborated'),'corroborated','noevent'), '; ')}`

> **§7 hook:** `NOAA cannot corroborate weather event` is an auto-escalate trigger. The `flagRaised=true` +
> negative confidence contribution carry that into Adjudication.

### B.2 — NHTSA recalls (REAL, by VIN/make — runs for every Auto claim)

1. **HTTP** `NHTSA_Recalls`:
   - **Method** `GET`
   - **URI** `https://api.nhtsa.gov/recalls/recallsByVehicle?make=@{variables('varVehicleMake')}&model=@{variables('varVehicleModel')}&modelYear=@{variables('varVehicleYear')}`
     *(Derive make/model/year by splitting `crcce_vehicledescription`, e.g. "2022 Honda Civic" → year 2022 /
     make Honda / model Civic. Add three **Compose** actions using `split(...,' ')[0/1/2]` right after
     `Get_Policy_Row`. NHTSA's free recalls endpoint keys on make/model/year, not raw VIN.)*
   - No headers/key required.
2. **Compose `NHTSA_OpenRecall`**:
   ```
   @{greater(length(coalesce(body('NHTSA_Recalls')?['results'], json('[]'))), 0)}
   ```
3. **Call GlassBox-LogDecision**:
   | Input | Value |
   |---|---|
   | `claimGuid` | `varClaimGuid` |
   | `agentName` | `Validation` |
   | `subAgent` | `NHTSA` |
   | `action` | `Recall check` |
   | `externalApiResultJson` | `@{string(body('NHTSA_Recalls'))}` |
   | `explanation` | `@{if(outputs('NHTSA_OpenRecall'), concat(length(body('NHTSA_Recalls')?['results']), ' open NHTSA recall(s) found for the ', variables('varVehicleYear'), ' ', variables('varVehicleMake'), ' ', variables('varVehicleModel'), ' — noted, may affect liability.'), concat('No open NHTSA recalls for the ', variables('varVehicleYear'), ' ', variables('varVehicleMake'), ' ', variables('varVehicleModel'), '.'))}` |
   | `adapterStatus` | `Live` |
   | `confidenceContribution` | `0.1` |
   | `flagRaised` | `@{outputs('NHTSA_OpenRecall')}` |
4. **Append** `varValidationSummary` (structured token): `@{concat('NHTSA:', if(outputs('NHTSA_OpenRecall'),'open-recall','clear'), '; ')}`

### B.3 — Six sandbox adapters (ISO, NICB, CARFAX, DMV, KBB, Telematics)

Each adapter is a **separate HTTP-trigger child flow** that returns canned JSON (built once in §B.4). In
Master Orchestration, for each adapter add this 3-action block (shown for ISO; repeat for the other five):

1. **Dataverse → list environment-variable values** (or a **Get a row** on `environmentvariablevalue`) to read
   `gbx_use_real_iso`. Rename `Get_EnvVar_iso`. *(Demo: returns "false".)*
2. **Condition `Use real ISO?`**: `@{outputs('Get_EnvVar_iso')?['body/value']}` is equal to `true`.
   - **If yes (production):** HTTP to the real ISO ClaimSearch endpoint with the production credential →
     `adapterStatus = Live`. *(Not exercised in demo.)*
   - **If no (demo):** **HTTP** `ISO_Sandbox` → **POST** to the ISO sandbox child flow URL (from §B.4), body:
     `{"vin":"@{variables('varVin')}","lossType":"@{outputs('LossTypeWord')}","incidentDate":"@{variables('varIncidentDate')}"}`
3. **Call GlassBox-LogDecision** (same in both branches except `adapterStatus`):
   | Input | Value |
   |---|---|
   | `claimGuid` | `varClaimGuid` |
   | `agentName` | `Validation` |
   | `subAgent` | `ISO-ClaimSearch` |
   | `action` | `Cross-carrier duplicate check` |
   | `externalApiResultJson` | `@{string(body('ISO_Sandbox'))}` |
   | `explanation` | `@{concat('ISO ClaimSearch: ', body('ISO_Sandbox')?['summary'])}` |
   | `adapterStatus` | `Sandbox` |
   | `confidenceContribution` | `@{if(equals(body('ISO_Sandbox')?['match'], true), -0.3, 0.05)}` |
   | `flagRaised` | `@{equals(body('ISO_Sandbox')?['match'], true)}` |
4. **Append** `varValidationSummary` (structured token, NOT the prose summary):
   `@{concat('ISO-ClaimSearch:', if(equals(body('ISO_Sandbox')?['match'],true),'match','clear'), '; ')}`
   *(Use the adapter's `subAgent` name + `match`|`clear`. The free-text `summary` still goes into the audit
   row's `explanation`; only the override token stream uses the structured form.)*

**Repeat the block** for the other five, changing only the obvious fields:
| Adapter | `subAgent` | `action` | canned `summary` (demo) | §7 trigger if true |
|---|---|---|---|---|
| ISO ClaimSearch | `ISO-ClaimSearch` | Cross-carrier duplicate check | `"no cross-carrier duplicate found"` | Cross-carrier duplicate |
| NICB | `NICB` | Stolen/watchlist check | `"VIN not on NICB watchlist"` | NICB watchlist hit |
| CARFAX | `CARFAX` | Vehicle history check | `"clean title, no prior total loss"` | prior salvage/total |
| DMV | `DMV` | Registration/license check | `"registration active, driver licensed"` | suspended/lapsed |
| KBB | `KBB` | ACV valuation | `"ACV $18,400"` | estimate > 70% ACV |
| Telematics | `Telematics` | Crash-event corroboration | `"hard-braking event confirmed at DOL"` | no event found |

> **Order/parallelism:** for demo simplicity run NOAA → NHTSA → the six adapters **sequentially** (the panel
> watches each audit row appear). In production these go in a **parallel branch** for speed — note that in the
> demo script, don't refactor now.

### B.4 — Build the six sandbox-adapter HTTP-trigger flows (one-time)

Each is a tiny flow returning canned JSON. Build ISO; clone for the rest.

1. **make.powerautomate.com → + Create → Instant cloud flow** → name **GlassBox-Sandbox-ISO** → trigger
   **When an HTTP request is received** → **Create**.
2. Trigger **Request Body JSON Schema** (paste):
   ```json
   { "type": "object", "properties": {
       "vin": {"type":"string"}, "lossType": {"type":"string"}, "incidentDate": {"type":"string"} } }
   ```
3. Add **Response** action: **Status Code** `200`, **Headers** `{"Content-Type":"application/json"}`, **Body**:
   ```json
   { "source": "ISO ClaimSearch (sandbox)", "match": false,
     "summary": "no cross-carrier duplicate found",
     "queriedVin": "@{triggerBody()?['vin']}", "adapterStatus": "Sandbox" }
   ```
4. **Save.** Copy the generated **HTTP POST URL** from the trigger → paste into the §B.3 ISO_Sandbox HTTP
   action URI. **The canned JSON's interface matches production** — only `match`/`summary` are stubbed.
5. **Clone** for `GlassBox-Sandbox-NICB / -CARFAX / -DMV / -KBB / -Telematics`, changing the body's `source`
   and `summary` per the §B.3 table (and `match`/`acv`/`event` fields as needed). Each returns its own POST URL.

**Gotcha:** sandbox flow URLs contain a SAS signature — store them as **environment variables**
(`gbx_url_sandbox_iso`, etc.) and reference those in §B.3 so you never hardcode the signed URL in the
orchestrator. Keep them out of committed files.

---

## C — ADJUDICATION agent (the ONE real gpt-4.1 call)

**Goal:** assemble claim + policy + validation facts into a prompt, send **one** chat/completions call to
gpt-4.1, parse the JSON verdict, write it onto the Claim row, apply §7 auto-escalate overrides, and log an
Adjudication audit row. **This is the only live GPT call on the demo path** (cost guardrail).

### C.1 — Build the prompt

1. **Compose `AdjudicationSystemPrompt`** (verbatim):
   ```
   You are the Adjudication Agent for a US personal-auto insurer. Decide the claim from the facts provided.
   Respond with ONLY a JSON object, no prose, no markdown fences, exactly:
   {"recommendation":"Approve|Deny|Partial|Escalate|Adjust","confidence":0-100,"tier":1|2|3,"settlementAmount":<number>,"rationale":"one plain-English sentence a regulator could read"}
   Rules: confidence is your calibrated certainty. tier 1 = auto-approve, 2 = senior adjuster, 3 = specialist.
   If coverage is confirmed, validation is clean, and estimate < $25,000 with no injuries, lean Approve, tier 1.
   Be conservative: when validation flags an anomaly or data is thin, lower confidence and raise tier.
   ```
2. **Compose `AdjudicationUserPrompt`**:
   ```
   @{concat(
     'CLAIM FACTS:\n',
     'Loss type: ', outputs('LossTypeWord'), '\n',
     'Incident state: ', variables('varIncidentState'), '  Date: ', variables('varIncidentDate'), '\n',
     'Vehicle: ', outputs('Get_Policy_Row')?['body/crcce_vehicledescription'], '\n',
     'Policyholder: ', outputs('Get_Policy_Row')?['body/crcce_policyholdername'], '\n',
     'Narrative: ', variables('varDescription'), '\n',
     'Injury reported: ', string(variables('varInjuryFlag')), '   Distress flag: ', string(variables('varDistressFlag')), '\n',
     'Repair estimate (USD): ', string(variables('varEstimateAmount')), '\n',
     'Coverage: ', outputs('Deductible'), '\n',
     'VALIDATION RESULTS: ', variables('varValidationSummary'), '\n',
     'Decide now. Return ONLY the JSON object.')}
   ```

### C.2 — The HTTP call to Azure OpenAI gpt-4.1

> Endpoint + key live in `.env.local` as `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_KEY`. **Do NOT hardcode the
> key in the flow or in any committed file.** Store the key as a Dataverse **environment variable**
> `gbx_aoai_key` (Secret type, or plain for the demo lab) and the endpoint as `gbx_aoai_endpoint`; reference
> them via `@{outputs('Get_EnvVar_aoaikey')?['body/value']}`. Below shows the placeholder names.

**HTTP** action (rename `AOAI_Adjudicate`):
- **Method**: `POST`
- **URI**: `@{outputs('Get_EnvVar_aoaiendpoint')?['body/value']}openai/deployments/gpt-4.1/chat/completions?api-version=2024-10-21`
  *(equivalently `{AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4.1/chat/completions?api-version=2024-10-21`)*
- **Headers**:
  | Key | Value |
  |---|---|
  | `Content-Type` | `application/json` |
  | `api-key` | `@{outputs('Get_EnvVar_aoaikey')?['body/value']}`  *(the `AZURE_OPENAI_KEY` placeholder)* |
- **Body**:
  ```json
  {
    "messages": [
      { "role": "system", "content": "@{outputs('AdjudicationSystemPrompt')}" },
      { "role": "user", "content": "@{outputs('AdjudicationUserPrompt')}" }
    ],
    "temperature": 0.2,
    "max_tokens": 300,
    "response_format": { "type": "json_object" }
  }
  ```
  > `response_format: json_object` forces valid JSON so parsing never breaks on stray prose. `temperature 0.2`
  > keeps the verdict stable for a live demo.

### C.3 — Parse the verdict

1. **Compose `VerdictRaw`**:
   `@{body('AOAI_Adjudicate')?['choices'][0]?['message']?['content']}`
2. **Parse JSON** action → **Content** = `outputs('VerdictRaw')` → **Schema**:
   ```json
   { "type": "object", "properties": {
       "recommendation": {"type":"string"},
       "confidence": {"type":"integer"},
       "tier": {"type":"integer"},
       "settlementAmount": {"type":"number"},
       "rationale": {"type":"string"} } }
   ```
   Rename it `Verdict`.
3. **Map recommendation word → choice int** — **Compose `RecInt`**:
   ```
   @{if(equals(body('Verdict')?['recommendation'],'Approve'),10000,if(equals(body('Verdict')?['recommendation'],'Deny'),10001,if(equals(body('Verdict')?['recommendation'],'Partial'),10002,if(equals(body('Verdict')?['recommendation'],'Escalate'),10003,10004))))}
   ```
4. **Map tier → choice int** — **Compose `TierInt`** (`gbx_tier` "1"=10000,"2"=10001,"3"=10002):
   ```
   @{if(equals(body('Verdict')?['tier'],1),10000,if(equals(body('Verdict')?['tier'],2),10001,10002))}
   ```

### C.4 — §7 auto-escalate overrides (deterministic, AFTER the model)

The LLM proposes; the rules dispose. Apply `intake_data_spec §7` as hard overrides so an auto-approve can
never slip past injury/distress/high-estimate/fraud signals. Match on the **structured tokens** the validators
appended (`noaa:noevent`, `nhtsa:open-recall`, `iso-claimsearch:match`, `nicb:match`) — **never on the prose
summary** (matching free text is unsafe: "no duplicate found" contains "duplicate found"). **Compose
`ForceEscalate`**:
```
@{or(
   variables('varInjuryFlag'),
   variables('varDistressFlag'),
   greater(variables('varEstimateAmount'),25000),
   contains(toLower(variables('varValidationSummary')),'noaa:noevent'),
   contains(toLower(variables('varValidationSummary')),'nhtsa:open-recall'),
   contains(toLower(variables('varValidationSummary')),'iso-claimsearch:match'),
   contains(toLower(variables('varValidationSummary')),'nicb:match'),
   equals(outputs('LossTypeWord'),'Comp-Theft'),
   equals(outputs('LossTypeWord'),'Comp-Fire'),
   equals(outputs('LossTypeWord'),'Liab-BI'),
   equals(outputs('LossTypeWord'),'UM-UIM'))}
```
> Mirrors §7 exactly: injury (U7), DistressFlag, estimate > $25k, NOAA-no-corroboration, NHTSA open recall,
> ISO duplicate, NICB watchlist, and the all-Theft / all-Fire (Tier 2 min) / all-BI (Tier 3) / all-UM-UIM
> (Tier 2 min) rules. Because tokens are `:match`/`:clear` (not prose), the clean-demo summary
> (`iso-claimsearch:clear; nicb:clear; …`) never trips a false escalate — Scenario 1 & 2 auto-approve, exactly
> as the offline harness `scripts/pipeline/run_pipeline.py` confirms.

**Compose `FinalStatusInt`** (Claim status from recommendation + override):
```
@{if(outputs('ForceEscalate'),10006, if(equals(body('Verdict')?['recommendation'],'Approve'),10004, if(equals(body('Verdict')?['recommendation'],'Deny'),10005,10003)))}
```
*(ForceEscalate → Escalated(10006). Else Approve→Approved(10004), Deny→Denied(10005), Partial/Adjust/Escalate→
UnderReview(10003).)*

**Compose `FinalTierInt`** (escalation lifts tier to at least 3 when forced):
```
@{if(outputs('ForceEscalate'),10002, outputs('TierInt'))}
```

### C.5 — Write the verdict onto the Claim row

**Dataverse → Update a row** → table `Claims`, **Row ID** = `varClaimGuid`:
| Column | Value |
|---|---|
| Recommendation — `gbx_recommendation` | `@{if(outputs('ForceEscalate'),10003,outputs('RecInt'))}` *(Escalate when forced)* |
| Confidence score — `gbx_confidence_score` | `@{body('Verdict')?['confidence']}` |
| Tier — `gbx_tier` | `@{outputs('FinalTierInt')}` |
| Settlement amount — `gbx_settlement_amount` | `@{body('Verdict')?['settlementAmount']}` |
| Status — `gbx_status` | `@{outputs('FinalStatusInt')}` |

### C.6 — Log the Adjudication audit row

**Call GlassBox-LogDecision**:
| Input | Value |
|---|---|
| `claimGuid` | `varClaimGuid` |
| `agentName` | `Adjudication` |
| `subAgent` | `gpt-4.1` |
| `action` | `@{if(outputs('ForceEscalate'),'Auto-escalated per rule','Adjudicated')}` |
| `policyReference` | `intake_data_spec §7 auto-escalate` |
| `dataPointsJson` | `@{outputs('VerdictRaw')}` |
| `externalApiResultJson` | `@{variables('varValidationSummary')}` |
| `explanation` | `@{if(outputs('ForceEscalate'), concat('Model proposed ', body('Verdict')?['recommendation'], ' (conf ', string(body('Verdict')?['confidence']), '%), but a §7 rule forces escalation to a specialist. ', body('Verdict')?['rationale']), concat(body('Verdict')?['recommendation'], ' at ', string(body('Verdict')?['confidence']), '% confidence; settlement $', string(body('Verdict')?['settlementAmount']), '. ', body('Verdict')?['rationale']))}` |
| `adapterStatus` | `NotApplicable` |
| `confidenceContribution` | `@{div(float(body('Verdict')?['confidence']),100)}` |
| `flagRaised` | `@{outputs('ForceEscalate')}` |

**You should see (test later):** the Claim row now has a recommendation, confidence, tier, settlement, and a
non-New status; one Adjudication audit row in plain English.

---

## D — EXPLANATION agent (customer-facing plain English)

**Goal:** turn the verdict into the sentence the customer reads. **To keep gpt-4.1 to one call, this is a
TEMPLATE**, not a second model call — it composes from the already-parsed verdict. *(Production option: a
second gpt-4o-mini call for warmth; the demo stays one-call.)*

1. **Compose `CustomerMessage`**:
   ```
   @{if(outputs('ForceEscalate'),
     concat('Thanks — we''ve received your ', outputs('LossTypeWord'), ' claim on your ', outputs('Get_Policy_Row')?['body/crcce_vehicledescription'], '. Because of the details involved, a specialist adjuster is reviewing it personally and will reach out within 24 hours. You can check status any time with your claim number.'),
   if(equals(body('Verdict')?['recommendation'],'Approve'),
     concat('Good news — your ', outputs('LossTypeWord'), ' claim is approved. ', outputs('Deductible'), '. We estimate a settlement of $', string(body('Verdict')?['settlementAmount']), '. Here''s what happens next: you''ll get an email with your claim number now, a document checklist within the hour, and your adjuster''s name within 24 hours.'),
     concat('Thanks — your ', outputs('LossTypeWord'), ' claim is under review. We have what we need to start and will update you shortly with next steps and your adjuster''s name.')))}
   ```
2. **Call GlassBox-LogDecision**:
   | Input | Value |
   |---|---|
   | `claimGuid` | `varClaimGuid` |
   | `agentName` | `Explanation` |
   | `subAgent` | `template` |
   | `action` | `Customer rationale generated` |
   | `dataPointsJson` | `@{concat('{"recommendation":"', body('Verdict')?['recommendation'], '","forceEscalate":', string(outputs('ForceEscalate')), '}')}` |
   | `explanation` | `@{outputs('CustomerMessage')}` |
   | `adapterStatus` | `NotApplicable` |
   | `confidenceContribution` | `0` |
   | `flagRaised` | `false` |
3. *(Optional, if Notify_Customer flow exists)* call it with `CustomerMessage` to push the message on the
   claim's original channel. Out of scope for this runbook.

**You should see:** an Explanation audit row whose `gbx_human_readable_explanation` is exactly the customer
sentence — the panel reads it verbatim.

**Final:** add a terminal **Compose `Done`** = `@{concat('Pipeline complete for ', variables('varClaimGuid'))}`.
**Save** the flow.

---

## Test

> **Before you click anything:** the exact verdict + §7 override + choice-int logic in this runbook is mirrored
> in `scripts/pipeline/run_pipeline.py` (offline, mocked LLM, $0). Run `python run_pipeline.py` to see all three
> scenarios' audit trails and final status ints — it is the executable spec for §A–§D and a fast way to confirm
> a change before rebuilding the flow. `--live` makes the one real gpt-4.1 call from `.env.local`.

> Two ways to test the flow itself: (1) **Manual**: in the orchestrator click **Test → Manually**, then in another tab create a Claim
> via GlassBox-CreateClaim (Runbook 03 §3) — the insert fires the trigger. (2) **Direct**: make.powerapps.com →
> Tables → Claims → **+ New row**, fill the fields, Save.

**Scenario 1 — Collision, clean auto-approve (POL-2026-0847 / Sarah Chen / 2022 Honda Civic / CA):**
Create a Claim: lossType Collision (`gbx_loss_type=10000`), incidentState `CA`, vin from policy,
`gbx_loss_type_details = {"estimate":3200}`, injuryFlag No, distressFlag No, description "Rear-ended at a stop
light."
- **Expect:** status → Processing → Approved(10004). `gbx_recommendation`=Approve(10000),
  `gbx_confidence_score` ~90+, `gbx_tier`=1(10000), `gbx_settlement_amount` ≈ 3200 minus deductible.
- **Audit rows (Decision Rationales, by claim):** Policy ("Collision coverage confirmed…$500 collision
  deductible"), Validation/NHTSA ("No open NHTSA recalls…"), six Validation/Sandbox rows (ISO/NICB/CARFAX/DMV/
  KBB/Telematics, adapterStatus=Sandbox), Adjudication ("Approve at 94% confidence; settlement $2,700…"),
  Explanation ("Good news — your Collision claim is approved…"). **No NOAA row** (not a weather claim).

**Scenario 2 — Comp-Weather, corroborated (POL-2026-0592 / Jennifer Rodriguez / 2023 Toyota Camry / FL):**
lossType Comp-Weather(`10001`), incidentState `FL`, lat/lng Orlando, `{"estimate":8400}`, injury No.
- **Expect:** NOAA row present. If NOAA returns a corroborating alert → Approve/UnderReview; if not →
  `ForceEscalate=true`, status Escalated(10006), tier 3(10002), Explanation = specialist message.
- **Audit rows:** Policy, Validation/NOAA (adapterStatus=Live), Validation/NHTSA (Live), six Sandbox rows,
  Adjudication, Explanation.

**Denial path — Expired policy (POL-2026-0998 / Amanda Williams / Expired):**
- **Expect:** Policy audit row "Policy …is not active — coverage cannot be confirmed", Claim status Denied(10005),
  recommendation Deny(10001), flow **terminates after §A** — no Validation/Adjudication rows. Correct: we don't
  adjudicate an uncovered loss.

**Verify:** make.powerapps.com → Tables → Decision Rationales → Data → filter by the claim GUID → rows appear
in pipeline order, each with a readable `gbx_human_readable_explanation`, correct `gbx_agent_name`, and
`gbx_adapter_status` Live for NOAA/NHTSA, Sandbox for the six adapters, NotApplicable for Policy/Adjudication/
Explanation. **The Glass Box is now live end-to-end.**

---

## Gotchas

- **Trigger loop guard.** The flow listens on **Added** only, and §C updates the same row — because the change
  type is Added (not Modified), the write-back does not re-fire it. If you ever switch to "Added or Modified",
  add a **Trigger Condition** `@not(equals(triggerOutputs()?['body/gbx_status'], 10001))` to avoid recursion.
- **Choice TEXT needs the annotation.** Policy status comes from
  `crcce_policystatus@OData.Community.Display.V1.FormattedValue`, never a plain `crcce_policystatusname` column
  on a *Get a row by ID*. (List rows in Runbook 03 surfaced `crcce_policystatusname`; the by-ID read uses the
  annotation — don't mix them up.)
- **Setting a choice on Update a row takes the INTEGER**, not the word. We map word→int with Compose every time
  (`RecInt`, `TierInt`, `FinalStatusInt`).
- **NOAA requires a `User-Agent` header** or returns HTTP 403. Always send it.
- **NHTSA recalls endpoint keys on make/model/year**, not raw VIN — split `crcce_vehicledescription`. If the
  vehicle isn't in NHTSA's DB it returns `results: []` (treated as "clear"), not an error.
- **`response_format: json_object`** is what makes verdict parsing bullet-proof — without it gpt-4.1 may wrap
  JSON in ```json fences and Parse JSON fails. Keep it.
- **Secrets:** AOAI key + sandbox-flow SAS URLs live in **Dataverse environment variables**, read at runtime —
  never typed into the flow definition and never committed. `.env.local` is the local-only source of the
  placeholder values; this runbook references them by name only.
- **One gpt-4.1 call, period.** Explanation is a template by design (decisions.md 2026-06-06 cost guardrail).
  Do not add a second live model call on the demo path.
- **Sequential vs parallel.** Demo runs validators sequentially so the panel watches each audit row land. In
  production they go in a parallel branch for latency — flagged here, not refactored now.
- **`gbx_use_real_<x>` flags** default **No** for the whole demo. Flipping one to Yes (and supplying the real
  endpoint/credential in its production branch) is the only change needed to go live for that source — the
  interface and audit row are identical. That is the Tier-B story the panel should hear.
