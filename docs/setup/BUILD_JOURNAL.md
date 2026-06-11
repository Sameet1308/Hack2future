# Glass Box AI — Build Journal

> A plain-English, step-by-step story of how we built the system, from the very first command.
> Written so **anyone** — a new teammate, a judge, a non-technical reader — can follow what we did and why.
> Newest steps are added at the bottom. Each step says: **what we ran**, **why**, and **what happened**.

---

## The big picture (read this first)

We are building **Glass Box AI** — an insurance claims system where AI agents handle a claim end to end, and *every* decision is written down in plain English (the "glass box" audit trail).

To build it we need 4 things wired together:

1. **A database** (Dataverse) that holds policies, claims, and the audit log.
2. **A chat agent** (Copilot Studio) the customer talks to.
3. **An AI brain** (Azure OpenAI) the agents use to reason and write explanations.
4. **A website** (our React frontend) where the customer types.

We build them one at a time, then connect them. The very first goal is a tiny but complete slice:

> Customer types a policy number → agent looks it up in the real database → replies *"Hi Sarah, confirming this is for your 2022 Honda Civic?"*

If that works, the whole spine is proven. Everything after is adding more agents on top.

---

## The two worlds (don't mix them up)

| World | What it's for | Managed at |
|---|---|---|
| **Azure** | The AI brain + search + document reading | `az` commands in Cloud Shell, or portal.azure.com |
| **Power Platform** | The database (Dataverse) + chat agent (Copilot Studio) + automation (Power Automate) | admin.powerplatform.microsoft.com, or `pac` commands |

Same login (the sandbox account), but two different websites.

---

## 📋 Command log — chronological (quick reference)

Every command we have run, in order, with its one-line purpose and result.

| # | Command (shortened) | Purpose | Result |
|---|---|---|---|
| 1 | `az account show` | Confirm which subscription + tenant we're in before building | ✅ Sub `b9e3346a…`, Tenant `3670e846…`, Enabled |
| 2 | `az group create -n rg-glassbox -l eastus2` | Create the "project folder" that holds all Azure resources | ✅ `rg-glassbox` created |
| 3 | `az cognitiveservices account create … --kind OpenAI` | Create the Azure OpenAI account (the empty "AI brain") | ✅ `glassbox-aoai-1003787` created |
| 4 | `az cognitiveservices account deployment create … gpt-4o-mini` | (First attempt) deploy the dev model | ❌ Failed — model version deprecated 2026-03-31 |
| 5 | `az cognitiveservices account list-models …` | List which GPT models the sandbox actually offers | ✅ Showed GPT-4.1 + GPT-5.x families available |
| 6 | `az cognitiveservices account deployment create … gpt-4.1-mini` | Deploy the **dev** model (cheap, fast) | ✅ `gpt-4.1-mini` live, 10K tokens/min |
| 7 | `az cognitiveservices account deployment create … gpt-4.1` | Deploy the **demo** model (smarter reasoning) | ✅ `gpt-4.1` live, 10K tokens/min |
| 8 | `az cognitiveservices account show … endpoint` + `keys list` | Grab the brain's address + password for later wiring | ✅ Saved to local `.env.local` |

> **Variables used in commands 2–8** (set once with `export`):
> `RG=rg-glassbox` · `LOC=eastus2` · `AOAI=glassbox-aoai-1003787`

---

# Session 1 — 2026-06-01 — Set-up & the Azure AI brain

### Step 0 — Logged in
**What:** Opened portal.azure.com as the sandbox lab user (`odl_user_…@<sandbox-tenant>`, redacted) and launched **Cloud Shell** (a ready-to-use terminal inside the browser — no install needed).

**Why:** Cloud Shell is already logged in, so we create Azure resources by typing commands instead of clicking through hundreds of portal screens.

**What happened:** Got a `$` prompt. We were in.

---

### Step 1 — Confirmed which account we're in
```bash
az account show
```
**Why:** Before creating anything, confirm *which* subscription (billing account) and tenant (organization) we're pointed at — so we don't build in the wrong place.

