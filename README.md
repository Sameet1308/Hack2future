# Glass Box AI

> Agentic insurance claims processing with an explainable audit trail.
> Hack2Future — Business Challenge 2. Carrier brand in the demo: **AI Elites**.

**Repository:** https://github.com/Sameet1308/Hack2future
**Live app:** https://glassbox-fn-1003787.azurewebsites.net

A working prototype of a multi-agent claims system. A policyholder files a First
Notice of Loss through a conversational assistant, uploads a photo of the damage,
and a pipeline of specialized AI agents extracts the facts, checks them against the
policy, runs validations, and recommends a decision — while **every step is logged
in plain English** so a human can see exactly why the system decided what it did.

This repository contains a **runnable React app** (customer + claims-handler
surfaces) backed by a small Node server that calls **real Azure AI services**.
External insurance data feeds (ISO/NICB/CARFAX/DMV/KBB/telematics) are sandbox
adapters; the AI services are live.

---

## 🔴 Live deployment

The full system runs on Azure — nothing local required:

| | |
|---|---|
| **Live app** | https://glassbox-fn-1003787.azurewebsites.net |
| **Pitch deck** | https://glassbox-fn-1003787.azurewebsites.net/present.html |
| **Health probe** | https://glassbox-fn-1003787.azurewebsites.net/api/health |
| **Live claims (real Dataverse)** | https://glassbox-fn-1003787.azurewebsites.net/api/dv/claims |

**How it's hosted:** a single **Azure Functions** app (Windows, **custom handler**)
launches the Node server (`frontend/server/notify.mjs`), which serves *both* the
React SPA and the `/api/*` endpoints. The Function authenticates to **Dataverse via
its system-assigned Managed Identity** (no stored secrets). Real email goes out
through **Azure Communication Services**; vision, RAG, and adjudication run on
**Azure OpenAI GPT-4.1** + **Azure AI Search**. Resource group: **`rg-glassbox`**
(East US 2).

> The evaluation panel can independently verify every Azure / Power Platform
> resource behind this system — see
> [`docs/resource_verification_guide.md`](docs/resource_verification_guide.md).

---

## The agent pipeline

| Agent | Powered by | Job |
|---|---|---|
| **Intake** | Copilot Studio ("Sara") | First Notice of Loss across chat / web / email / Teams |
| **Extraction** | Azure OpenAI GPT-4.1 (vision) | Reads the damage photo and pulls structured facts |
| **Policy** | Azure AI Search (RAG) | Retrieves the relevant policy clauses and coverage |
| **Validation** | Sandbox adapters | Weather / duplicate / recall / contractor checks |
| **Adjudication** | Azure OpenAI GPT-4.1 | Synthesizes everything, scores confidence, recommends |
| **Explanation** | Audit trail | Plain-English rationale written for each agent step |

**Decision routing**
- **≥ 90% confidence** → auto-approve
- **60–90%** → routed to a human adjuster (one-click approve in the handler UI)
- **< 60%** → live human escalation

---

## What's in this repo

```
frontend/                 # Vite + React 18 + Tailwind SPA (customer + handler + Live Theater)
  src/
    customer/             # FNOL chat, photo damage assessment, status, settlement
    handler/              # Adjuster queue, claim detail, Live Decision Console (Theater)
    components/           # Agent pipeline animation, comms dispatch, progress
  server/notify.mjs       # Node API: email (ACS), photo vision, policy Q&A, Dataverse, agents
  public/docs/            # Sample policy / police report / insurance card (synthetic data)
  public/present.html     # HTML pitch deck
docs/                     # Architecture, decisions log, intake spec, demo runbook, blueprint deck
gbx-claims-api/           # Reference FastAPI backend (Dataverse-backed) — design reference
scripts/                  # Dataverse table setup + demo seeding + pipeline scripts
```

A hosted build runs on Azure Functions (custom handler serving the SPA + API).

---

## Run it locally

Requires Node 18+ (for `--env-file`).

```bash
cd frontend
npm install
cp .env.example .env        # fill in Azure keys to enable real email/vision/search
npm run dev                 # http://localhost:5173  (the app)
npm run notify              # http://localhost:8787  (the API server, second terminal)
```

The app is fully playable with mock data even before you add any Azure keys —
the live services (real email, GPT-4.1 photo analysis, AI Search policy Q&A,
Dataverse writes) switch on as you fill in `.env`. See
[`frontend/.env.example`](frontend/.env.example) for every variable and where to
get it.

### Key routes
- `/customer` — policyholder app (file a claim, chat with Sara, upload damage photo)
- `/customer/assess` — live AI photo damage assessment
- `/handler/queue` — adjuster queue of incoming claims
- `/handler/theater/:id` — **Live Decision Console**: watch the agent pipeline run on a claim

---

## Azure services used

| Service | Used for |
|---|---|
| **Azure OpenAI** (GPT-4.1) | Photo damage assessment (vision), policy Q&A, adjudication |
| **Azure AI Search** | RAG over policy / police-report documents |
| **Azure AI Document Intelligence** | Document extraction (provisioned) |
| **Azure Communication Services** | Real transactional email (claim filed, adjuster assigned, settled) |
| **Microsoft Dataverse** | Claims + decision-rationale (audit) tables |
| **Copilot Studio** | "Sara" — the conversational intake agent |
| **Azure Functions** | Hosting (custom handler serves SPA + API) |

Secrets live in `.env` (gitignored). Nothing in this repo contains a real key.

---

## Demo

A click-by-click walkthrough is in [`docs/demo_runbook.md`](docs/demo_runbook.md):
file a claim → upload a damage photo → AI assessment → claim lands in the adjuster
queue → real email notifications → watch the agent pipeline in the Live Decision
Console → approve / escalate.

---

## License & data

All policyholder data in this repo is **synthetic**. Azure architecture icons used
in diagram sources are Microsoft's and are not redistributed here.
