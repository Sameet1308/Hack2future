# Flow 01 — GlassBox-CreateClaim (service-layer WRITE)

**What this flow does:** Sara *calls* this flow (never writes Dataverse herself) → it resolves the policy GUID, maps the loss-type / channel text to choice integers, writes one real `gbx_claim` row, and returns the auto-generated claim number + the new row GUID.

**Why it matters for the demo:** this is the service-layer chokepoint (ADR 2026-06-02) — the single governed place a claim gets created, so web / SMS / Teams / email all produce an identical row and an identical audit format. A real `CLM-2026-000x` appearing in Dataverse, linked to Sarah Chen, is Stage 6 of `end_to_end_flow.md` made real.

> Environment: **GlassBox-Dev** (`https://orgc0207390.crm.dynamics.com`).
> Agent: **Glass Box Claims Assistant** (Sara). Build this flow from **inside Copilot Studio** so the agent trigger + response are scaffolded for you.
> Prereq: `GlassBox-GetPolicy` and the proactive Greeting topic already exist (Runbook 03). This flow is independent of them — it does its own policy lookup — but follows the same build pattern.

---

## Schema this flow touches (EXACT logical names — never guess)

**Policy** — table `crcce_policy` (entity set `crcce_policies`):
| Purpose | Logical name |
|---|---|
| Policy number (primary, filter on this) | `crcce_policynumber` |
| Holder name | `crcce_policyholdername` |
| Row GUID (primary key) | `crcce_policyid` |

**Claim** — table `gbx_claim` (entity set `gbx_claims`):
| Purpose | Logical name | Notes |
|---|---|---|
| Claim # (primary, AUTONUMBER) | `gbx_claim_id` | **never set** — fills `CLM-{yyyy}-{0001}` automatically |
| Row GUID (primary key) | `gbx_claimid` | returned to the caller |
| Policy lookup | `gbx_policyid` | set via `gbx_PolicyId@odata.bind = /crcce_policies(<guid>)` |
| Channel (choice) | `gbx_channel` | integer — MobileApp=10000, Web=10001, Teams=10002, Email=10003, SMS=10004, WhatsApp=10005 |
| Loss type (choice) | `gbx_loss_type` | integer — see the 11-value map below |
| Sub type (text) | `gbx_sub_type` | |
| Incident date | `gbx_incident_date` | set to `utcNow()` at create time |
| Incident state (text) | `gbx_incident_state` | |
| Location (text) | `gbx_location` | optional |
| Description (memo) | `gbx_description` | the narrative |
| VIN (text) | `gbx_vin` | optional |
| Injury flag (bool) | `gbx_injury_flag` | Yes/No |
| Status (choice) | `gbx_status` | integer — **New = 10000** at creation |

---

## Inputs (on the agent trigger)

Add these on the **"When an agent calls the flow"** trigger via **+ Add an input**. Type **Text** unless noted.

| Input name | Type | Required | Default | Example |
|---|---|---|---|---|
| `policyNumber` | Text | yes | — | `POL-2026-0847` |
| `lossType` | Text | yes | — | `Collision` / `Comp-Weather` |
| `subType` | Text | yes | — | `Rear-ended` |
| `incidentState` | Text | yes | — | `CA` |
| `description` | Text | yes | — | `Rear-ended at a red light on Main St.` |
| `injuryFlag` | **Yes/No** (boolean) | yes | — | `No` |
| `channel` | Text | no | `Web` | `Web` |
| `location` | Text | no | *(empty)* | `Main St & 4th Ave, San Jose` |
| `vin` | Text | no | *(empty)* | `2HGFC2F69NH500123` |

> **Defaults:** the agent-flow input editor lets you mark an input optional and type a default value (`Web` for `channel`). If your tenant's editor doesn't expose a default field, leave it required and have the calling topic always pass `channel` — the Greeting/FNOL topic will. Steps below handle an empty `channel` safely anyway (the `channelInt` expression falls back to `10001` = Web).

---

## Build — step by step (click exactly this)

