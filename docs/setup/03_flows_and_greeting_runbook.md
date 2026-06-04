# Runbook 03 — Service-Layer Flows + Proactive Greeting

> Build order for the front door (Stage 1–2) + service layer (Stage 6) of `end_to_end_flow.md`.
> You click in the portals; every exact name/value is here, pulled live from the schema
> (`scripts/peek_schema.py`, 2026-06-04). Build top to bottom — section 1 unblocks the rest.
>
> Environment: **GlassBox-Dev** (`https://orgc0207390.crm.dynamics.com`).
> Agent: **Glass Box Claims Assistant** (Sara). Tables already built + verified.

## Schema quick-reference (use these EXACT names)

**Policy** — table `crcce_policy` (entity set `crcce_policies`):
| Purpose | Logical name |
|---|---|
| Policy number (primary, filter on this) | `crcce_policynumber` |
| Holder name | `crcce_policyholdername` |
| Vehicle | `crcce_vehicledescription` |
| State | `crcce_statecode` |
| Status text ("Active"/"Expired") | `crcce_policystatusname` |
| Row GUID (primary key) | `crcce_policyid` |

**Claim** — table `gbx_claim` (entity set `gbx_claims`):
| Purpose | Logical name | Notes |
|---|---|---|
| Claim # (primary, AUTONUMBER) | `gbx_claim_id` | do NOT set — auto-generated `CLM-{yyyy}-{0001}` |
| Policy lookup | `gbx_policyid` | bind `gbx_PolicyId@odata.bind = /crcce_policies(<guid>)` |
| Channel (choice) | `gbx_channel` | Web=10001, MobileApp=10000 |
| Loss type (choice) | `gbx_loss_type` | Collision=10000, Comp-Weather=10001 … UM-UIM=10010 |
| Sub type (text) | `gbx_sub_type` | e.g. "Rear-ended" |
| Incident date | `gbx_incident_date` | |
| Incident state (text) | `gbx_incident_state` | |
| Location (text) | `gbx_location` | |
| Description (memo) | `gbx_description` | the narrative |
| Loss-type details JSON (memo) | `gbx_loss_type_details` | |
| VIN (text) | `gbx_vin` | |
| Injury flag (bool) | `gbx_injury_flag` | |
| Status (choice) | `gbx_status` | New=10000, Processing=10001 |

**Decision Rationale** — table `gbx_decisionrationale` (entity set `gbx_decisionrationales`):
| Purpose | Logical name | Notes |
|---|---|---|
| Log # (primary, AUTONUMBER) | `gbx_log_id` | do NOT set |
| Claim lookup | `gbx_claimid` | bind `gbx_ClaimId@odata.bind = /gbx_claims(<guid>)` |
| Agent (choice) | `gbx_agent_name` | Intake=10000, Policy=10002, Adjudication=10004 |
| Action (text 255) | `gbx_action` | short verb phrase |
| Policy reference (text) | `gbx_policy_reference` | |
| Data points JSON (memo) | `gbx_data_points` | |
| Adapter status (choice) | `gbx_adapter_status` | Live=10000, Sandbox=10001, NotApplicable=10002 |
| Human-readable explanation (memo) | `gbx_human_readable_explanation` | the plain-English Glass Box line |
| Timestamp | `gbx_timestamp` | |

---

## 1 — GlassBox-GetPolicy (read flow, foundation)

**Goal:** input a policy number → return holder, vehicle, status, state, and the policy row GUID.
Reused by the greeting (section 2) and CreateClaim (section 3).

Build it **from inside Copilot Studio** so the Copilot trigger/response are scaffolded for you.

1. Copilot Studio → environment **GlassBox-Dev** → open agent **Glass Box Claims Assistant**.
2. Top tabs → **Tools** → **+ Add a tool** → **New tool** → **Flow**. (Opens Power Automate with a
   "Run a flow from Copilot" trigger + a "Respond to Copilot" action already placed.)
3. Rename the flow (top-left title) → **GlassBox-GetPolicy**.
4. **Trigger** ("When Copilot Studio calls a flow / Run a flow from Copilot") → **+ Add an input**
   → **Text** → name it `policyNumber`.
5. **+ New step** → search **Microsoft Dataverse** → action **List rows**.
   - **Table name**: *Policies* (`crcce_policy`).
   - Expand **Advanced parameters** → **Filter rows**:
     `crcce_policynumber eq '@{triggerBody()['text']}'`
     *(use the dynamic-content token for `policyNumber`; the literal must be wrapped in single quotes)*.
   - **Row count**: `1`.
6. **+ New step** → **Compose** (optional but recommended) named `PolicyRow` →
   value = `@{first(outputs('List_rows')?['body/value'])}`. Lets later steps read one record
   cleanly. *(If you skip Compose, reference `first(...)` inline instead.)*