**What happened:** ✅
- Subscription: **Sandbox AI DS - 1003787**
- Subscription ID: `b9e3346a-95f9-4891-b24b-78528547f9a2`
- Tenant ID: `3670e846-58dd-4658-86fb-00e4029045d6`
- State: **Enabled**

We saved these IDs into a local-only file (`.env.local`, never committed) so later commands and configs can reuse them.

**The IDs explained:** **Tenant ID** = our organization's identity ("the company"). **Subscription ID** = the billing account inside it ("the wallet"). We'll need both later so the website and automations can prove "this app belongs to our org" when users log in.

---

### Step 2 — Created the resource group + Azure OpenAI account
```bash
export RG=rg-glassbox       # name of our "project folder"
export LOC=eastus2          # which datacenter region
export AOAI=glassbox-aoai-1003787   # name of our AI brain

# Create the project folder (free)
az group create -n $RG -l $LOC -o table

# Create the AI brain — empty for now (free to create, pay only per use)
az cognitiveservices account create \
  -n $AOAI -g $RG -l $LOC \
  --kind OpenAI --sku S0 \
  --custom-domain $AOAI \
  --yes -o table
```
**Why:**
- A **resource group** is a folder that holds all our Azure pieces together, so we can find or delete them in one shot when the sandbox expires.
- The **Azure OpenAI account** is our private doorway to GPT models. Creating it is **free** — we only pay when the AI actually answers. Set up now so it's ready ("preheating the oven").

**What happened:** ✅ Both created in `eastus2`. The brain existed but was **empty** — no model loaded yet.

---

### Step 3 — Put a model inside the AI brain
**What:** An OpenAI account is just an empty doorway. A **deployment** assigns an actual model to it with a name we can call. (Analogy: we rented the phone line; now we assign a person to answer it.)