### Step 0 — Create the flow
1. Copilot Studio → environment **GlassBox-Dev** → open agent **Glass Box Claims Assistant**.
2. Top tabs → **Tools** → **+ Add a tool** → **New tool** → **Workflows**. (There is **no** "Flow" tile anymore. This scaffolds a *"When an agent calls the flow"* trigger and a *"Respond to the agent"* action.)
3. Rename the flow (top-left title) → **GlassBox-CreateClaim**.
4. On the **trigger**, add the 9 inputs from the table above (**+ Add an input** → pick the type → name it). Spell the names **exactly** — they become the dynamic-content chips you reference below.

**You should see:** a trigger card listing 9 inputs, and an empty *"Respond to the agent"* card at the bottom.

---

### Step 1 — Resolve the policy GUID (Dataverse List rows)

> The in-product Copilot **cannot** add Dataverse actions ("connector not found"). Add it **manually**.

1. Between the trigger and the response, click **+** → **Add an action** → search **Microsoft Dataverse** → **List rows**.
2. **Table name**: *Policies* (`crcce_policy`).
3. Expand **Advanced parameters** → **Filter rows**. Type the word `eq`, then insert the `policyNumber` chip wrapped in single quotes. The field must read:

   ```
   crcce_policynumber eq '<policyNumber>'
   ```

   where `<policyNumber>` is the **dynamic-content chip** for the trigger input (not the literal text). The single quotes are literal characters you type; the chip sits between them. In raw expression form this is:

   ```
   crcce_policynumber eq '@{triggerBody()['text']}'
   ```
4. **Row count**: `1`.
5. Rename this action (⋯ → Rename) to **List_rows_Policy** so the expressions below match. (If you leave the default name `List_rows`, change every `List_rows_Policy` below to `List_rows`.)

**You should see:** a Dataverse *List rows* card with the OData filter and Row count = 1.

---

### Step 2 — Capture the one policy row (Compose `PolicyRow`)

1. **+** → **Add an action** → **Compose**. Rename it **PolicyRow**.
2. **Inputs** = (switch to expression / fx and paste):

   ```
   first(outputs('List_rows_Policy')?['body/value'])
   ```

This grabs the single matched record without an Apply-to-each loop, so later steps read its columns cleanly as `outputs('PolicyRow')?['<column>']`.

**You should see:** a *Compose* card named **PolicyRow** with that `first(...)` expression.

---

### Step 3 — Map `lossType` text → choice integer (Compose `lossTypeInt`)

`Add a new row` needs the **integer** for choice columns, not the label. Add a single Compose using a nested `if()`.

1. **+** → **Add an action** → **Compose**. Rename it **lossTypeInt**.
2. **Inputs** = (fx) — paste this **exact** expression. It maps all 11 loss types; an unknown value falls back to Collision (`10000`):

   ```
   if(equals(triggerBody()['lossType'],'Collision'),10000,if(equals(triggerBody()['lossType'],'Comp-Weather'),10001,if(equals(triggerBody()['lossType'],'Comp-Theft'),10002,if(equals(triggerBody()['lossType'],'Comp-Vandalism'),10003,if(equals(triggerBody()['lossType'],'Comp-Fire'),10004,if(equals(triggerBody()['lossType'],'Comp-Animal'),10005,if(equals(triggerBody()['lossType'],'Comp-Glass'),10006,if(equals(triggerBody()['lossType'],'Liab-PD'),10007,if(equals(triggerBody()['lossType'],'Liab-BI'),10008,if(equals(triggerBody()['lossType'],'PIP-MedPay'),10009,if(equals(triggerBody()['lossType'],'UM-UIM'),10010,10000)))))))))))
   ```

   > **Note on the chip name:** the trigger stores inputs by their declared name. If your tenant exposes inputs as `triggerBody()['text']`, `triggerBody()['text_1']`, … instead of `triggerBody()['lossType']`, build the expression by inserting the **dynamic-content chip for `lossType`** in place of each `triggerBody()['lossType']`. The logic (the nested `if`) is identical. Count the parentheses: **eleven** `if(` openers, **eleven** `)` closers at the end.

**You should see:** a *Compose* named **lossTypeInt**.

---

### Step 4 — Map `channel` text → choice integer (Compose `channelInt`)

