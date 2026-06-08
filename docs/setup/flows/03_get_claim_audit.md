# Runbook 03 — GlassBox-GetClaimAudit (READ flow for the frontend / Theater)

> **What this flow does:** Given a claim (its number `CLM-2026-0001` or its row GUID), it returns
> the ordered Glass Box audit trail — every `gbx_decisionrationale` row for that claim — as a clean
> JSON array the React app can render directly.
>
> **Why it matters for the demo:** This is the wire that turns Theater Mode from a canned animation
> into the *real* Glass Box. The handler Theater and customer Processing screens poll this URL and
> replay the actual agent decisions that were logged to Dataverse. Same audit trail the regulators
> would read — shown live on screen.

Environment: **GlassBox-Dev** (`https://orgc0207390.crm.dynamics.com`).
This URL goes into the frontend `.env` as **`VITE_CLAIM_AUDIT_URL`** (already referenced in
`frontend/src/config.js`).

> ⚠️ **This is NOT an agent flow.** Build it as a standalone **cloud flow** with an **HTTP request
> trigger**, because the React app fetches it over HTTPS — Sara never calls it. Build it in
> **Power Automate** (`make.powerautomate.com`), *not* from inside Copilot Studio.

---

## Schema quick-reference (use these EXACT names)

**Decision Rationale** — table `gbx_decisionrationale` (entity set `gbx_decisionrationales`):

| Purpose | Logical name | Notes |
|---|---|---|
| Log # (primary, AUTONUMBER) | `gbx_log_id` | `LOG-{yyyy}-{0000001}` |
| Claim lookup (raw GUID value) | `_gbx_claimid_value` | the foreign-key GUID column we filter on |
| Claim # (text, via related claim) | `gbx_claim_id` | on the **Claim** row, not this table — see "filter options" |
| Agent (choice) | `gbx_agent_name` | int 10000–10009; TEXT via the FormattedValue annotation |
| Action (text) | `gbx_action` | |
| Human-readable explanation (memo) | `gbx_human_readable_explanation` | the plain-English Glass Box line |
| Adapter status (choice) | `gbx_adapter_status` | Live=10000/Sandbox=10001/NotApplicable=10002; TEXT via FormattedValue |
| Flag raised (bool) | `gbx_flag_raised` | true/false |
| Latency (int) | `gbx_latency_ms` | milliseconds |
| Timestamp | `gbx_timestamp` | order by this, ascending |