7. The terminal **Respond to Copilot** action → **+ Add an output** for each (type **Text**):
   | Output name | Value (dynamic / expression) |
   |---|---|
   | `holderName` | `@{outputs('PolicyRow')?['crcce_policyholdername']}` |
   | `vehicle` | `@{outputs('PolicyRow')?['crcce_vehicledescription']}` |
   | `status` | `@{outputs('PolicyRow')?['crcce_policystatusname']}` |
   | `state` | `@{outputs('PolicyRow')?['crcce_statecode']}` |
   | `policyGuid` | `@{outputs('PolicyRow')?['crcce_policyid']}` |
   | `found` | `@{greater(length(outputs('List_rows')?['body/value']), 0)}` |
8. **Save**.
9. **TEST (in Power Automate):** Test → Manually → `policyNumber = POL-2026-0847` → Run.
   **Expect:** `holderName = Sarah Chen`, `vehicle = 2022 Honda Civic`, `status = Active`,
   `found = true`. Then test `POL-2026-0998` → `Amanda Williams / Expired`.
   Then `POL-9999-9999` (bogus) → `found = false`.

**Gate:** all three test runs behave correctly before moving on.

---

## 2 — Conversation Start greeting (the front door, Stage 1–2)

**Goal:** the moment the chat opens, Sara looks up the policy from `Global.policyNumber`, greets by
name + vehicle, gives the 911 safety line, and asks the open question — **without asking who they are.**

1. In the agent → **Topics** tab → if system topics are hidden, toggle **… → Show system topics**.
   Open **Conversation Start** (a.k.a. "Greeting"). *(If your tenant doesn't expose an editable
   Conversation Start, create a topic named `FNOL_Greeting` with trigger type **Activity received /
   Conversation start** instead — same nodes below.)*
2. **First node — set the test identity.** Add **Variable management → Set a variable value**:
   - Variable: create **Global** variable `Global.policyNumber` (scope = Global so the app can seed it).
   - Value: `POL-2026-0847` **(TEMPORARY — for test-pane only).** In production the embed sets this;
     leave a comment node saying so.
3. **Call the lookup.** Add node **→ Add an action** (or "Call an action") → choose **GlassBox-GetPolicy**.
   - Input `policyNumber` = `Global.policyNumber`.
   - It returns `holderName`, `vehicle`, `status`, `found`, `policyGuid` → store into `Global.*`
     variables of the same name if prompted.
4. **Branch on found.** Add **Condition**: `Topic.found = true` (or the GetPolicy `found` output).
   - **TRUE branch → Condition on status:**
     - If `status = "Active"` → **Message** node (the proactive greeting):
       > `Hi {Topic.holderName} 👋 — I can see you're covered on your {Topic.vehicle}, and your policy is active.`
       > `I hope you're okay. ⚠️ If you or anyone else is hurt, please call 911 first.`
       > `Whenever you're ready — what would you like to report today?`
     - **Else (Expired/Cancelled/Lapsed)** → **Message** node (denial-aware):
       > `Hi {Topic.holderName} — I'm looking at your {Topic.vehicle}, but your policy shows as {Topic.status}.`
       > `I can't start a new claim on an inactive policy, but let me connect you with someone who can help with your coverage.`
       > *(later: route to live-agent handoff)*
   - **FALSE branch (not found)** → Message:
     > `I'm having trouble pulling up your policy details — let me get a teammate to help you.`
5. After the Active greeting message, end the topic (the customer's free-text answer will be picked up
   by the FNOL intake topic in Phase 3; for now, generative answering handles follow-ups).
6. **Save**.
7. **TEST (test pane):** open the test pane → start a new conversation. **Expect Sara to speak first:**
   *"Hi Sarah 👋 — I can see you're covered on your 2022 Honda Civic, and your policy is active… what
   would you like to report today?"* — with **no** "what's your policy number?" prompt.
   Then change the section-2 step-2 value to `POL-2026-0998`, save, retest → the **Expired** path fires.

**Gate:** Sara greets by name + vehicle + safety line proactively, both Active and Expired paths.
**The Hello World milestone is now "Sara speaks first."**

---

## 3 — GlassBox-CreateClaim (write flow, Stage 6)

**Goal:** Sara *calls* this (never writes the table directly) → a real `gbx_claim` row is written →
returns the claim number. This is the service-layer differentiator (ADR 2026-06-02).

1. Copilot Studio → **Tools → + Add a tool → New tool → Flow** → rename **GlassBox-CreateClaim**.
2. **Trigger inputs** (all **Text** unless noted) — the minimum FNOL set:
   `policyNumber`, `channel` (default "Web"), `lossType` (e.g. "Collision"), `subType`,
   `incidentDate`, `incidentState`, `location`, `description`, `vin`, `injuryFlag` (Yes/No → Boolean).
3. **Resolve the policy GUID:** Dataverse **List rows** on *Policies*, filter
   `crcce_policynumber eq '@{triggerBody()['text']}'` (the `policyNumber` token), Row count `1`.
   Add a **Compose** `PolicyRow = first(outputs('List_rows')?['body/value'])`.