1. **+** → **Add an action** → **Compose**. Rename it **channelInt**.
2. **Inputs** = (fx) — paste this **exact** expression. Empty/unknown channel falls back to Web (`10001`):

   ```
   if(equals(triggerBody()['channel'],'MobileApp'),10000,if(equals(triggerBody()['channel'],'Web'),10001,if(equals(triggerBody()['channel'],'Teams'),10002,if(equals(triggerBody()['channel'],'Email'),10003,if(equals(triggerBody()['channel'],'SMS'),10004,if(equals(triggerBody()['channel'],'WhatsApp'),10005,10001))))))
   ```

   > Same chip-name caveat as Step 3 — swap `triggerBody()['channel']` for the `channel` dynamic-content chip if your tenant names it differently. **Six** `if(` openers, **six** `)` closers.

**You should see:** a *Compose* named **channelInt**.

---

### Step 5 — Write the claim (Dataverse: Add a new row)

1. **+** → **Add an action** → search **Microsoft Dataverse** → **Add a new row**.
2. **Table name**: *Claims* (`gbx_claim`).
3. Fill the fields below. For each, click the field, then either pick the dynamic-content chip or switch to fx and paste the expression. **Leave `Claim ID` (`gbx_claim_id`) blank** — the autonumber fills it.

| Field (UI label) | Logical name | Value to enter |
|---|---|---|
| Policy (Policies) | `gbx_PolicyId` | chip → **PolicyRow** then `crcce_policyid`, i.e. fx `@{outputs('PolicyRow')?['crcce_policyid']}` |
| Channel | `gbx_channel` | fx `@{outputs('channelInt')}` |
| Loss type | `gbx_loss_type` | fx `@{outputs('lossTypeInt')}` |
| Status | `gbx_status` | `10000` *(New — type the literal integer)* |
| Sub type | `gbx_sub_type` | chip **subType** |
| Incident date | `gbx_incident_date` | fx `@{utcNow()}` |
| Incident state | `gbx_incident_state` | chip **incidentState** |
| Description | `gbx_description` | chip **description** |
| Injury flag | `gbx_injury_flag` | chip **injuryFlag** (Yes/No) |
| Location | `gbx_location` | chip **location** *(optional — leave blank if no value)* |
| VIN | `gbx_vin` | chip **vin** *(optional)* |

> **Lookup mechanics:** the *Policy (Policies)* field expects the related **policy row GUID** (what you pasted). Behind the scenes the connector emits `gbx_PolicyId@odata.bind = /crcce_policies(<guid>)` — you do **not** type that string; you just give it the GUID and pick the *Policies* target table if prompted.
>
> **Choice = integer:** `gbx_channel`, `gbx_loss_type`, `gbx_status` all take the **integer** (10000-series), never the text label. That's why Steps 3–4 exist.

4. Rename this action to **Add_claim_row** (⋯ → Rename) so Step 6 matches.

**You should see:** an *Add a new row* card on **Claims** with Policy, Channel, Loss type, Status and the mapped text fields populated; Claim ID empty.

---

### Step 6 — Return the claim number + GUID (Respond to the agent)

1. Select the terminal **Respond to the agent** card.
2. **+ Add an output** (type **Text**) twice:

| Output name | Value (fx) |
|---|---|
| `claimId` | `@{outputs('Add_claim_row')?['body/gbx_claim_id']}` |
| `claimGuid` | `@{outputs('Add_claim_row')?['body/gbx_claimid']}` |

> `claimGuid` is the row's primary-key GUID — the next flow, **GlassBox-LogDecision**, needs it to bind the audit row to this claim (`gbx_ClaimId@odata.bind = /gbx_claims(<claimGuid>)`).

3. **Save** (top right). If prompted, **Publish** the flow so the agent can call it as a tool.

**You should see:** *Respond to the agent* listing two outputs `claimId` and `claimGuid`; a green "Saved" toast.

---

## Test

### Test A — happy path (Active policy)
1. In Power Automate: **Test → Manually → Save & Test** (or **Test** → *Manually* → **Test**).
2. Fill inputs:
   - `policyNumber` = `POL-2026-0847`
   - `lossType` = `Collision`
   - `subType` = `Rear-ended`
   - `incidentState` = `CA`
   - `description` = `Rear-ended at a red light on Main St.`
   - `injuryFlag` = **No**
   - `channel` = `Web`
   - `location` = `Main St & 4th Ave, San Jose`
   - `vin` = *(leave blank)*