**Choice text reminder (this bit us before):** an option-set's display text is **not** returned as
`gbx_agent_name`name. It comes back only via the annotation
`gbx_agent_name@OData.Community.Display.V1.FormattedValue`. To get those annotations you **must**
ask for them (see step 4's `Prefer` header / List-rows setting).

---

## Inputs

The trigger accepts **either** identifier (query string or JSON body — both work, we read query first
then fall back to body):

| Input | Example | Meaning |
|---|---|---|
| `claimGuid` | `e2b1c0a4-…` | the Claim row's GUID (**recommended** — exact, indexed) |
| `claimId` | `CLM-2026-0001` | the human claim number (convenience; we resolve it to a GUID) |

The React app passes whichever it has. The customer Processing screen and the handler Theater both
have the GUID from the CreateClaim response, so they pass `claimGuid`.

---

## Filter options — which identifier to filter on (read this before step 4)

There are two ways to fetch the right rationale rows. **We use Option A and recommend it.**

- **Option A — filter by the claim GUID (recommended).** The rationale rows carry the claim FK in the
  column `_gbx_claimid_value`. Filtering `_gbx_claimid_value eq <guid>` is a direct indexed lookup, no
  join, no ambiguity. This is what the demo uses.
  ```
  _gbx_claimid_value eq e2b1c0a4-1111-2222-3333-444455556666
  ```
  Note: a GUID in an OData `eq` is **not** quoted (it's a `guid` type, not a string).

- **Option B — filter by the claim *number* text via the related claim.** The number `gbx_claim_id`
  lives on the **Claim** table, not on the rationale rows, so you'd traverse the lookup:
  ```
  gbx_claimid/gbx_claim_id eq 'CLM-2026-0001'
  ```
  This works but requires the navigation-property traversal (`gbx_claimid/…`) and a string compare on
  every row. Slower, and easier to typo. Only use it if the caller *only* has the claim number and you
  don't want a resolve step.

**Our flow supports both:** if `claimGuid` is empty but `claimId` is present, we first List-rows the
**Claims** table to resolve the GUID, then run Option A. Clean and fast in the common case, still works
from a bare claim number.

---

## Step-by-step build

### 1 — Create the flow

1. Go to `make.powerautomate.com` → top-right environment picker → **GlassBox-Dev**.
2. Left nav → **+ Create** → **Instant cloud flow**… actually choose **Automated → skip**, then in the
   trigger search type **"When an HTTP request is received"** → select it. *(Equivalent: + Create →
   "Instant cloud flow" → in the trigger list pick **When an HTTP request is received**.)*
3. Rename the flow (top-left title) → **GlassBox-GetClaimAudit**.

**What you should see:** a single trigger card titled *"When an HTTP request is received"* with a
**"Use sample payload to generate schema"** link and a (greyed) HTTP **POST URL** field that fills in
after the first save.

### 2 — Configure the trigger

1. On the trigger card, set **Method** = **GET** (expand **Advanced parameters** → **Method** if not
   shown). GET lets the React app call it as a simple `fetch(url + '?claimGuid=...')`.
2. We read inputs from the **query string**, so no request-body schema is required. (We still also
   accept a JSON body as a fallback — handled by expressions below, not by the schema box.)
3. Leave **Who can trigger the flow** = **Any user** (the URL itself carries a SAS signature — treat it
   as a secret; it's fine in the SWA env var, not in client-visible code committed to git).

**What you should see:** Method shows **GET**. The POST URL is still blank until first save (step 8).

### 3 — Read the two inputs into variables

Add two **Initialize variable** actions right after the trigger (so later steps can reference them
uniformly).

1. **+ New step → Initialize variable**
   - **Name**: `claimGuid`
   - **Type**: `String`
   - **Value** (expression — reads query param first, then JSON body fallback):
     ```
     coalesce(triggerOutputs()?['queries']?['claimGuid'], triggerBody()?['claimGuid'], '')
     ```
2. **+ New step → Initialize variable**
   - **Name**: `claimId`
   - **Type**: `String`
   - **Value** (expression):
     ```
     coalesce(triggerOutputs()?['queries']?['claimId'], triggerBody()?['claimId'], '')
     ```

**What you should see:** two variable cards, `claimGuid` and `claimId`, both String.

### 4 — Resolve the GUID if only a claim number was given (Option B → A bridge)

Add a **Condition** so we only do the extra lookup when needed.

1. **+ New step → Condition** named `Need to resolve GUID`.
   - Left: `claimGuid` (the variable) — choose **is equal to** — Right: *(leave blank → empty string)*.
   - This is true when the caller gave us only a claim number.
2. **In the "If yes" branch** → **+ Add an action → Microsoft Dataverse → List rows**:
   - **Table name**: **Claims** (`gbx_claim`).
   - Expand **Advanced parameters** → **Filter rows**:
     ```
     gbx_claim_id eq '@{variables('claimId')}'
     ```
     *(claim number is text → single-quoted; the `@{...}` is the `claimId` variable token.)*
   - **Row count**: `1`.
   - Then **+ Add an action → Set variable**:
     - **Name**: `claimGuid`
     - **Value** (expression — pull the GUID out of the first returned Claim row):
       ```
       first(outputs('List_rows')?['body/value'])?['gbx_claimid']
       ```
   - Rename this List rows action to **List_claims** (… menu → Rename) so the expression name is
     unambiguous if you also have the rationale List rows. *(If you rename it, change `List_rows` above
     to `List_claims`.)*
3. **Leave "If no" empty** — we already have the GUID.

**What you should see:** an If-yes branch with a Dataverse **List rows** (Claims) + a **Set variable**;
an empty If-no branch.

> If your demo always passes `claimGuid` (it does — CreateClaim returns it), this whole condition is a
> no-op safety net. Keep it; it makes the endpoint robust for manual testing with a claim number.

### 5 — List the rationale rows (the actual query — Option A)

After the Condition (at the top level, not inside a branch):

1. **+ New step → Microsoft Dataverse → List rows**:
   - **Table name**: **Decision Rationales** (`gbx_decisionrationale`).
   - Expand **Advanced parameters**:
     - **Filter rows**:
       ```
       _gbx_claimid_value eq @{variables('claimGuid')}
       ```
       *(GUID type → **NOT** quoted. The `@{...}` is the `claimGuid` variable.)*
     - **Sort by**: `gbx_timestamp asc`
     - **Select columns** (keeps the payload tight + ensures the columns exist):
       ```
       gbx_log_id,gbx_agent_name,gbx_action,gbx_human_readable_explanation,gbx_adapter_status,gbx_flag_raised,gbx_latency_ms,gbx_timestamp
       ```
     - **Row count**: `200` (a single claim never has more than a few dozen rows; 200 is safe headroom).
2. **Rename this action to `List_rationale`** (… → Rename) — the Select map below references it by name.

> **Choice TEXT (critical):** the Dataverse "List rows" action returns FormattedValue annotations
> automatically for choice columns when you reference them via
> `…@OData.Community.Display.V1.FormattedValue` in the Select (step 6). You do **not** need a manual
> `Prefer` header here — the connector requests annotations by default. If your tenant strips them,
> add the trigger-independent fix: on **List_rationale → Settings → add header**
> `Prefer: odata.include-annotations="*"`. Verify in the test run (step 9) that the FormattedValue keys
> are present before wiring the frontend.

**What you should see:** a **List_rationale** card with Filter rows, Sort, Select columns all set.

### 6 — Shape the clean JSON array (Select action)

1. **+ New step → Data Operation → Select**.
2. **From**: expression
   ```
   outputs('List_rationale')?['body/value']
   ```
3. Switch the **Map** to **text mode** (the small `</>` / "Switch to text mode" toggle at the right of
   the Map box) and paste **exactly** this map. Each `item()?[...]` reads one rationale row; the
   FormattedValue keys give the choice TEXT:
   ```json
   {
     "logId": "@{item()?['gbx_log_id']}",
     "agent": "@{item()?['gbx_agent_name@OData.Community.Display.V1.FormattedValue']}",
     "action": "@{item()?['gbx_action']}",
     "explanation": "@{item()?['gbx_human_readable_explanation']}",
     "adapterStatus": "@{item()?['gbx_adapter_status@OData.Community.Display.V1.FormattedValue']}",
     "flagRaised": "@{coalesce(item()?['gbx_flag_raised'], false)}",
     "latencyMs": "@{coalesce(item()?['gbx_latency_ms'], 0)}",
     "timestamp": "@{item()?['gbx_timestamp']}"
   }
   ```
   - `agent` → the FormattedValue gives `"Intake"`, `"Adjudication"`, etc. (the text, not `10000`).
   - `adapterStatus` → `"Live"` / `"Sandbox"` / `"NotApplicable"` (text).
   - `flagRaised` / `latencyMs` use `coalesce(..., default)` so a null never breaks the JSON.

> **One numeric/boolean caveat:** Select in text mode emits every value as a **string** (because of the
> `"@{...}"` quoting). `flagRaised` becomes `"true"`/`"false"` and `latencyMs` becomes `"320"`. The
> frontend coerces these (`=== 'true'`, `Number(...)`) — see the `claimAudit.js` client we ship. If you
> want true JSON types instead, build the array with a **Compose** using an expression body where the
> bool/int aren't wrapped in quotes; for the demo the string form is fine and simpler.

**What you should see:** a **Select** card; in text mode the Map box shows the JSON above.

### 7 — Respond 200 with the JSON (+ CORS headers)

1. **+ New step → Request → Response** (the "Response" action from the Request connector).
2. **Status Code**: `200`.
3. **Headers** (switch to text/raw if offered; otherwise add rows). Add these three:
   | Key | Value |
   |---|---|
   | `Content-Type` | `application/json` |
   | `Access-Control-Allow-Origin` | `*` *(demo)* — or your SWA origin, e.g. `https://glassbox-ai.azurestaticapps.net` (preferred for prod) |
   | `Access-Control-Allow-Methods` | `GET, OPTIONS` |
4. **Body**: expression
   ```
   body('Select')
   ```
   *(the Select output is already an array of objects — bind the whole thing, not a string).*

**What you should see:** a **Response** card, 200, three headers, Body = `Select` output.

> **CORS — pick one (both documented):**
> 1. **Header approach (above):** the simplest. `Access-Control-Allow-Origin` lets the browser at the
>    SWA origin read the response. Use `*` for the demo; lock to the exact SWA origin for production.
>    Browsers may also fire a **preflight `OPTIONS`** request first — the HTTP trigger answers GET, not
>    OPTIONS, so a strict preflight can 404. Mitigate by having the frontend send a *simple* GET (no
>    custom headers, no `Content-Type` on the request) which **skips** preflight. Our `claimAudit.js`
>    does exactly that.
> 2. **SWA api-proxy approach (recommended for production, avoids CORS entirely):** put the flow URL in
>    SWA app settings as a backend and route `/api/claim-audit` to it, OR add a tiny SWA managed
>    function that server-side `fetch`es the flow URL (so the secret SAS URL never reaches the browser
>    and the request is same-origin → no CORS). For the hackathon demo, the header approach is enough;
>    note the proxy as the production hardening step.

### 8 — Save, grab the URL

1. **Save** (top-right). The trigger's **HTTP GET URL** now populates — it looks like:
   ```
   https://<region>.azure-apim.net/.../workflows/<id>/triggers/manual/paths/invoke?api-version=2016-06-01&sp=...&sv=...&sig=<signature>
   ```
2. Copy it. Put it in the frontend env file (NOT committed):
   ```
   # frontend/.env.local
   VITE_CLAIM_AUDIT_URL=https://<region>.azure-apim.net/.../invoke?api-version=2016-06-01&sp=...&sig=...
   ```
   `frontend/src/config.js` already exposes it as `CLAIM_AUDIT_URL`.

**What you should see:** a long signed URL in the trigger card. Treat it as a secret.

---

## Test

### A — Test inside Power Automate (no claim needed beyond one real row)

1. First make sure **at least one** `gbx_decisionrationale` row exists for a real claim (the
   `GlassBox-LogDecision` runbook §4 test creates `LOG-2026-0000001` against a claim). Grab that
   claim's GUID from `make.powerapps.com → Tables → Claims → Data` (open the row → copy the GUID from
   the URL, the part after `id=`).
2. In the flow → **Test → Manually → Save & Test**, then call the URL in a browser/Postman:
   ```
   <the GET URL>&claimGuid=<that-claim-guid>
   ```
   (append `&claimGuid=...` to the signed URL).
3. **Expected 200 response** (shape — values from your real rows):
   ```json
   [
     {
       "logId": "LOG-2026-0000001",
       "agent": "Intake",
       "action": "Claim created",
       "explanation": "FNOL captured for POL-2026-0847, Collision/Rear-ended; policy active, no injuries reported.",
       "adapterStatus": "NotApplicable",
       "flagRaised": "false",
       "latencyMs": "0",
       "timestamp": "2026-06-08T15:04:11Z"
     }
   ]
   ```
4. **Resolve-by-number test:** call with `&claimId=CLM-2026-0001` (and NO `claimGuid`). Expect the same
   array — the Condition resolved the GUID first.
5. **Empty test:** call with a bogus `&claimGuid=00000000-0000-0000-0000-000000000000`. Expect `200`
   with an empty array `[]` (not an error).

### B — Verify the choice TEXT came through

In the test run details, open **List_rationale → Show raw outputs** and confirm each row has
`gbx_agent_name@OData.Community.Display.V1.FormattedValue` and
`gbx_adapter_status@OData.Community.Display.V1.FormattedValue`. If those keys are **missing**, the
`agent`/`adapterStatus` fields will be blank → add the `Prefer: odata.include-annotations="*"` header
from step 5's note and re-test.

### C — Verify from the frontend

1. Put the URL in `frontend/.env.local` as `VITE_CLAIM_AUDIT_URL`.
2. `cd frontend && npm run dev` → the Theater screen (`/handler/theater`) with a real claim GUID should
   fetch and replay the actual rationale rows instead of the canned timeline. (Wiring uses the shipped
   `src/api/claimAudit.js` client — see the code task below.)

---

## Gotchas

- **GUID is NOT quoted in the filter.** `_gbx_claimid_value eq <guid>` — no single quotes. Claim
  *number* (text) **is** quoted: `gbx_claim_id eq 'CLM-2026-0001'`. Quoting the GUID returns 0 rows
  silently.
- **The FK column is `_gbx_claimid_value`**, with a leading underscore and `_value` suffix — that's the
  raw lookup GUID column. The bare `gbx_claimid` is the navigation property (use it only for the
  `gbx_claimid/gbx_claim_id` traverse in Option B).
- **Choice text needs the FormattedValue annotation**, not a `name` suffix. `gbx_agent_name` alone
  returns the integer `10000`. Always read
  `gbx_agent_name@OData.Community.Display.V1.FormattedValue`.
- **Select text mode stringifies everything.** `flagRaised`/`latencyMs` come out as strings. The
  frontend client coerces them. Don't be surprised by `"false"` instead of `false`.
- **Order matters for Theater.** `gbx_timestamp asc` replays the agents in the order they actually ran.
  If timestamps are identical (sub-second logging), add a tiebreak: `gbx_timestamp asc, gbx_log_id asc`.
- **CORS preflight.** Keep the frontend request a *simple* GET (no custom request headers, no JSON
  `Content-Type` on the request) so the browser skips the `OPTIONS` preflight the HTTP trigger can't
  answer. The shipped client does this.
- **The signed URL is a secret.** It bypasses auth via its `sig`. Keep it in `.env.local`
  (gitignored) / SWA app settings — never hardcode it in committed source.
- **Don't build this from Copilot Studio.** It's an HTTP-trigger cloud flow the *browser* calls, not a
  tool Sara invokes. Build it in Power Automate directly.
- **Rename your List rows actions.** With two List rows (Claims + Rationales) the default names collide
  in expressions. Rename to `List_claims` and `List_rationale` and keep the expressions in sync.
```