4. **Map lossType → choice int** (Add a row needs the integer). Add a **Switch** on `lossType`, or a
   single **Compose** `lossTypeInt` using nested if(), mapping:
   `Collision→10000, Comp-Weather→10001, Comp-Theft→10002, Comp-Vandalism→10003, Comp-Fire→10004,`
   `Comp-Animal→10005, Comp-Glass→10006, Liab-PD→10007, Liab-BI→10008, PIP-MedPay→10009, UM-UIM→10010`.
   Likewise `channelInt` (Web→10001, MobileApp→10000, Teams→10002, Email→10003, SMS→10004).
5. **Dataverse → Add a new row** → table *Claims* (`gbx_claim`):
   | Field (UI label) | Value |
   |---|---|
   | Policy (Policies) — `gbx_PolicyId` | `@{outputs('PolicyRow')?['crcce_policyid']}` |
   | Channel — `gbx_channel` | `@{outputs('channelInt')}` |
   | Loss type — `gbx_loss_type` | `@{outputs('lossTypeInt')}` |
   | Sub type — `gbx_sub_type` | `subType` |
   | Incident date — `gbx_incident_date` | `incidentDate` |
   | Incident state — `gbx_incident_state` | `incidentState` |
   | Location — `gbx_location` | `location` |
   | Description — `gbx_description` | `description` |
   | VIN — `gbx_vin` | `vin` |
   | Injury flag — `gbx_injury_flag` | `injuryFlag` |
   | Status — `gbx_status` | `10000` (New) |
   *(Leave `gbx_claim_id` blank — the autonumber fills it.)*
6. **Respond to Copilot** → outputs (Text): `claimId = @{outputs('Add_a_new_row')?['body/gbx_claim_id']}`,
   `claimGuid = @{outputs('Add_a_new_row')?['body/gbx_claimid']}`.
7. **Save → TEST:** Test → Manually → fill inputs (policy `POL-2026-0847`, lossType `Collision`,
   subType `Rear-ended`, etc.) → Run. **Expect:** a `claimId` like `CLM-2026-0001` returned.
8. **Verify in Dataverse:** make.powerapps.com → Tables → Claims → Data → the new row exists with the
   Policy linked to Sarah Chen. ✅ **A real claim now exists.**

---

## 4 — GlassBox-LogDecision (write flow, the Glass Box audit, Stage 6)

**Goal:** write one `gbx_decisionrationale` row linked to a claim — the plain-English audit entry.

1. Copilot Studio → **Tools → + Add a tool → New tool → Flow** → rename **GlassBox-LogDecision**.
2. **Trigger inputs** (Text): `claimGuid`, `agentName` (e.g. "Intake"), `action`, `policyReference`,
   `dataPointsJson`, `explanation`, `adapterStatus` (default "NotApplicable").
3. **Map agentName → choice int** (Compose `agentInt`): `Intake→10000, Extraction→10001, Policy→10002,`
   `Validation→10003, Adjudication→10004, Explanation→10005, Notification→10006, Adjuster→10007,`
   `AssignmentEngine→10008, VendorEngine→10009`. And `adapterInt` (Live→10000, Sandbox→10001, NotApplicable→10002).
4. **Dataverse → Add a new row** → table *Decision Rationales* (`gbx_decisionrationale`):
   | Field | Value |
   |---|---|
   | Claim (Claims) — `gbx_ClaimId` | `@{triggerBody()['claimGuid']}` (the GUID) |
   | Agent name — `gbx_agent_name` | `@{outputs('agentInt')}` |
   | Action — `gbx_action` | `action` |
   | Policy reference — `gbx_policy_reference` | `policyReference` |
   | Data points (JSON) — `gbx_data_points` | `dataPointsJson` |
   | Adapter status — `gbx_adapter_status` | `@{outputs('adapterInt')}` |
   | Human readable explanation — `gbx_human_readable_explanation` | `explanation` |
   | Timestamp — `gbx_timestamp` | `@{utcNow()}` |
5. **Respond to Copilot** → `logId = @{outputs('Add_a_new_row')?['body/gbx_log_id']}`.
6. **Save → TEST:** use the `claimGuid` from section 3's test; agentName `Intake`, action
   `Claim created`, explanation *"FNOL captured for POL-2026-0847, Collision/Rear-ended; policy active,
   no injuries reported."* → Run. **Expect** a `logId` like `LOG-2026-0000001`.
7. **Verify:** Tables → Decision Rationales → Data → the row exists, linked to the claim. ✅
   **The Glass Box now has its first real audit entry.**

---

## After all 4 sections: wire them into the conversation (Phase 3 preview)

These flows are now **Tools** Sara can call. Phase 3 builds the `FNOL_Start` intake topic that, at the
end of intake, calls **GlassBox-CreateClaim** then **GlassBox-LogDecision** — so the full path
"greeting → questions → real claim → real audit row" runs in one conversation. Not in this session.

## Test scenarios (the two demo policies)
- **Happy path** — `POL-2026-0847` Sarah Chen / 2022 Honda Civic / **Active** / CA → greeting → claim.
- **Denial path** — `POL-2026-0998` Amanda Williams / 2019 Chevrolet Malibu / **Expired** / OH → blocked.