3. **Run.**

**Expect:**
- Flow status **Succeeded** (all 6 actions green).
- **List_rows_Policy** returns exactly **1** row (Sarah Chen).
- **lossTypeInt** output = `10000`; **channelInt** output = `10001`.
- **Respond to the agent** returns `claimId` like **`CLM-2026-0001`** (number increments each run) and a `claimGuid` GUID.

### Verify in Dataverse
4. make.powerapps.com → **Tables → Claims → Data**. The new row exists with:
   - **Claim ID** = `CLM-2026-000x`
   - **Policy** = linked to **Sarah Chen** (POL-2026-0847)
   - **Channel** = *Web*, **Loss type** = *Collision*, **Status** = *New*, **Injury flag** = *No*
   - **Incident date** ≈ now (UTC).

✅ **A real claim now exists, written through the service layer.**

### Test B — different loss type / channel (mapping check)
Run again with `lossType` = `Comp-Weather`, `channel` = `MobileApp` → expect `lossTypeInt` = `10001`, `channelInt` = `10000`, a new `CLM-2026-000x`, Loss type = *Comp-Weather*, Channel = *MobileApp* on the row.

### Optional — independent smoke test (no portal)
`scripts/smoke_create_claim.py` does the **same three operations** (lookup → map → Add row) straight against the Dataverse Web API using your `az login` token. Run it to seed a demo claim or to confirm the schema/bindings without opening the flow:

```
az login          # if not already
python scripts/smoke_create_claim.py --policy POL-2026-0847 --loss Collision --sub "Rear-ended" --state CA --desc "Rear-ended at a red light." --injury false
```
Expect it to print the new `claimId` (`CLM-2026-000x`) + `claimGuid`. (Add `--delete` to clean up the row it creates.)

---

## Gotchas

- **Choice columns take the integer, not the label.** Setting `gbx_loss_type` = `"Collision"` fails or silently mis-maps. Always feed the 10000-series int (Steps 3–4 produce it). To read a choice *back* as text you'd need the annotation `gbx_loss_type@OData.Community.Display.V1.FormattedValue` — not needed here, but that's the rule (it bit us on policy status).
- **Never set `gbx_claim_id`.** It's an autonumber (`CLM-{yyyy}-{0001}`). Setting it errors. Leave it blank; read it from the response after the row is created.
- **Copilot can't add Dataverse actions** ("connector not found"). Add *List rows* and *Add a new row* manually via **+ → Add an action → search "Dataverse"**.
- **Filter rows is OData, value in single quotes.** `crcce_policynumber eq '<chip>'` — the word `eq`, the chip wrapped in literal `'…'`. Row count `1` for a single record.
- **`first(...)` avoids Apply-to-each.** Reading a List-rows field directly forces a loop; `first(outputs('List_rows_Policy')?['body/value'])?['col']` reads the one row inline.
- **Lookup = give the GUID, not the @odata.bind string.** The connector's *Policy (Policies)* field wants the policy row GUID (`crcce_policyid`); it constructs `gbx_PolicyId@odata.bind` itself.
- **Input chip names may not be your declared names.** Some tenants expose trigger inputs as `triggerBody()['text']`, `['text_1']`, … Always insert the **dynamic-content chip** for the input rather than hand-typing `triggerBody()['lossType']`; the nested-`if` logic is unchanged.
- **Parenthesis count.** lossTypeInt = 11 `if(` / 11 `)`; channelInt = 6 `if(` / 6 `)`. A mismatch is the usual "expression is invalid" cause — copy them verbatim.
- **Save then Publish.** A saved-but-unpublished flow may not appear to the agent as a callable tool. If the agent says it can't find the tool, publish.
- **This flow does NOT write the audit row.** Per ADR 2026-06-02, audit logging is a separate service call — the calling topic invokes **GlassBox-LogDecision** with the returned `claimGuid` right after this flow succeeds (Flow 02). One claim write here, one Glass-Box row there.