**First try failed (and why that's normal):**
```bash
# This FAILED:
az cognitiveservices account deployment create \
  -n $AOAI -g $RG \
  --deployment-name gpt-4o-mini --model-name gpt-4o-mini \
  --model-version "2024-07-18" --model-format OpenAI \
  --sku-name Standard --sku-capacity 10
# → ServiceModelDeprecated: deprecated since 2026-03-31
```
Models retire over time; our planned `gpt-4o-mini` had aged out. So we listed what's available:
```bash
az cognitiveservices account list-models -n $AOAI -g $RG \
  --query "[?contains(name,'gpt-4o') || contains(name,'gpt-4.1') || contains(name,'gpt-5')].{model:name, version:version, sku:skus[0].name}" -o table
```
The sandbox had the full modern lineup (GPT-4.1, GPT-5.x). We picked the **GPT-4.1 family**:

| Role | Model | Why |
|---|---|---|
| Dev / testing | **gpt-4.1-mini** | Cheap, fast, current-gen, simple `Standard` SKU |
| Demo reasoning | **gpt-4.1** | The smarter model for the polished demo |

**Commands that worked:**
```bash
# Dev model
az cognitiveservices account deployment create \
  -n $AOAI -g $RG \
  --deployment-name gpt-4.1-mini --model-name gpt-4.1-mini \
  --model-version "2025-04-14" --model-format OpenAI \
  --sku-name Standard --sku-capacity 10

# Demo model
az cognitiveservices account deployment create \
  -n $AOAI -g $RG \
  --deployment-name gpt-4.1 --model-name gpt-4.1 \
  --model-version "2025-04-14" --model-format OpenAI \
  --sku-name Standard --sku-capacity 10
```

**What happened:** ✅ Both `Succeeded` / `Running`, each 10,000 tokens/min.

> **Decision noted:** original plan said `gpt-4o-mini` (dev) / `gpt-4.1` (demo). Because `gpt-4o-mini` is now deprecated, we substituted **`gpt-4.1-mini`** for dev. `gpt-4.1` stays as the demo model.

**Cost reminder:** deploying a model costs **$0**. `--sku-capacity 10` is just a speed limit (10K tokens/min), not a charge. We only pay per actual call — a fraction of a cent per claim.

---

### Step 4 — Captured the brain's address + password
**What:** To *call* the AI from our agents and frontend later, we need two values:
- **Endpoint** — the brain's web address (not secret)
- **API key** — the password to use it (**SECRET** — kept only in local `.env.local`)

```bash
echo "ENDPOINT:"; az cognitiveservices account show -n $AOAI -g $RG --query "properties.endpoint" -o tsv
echo "KEY:";      az cognitiveservices account keys list -n $AOAI -g $RG --query "key1" -o tsv
```
**What happened:** ✅
- Endpoint: `https://glassbox-aoai-1003787.openai.azure.com/`
- Key: captured into `.env.local` (not written here — it's a secret)

**End state of the AI brain:** account `glassbox-aoai-1003787` with two live models — `gpt-4.1-mini` (dev) and `gpt-4.1` (demo). **Azure side is done for the first milestone.**

---

## ⏭️ What's next (planned)

We now switch worlds: **Azure → Power Platform.**

1. **Create a Power Platform Environment** → it gives us a **Dataverse** database.
2. **Add a Policy table** + 5 sample policies. *(For the first milestone we only need this one table, not all 9.)*
3. **Build the Copilot Studio chat agent** that reads a policy from that table.
4. **Wire our React frontend** to the agent → Hello World demo works live.

The hierarchy we're building:
```
Environment  =  a sealed workspace (like a Drive for one project)
   └─ Dataverse  =  the database inside it
        └─ Tables  =  the spreadsheets (Policy, Claim, Decision_Rationale…)
             └─ Rows  =  the actual data (Sarah's policy, etc.)
```

Each step gets its own entry below as we do it.

---

# Session 1 (continued) — Power Platform: the database

### Step 5 — Created the Power Platform Environment + Dataverse
**What:** Went to **admin.powerplatform.microsoft.com → Environments**. The sandbox was empty ("No environments found"), so we created one.

**Why:** A database (Dataverse) has to live inside an **Environment** (a sealed workspace). No environment = nowhere to put data.

**Clicks:** `+ New` → filled the form:

| Field | Value | Why |
|---|---|---|
| Name | `GlassBox-Dev` | Our build workspace |
| Type | Sandbox | Dev/test workspace (not single-user, not expiring) |
| Region | United States | Near our Azure brain + matches US-market demo |
| **Add a Dataverse data store?** | **Yes** | ⭐ The toggle that actually creates the database |
| Language / Currency | English / USD | — |
| Security group | **None** (Open access) | So the whole team can get in |
| Enable Dynamics 365 apps? | No | We only need plain Dataverse + our own tables |

**What happened:** Environment **GlassBox-Dev** appeared with State = **Preparing**. Provisioning a real database takes a few minutes; we refresh until **State = Ready** and **Dataverse = Yes**.

---

### Step 6 — (next) Create the Policy table + sample policies
**Plan:** Once Dataverse is ready, build the **Policy** table — the source of truth the agent reads.

For the *first milestone* we only need a few columns (full 15-column schema comes later):

| Column | Type | Example | Purpose |
|---|---|---|---|
| Policy Number *(primary)* | Text | `POL-2026-0847` | What the customer types in |
| Holder Name | Text | `Sarah Chen` | So the agent can greet by name |
| Vehicle | Text | `2022 Honda Civic` | For the greeting *(demo-friendly; canonical schema stores VIN)* |
| State | Text | `CA` | Used later for routing rules |
| Status | Choice | `Active` | Active / Lapsed / etc. |

**The 5 sample policies** (from `docs/02_architecture.md`, vehicles assigned for the demo):

| Policy Number | Holder | Vehicle | State | Status |
|---|---|---|---|---|
| POL-2026-0847 | Sarah Chen | 2022 Honda Civic | CA | Active |
| POL-2026-1123 | Michael Johnson | 2021 Ford F-150 | TX | Active |
| POL-2026-0592 | Jennifer Rodriguez | 2023 Toyota Camry | FL | Active |
| POL-2026-0331 | David Park | 2020 Tesla Model 3 | NY | Active |
| POL-2026-0998 | Amanda Williams | 2019 Chevrolet Malibu | OH | Expired |

*(Sarah = the main demo. Amanda = "Expired" on purpose, for the denial demo later.)*

**What happened:** ✅ Imported via "Create with Excel or .CSV file". Power Apps auto-named it **Policy**, set **Policy Number** as the primary column, detected all 5 columns, and loaded all 5 rows. Logical name: `crcce_policy`.

---

# Session 1 (continued) — The rest of the schema, built by Python

### Step 7 — Installed Azure CLI locally + logged in
**Why:** So Claude can run scripts directly from the project machine instead of us uploading files to Cloud Shell each time.
- `winget install Microsoft.AzureCLI` → installed
- `az login --use-device-code` → signed in as the sandbox user (one-time browser step)
- `az account set --subscription b9e3346a-...` → pointed at Sandbox AI DS

From here on, Claude runs `az` + `python` directly on this machine.

### Step 8 — Built the other 8 tables with a Python script
**What:** Ran `scripts/create_dataverse_tables.py` — it talks to the Dataverse Web API (borrowing the `az` login token, no app registration needed) and creates tables, columns, and relationships.

**Why a script instead of clicking:** The sandbox is time-boxed. If it expires, re-running this script rebuilds the entire 9-table schema in minutes instead of hours. It's also our single source of truth for the schema.

**What it created:**
- Publisher **`gbx`** + solution **`GlassBoxCore`** (so all columns get clean `gbx_` names)
- 8 tables: **Claim, Document, Communication, Decision Rationale, Adjuster, Vendor, Claim Vendor Assignment, State Rule**
- All their columns (choices, money, dates, yes/no, numbers, text, memo)
- 8 **relationships**: Claim→Policy, Claim→Claim (reopen), Document→Claim, Communication→Claim, Decision Rationale→Claim, Claim→Adjuster, ClaimVendorAssignment→Claim, ClaimVendorAssignment→Vendor

**Bumps along the way (and fixes):**
1. Couldn't run from Claude's machine at first — **no `az` installed** and the login lived in the browser Cloud Shell. Fixed by installing `az` locally + logging in (Step 7).
2. First run **crashed** — `urllib` rejects spaces in OData `$filter` URLs. Fixed with a one-line URL-encode (`url.replace(" ", "%20")`).

**What happened:** ✅ Re-ran → completed with **zero errors**, published successfully. Verified independently with `scripts/verify_tables.py`, which queried the database and confirmed all 9 tables and their column counts (Policy 7, Claim 40, Decision Rationale 21, Vendor 18, CVA 16, Adjuster/Communication/State Rule 14, Document 12).

**State now:** the complete Dataverse schema exists in GlassBox-Dev. Ready to wire up Copilot Studio (the chat agent) next.

---

# Session 2 — 2026-06-02 — Copilot Studio: Hello World achieved

### Step 9 — Built the "Glass Box Claims Assistant" agent (persona: Sara)
**What:** Created a Copilot Studio agent in the **GlassBox-Dev** environment.

**Why it matters:** This is the customer-facing chat agent — the thing a judge actually talks to.

**Clicks/config:**
- copilotstudio.microsoft.com → **+ New agent → Agent → Skip to configure**
- Name: `Glass Box Claims Assistant`; persona **Sara**; model **GPT-4.1**
- Description + "Sara" instructions (warm, grounded, greet-by-name, confirm vehicle, log every decision)
- **Knowledge:** added the **Policy** Dataverse table (`crcce_policy`) as a knowledge source
- Disabled Web Search (keep Sara grounded only in policy data)

**Bump:** first creation landed in the **Default** environment (Sandbox AI Labs 1010), not GlassBox-Dev — so it couldn't see the Policy table. Fix: switched the environment picker to GlassBox-Dev first, then recreated. (Lesson: in Copilot Studio, set the environment **before** clicking Create.)

### Step 10 — HELLO WORLD MILESTONE ✅
Tested in the agent's test pane:

| Input | Sara's response | Result |
|---|---|---|
| "start a claim, policy POL-2026-0847" | "Hello Sarah Chen … policy is active … insured vehicle is a **2022 Honda Civic**" + Compliance Note | ✅ happy path |
| "file a claim, policy POL-2026-0998" | "Amanda Williams … 2019 Chevrolet Malibu … status is **Expired** … you cannot file a claim" + Compliance Note | ✅ denial path |

**Significance:** the full spine works end-to-end — **chat → real Dataverse Policy table → grounded, accurate, compliant response** — citing `crcce_Policy` as its source. Used generative/agentic retrieval (the AI decided what to query), which is a stronger story than a hardcoded topic. The "every decision recorded for compliance" line — the core pitch — appears naturally.

**Next:** publish to a web channel (shareable demo) and/or make the audit trail *real* (write decisions to the `Decision_Rationale` table — the true "glass box").

---

# Session 3 — 2026-06-11 — FNOL_Start live + Sara embedded in the app

> (Sessions between 06-02 and today — service-layer flows, proactive greeting, live Theater —
> are documented in the flow runbooks and commit history; see `docs/setup/flows/`.)

### Step 11 — Built the `FNOL_Start` intake topic (Runbook 05)
**What:** the conversation that turns "I was rear-ended" into a real claim: 4 questions
(lossType choice, free-text description, state, injury Yes/No) → injury soft-stop message →
**GlassBox-CreateClaim** → promote `claimId`/`claimGuid` to Globals → **GlassBox-LogDecision**
(first Glass Box audit row) → confirmation with the real claim number.

**Bumps along the way (and fixes) — all now in the Runbook 05 gotchas:**
1. **New trigger UI** — no phrase list; agent uses generative orchestration. Wrote a rich
   trigger *description* with example utterances instead. Routing works (it even slot-fills:
   one sentence answered both lossType and description).
2. **Choice variables are EmbeddedOptionSet** — can't pass them raw into a flow's String
   input. Fix: `Text(Topic.lossType)` / `Text(Topic.injuryFlag)` everywhere (inputs + formulas).
3. **Variable names are case-sensitive in Power Fx** — `Global.claimId` vs the `claimID`
   node we'd created. Fix: pick names from autocomplete, never hand-type.
4. **Placeholders in messages are picked, not typed** — pasting `{claimId}` as text throws
   "Identifier not recognized"; insert the variable chip instead.
5. **Greeting was hard-wired** to an old disabled `FNOL_Intake` topic → `redirectToDisabledTopic`
   error, and FNOL fired before the customer answered. Fix: deleted the redirect — the
   customer's free-text reply now triggers FNOL_Start naturally.
6. **"California" crashed CreateClaim** — `gbx_incident_state` is max-length 4.
   Fix: `Upper(Left(Topic.incidentState, 2))` on the flow input (demo-grade normalization).
7. **Old `FNOL_Intake` had stale flow bindings** that blocked Publish
   (`BindingKeyNotFoundError: boolean`). Fix: deleted the dead topic.

**What happened:** ✅ test pane produced a real claim **CLM-2026-3ccce2** (27s end-to-end) —
Claims row + linked Intake row in Decision Rationales, written live from conversation.

### Step 12 — Published the agent + embedded Sara in the React app
- **Settings → Security → Authentication → No authentication** (demo-only; production = Entra ID
  per ADR) — required, otherwise only Teams/M365 channels exist and the iframe shows a sign-in.
- **Publish** → **Channels → Web app** → copied the `/webchat?__version__=2` embed URL
  (the `/canvas` URL is the standalone demo site, not the embed).
- `frontend/.env` → `VITE_COPILOT_EMBED_URL=<url>` → restart Vite (env is read at startup only).

**MILESTONE ✅:** opened `http://localhost:5173/customer/chat` — Sara live **inside the phone
frame of our own app**, filed a claim through the real UI, got a real claim number back.
Conversation → service layer → Dataverse → Glass Box: the demo's opening scene works for real.

**Reminder for everyone:** the test pane runs the *draft*; the embedded app runs the *published*
snapshot — after any topic edit, **Publish again** or the app lags behind.

**Next:** MasterOrchestration (replace `seed_demo.py` with the real pipeline), NotifyCustomer
email (the "document checklist within the hour" promise), 6 sandbox adapters.
