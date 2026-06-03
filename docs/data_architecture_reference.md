# Data Architecture Reference — Demo vs. Production (which DB fits where)

> **Purpose:** a standalone reference for *where data lives and why* — Dataverse vs. other stores, at demo scale vs. production scale. Written so anyone can read it cold. Pairs with `docs/decisions.md` (ADR 2026-06-02) and the "Production Data Architecture & Scale" section of `docs/02_architecture.md`.

---

## The core question

> *"Can Dataverse hold 200 million policies? When a customer gives a policy number, does the agent scan all 200M to find it?"*

**Short answer:** The 200M policy master does **not** belong in Dataverse, and we **never scan** — we do an **indexed lookup** that finds one row in ~28 steps regardless of table size. Only the *retrieval method* changes between demo and production; the conversation looks identical.

---

## 1. Two mechanisms people conflate (this is the crux)

| | Indexed exact-match lookup | Generative / semantic retrieval |
|---|---|---|
| **Question it answers** | "Fetch the row WHERE PolicyNumber = POL-2026-0847" | "Find text relevant to *what does my collision coverage say?*" |
| **How** | B-tree index / alternate key | Vector + keyword search (RAG) |
| **Cost at 200M rows** | ~28 comparisons (log₂ 200M) → **microseconds** | scan-like → slow + costly |
| **Right for** | exact record fetch | fuzzy "understand the wording" |
| **Tool** | Azure SQL / Cosmos index, Dataverse alternate key, `GET /policies?policyNumber=` | **Azure AI Search** |

**Analogy:** finding a word in a 1,000-page book. An **index** (back of the book) sends you straight to the page — you don't read all 1,000 pages. That's an indexed lookup. Reading every page until you find it = a full scan. Databases use the index.

**The numbers, concretely:**
| Method | Steps to find 1 policy among 200M |
|---|---|
| Full scan | up to 200,000,000 → seconds–minutes 🐌 |
| Indexed lookup | ~28 → microseconds ⚡ |

---

## 2. Tiered data stores — which DB fits where

| Data | Demo (current build) | Production | Why |
|---|---|---|---|
| **Policy master (~200M)** — lookup by policy number | 5-row **Dataverse** Policy table, queried via Copilot Studio "knowledge" (generative) — a **stand-in** | **Core policy system** (Guidewire PolicyCenter) **or** **Azure SQL Hyperscale / Cosmos DB**, indexed on policy number | Dataverse storage is premium-priced + has throughput limits; not a high-volume policy engine. Indexed SQL/Cosmos = fast + cheap at scale |
| **Policy coverage *wording*** (the PDF language) | (not in demo yet) | **Azure AI Search** (vector + keyword index) | Fuzzy semantic job — exactly what AI Search is for |
| **Claims in flight** | **Dataverse** ✅ | **Dataverse** (or Guidewire ClaimCenter) | Small transactional working set — Dataverse's sweet spot |
| **Decision_Rationale audit trail** | **Dataverse** ✅ | **Dataverse** | Auditable, queryable, governed — the Glass Box |

**One-liner to remember:** *Dataverse holds the **claims + audit working set**, not the 200M policy master. Policies live in a purpose-built indexed store; their wording lives in Azure AI Search.*

---

## 3. Can Dataverse *physically* hold 200M? (nuance)

**Technically yes** — Dataverse has "elastic tables" (Cosmos-backed). But you wouldn't make it the policy master because of:
- **Cost** — premium per-GB capacity pricing; 200M rows = hundreds of GB = big bill
- **Throughput** — Dataverse "service protection limits" cap high request rates
- **Fit** — it's a business-application platform, not a high-volume policy-admin engine

If you *did* keep policies in Dataverse, you'd add an **alternate key** on the policy-number column (creates a unique index) and use "Retrieve by alternate key" — fast, no scan. But for 200M, a dedicated store is the right call.

---

## 4. Production request flow — customer gives a policy number

```
Customer ──"POL-2026-0847"──► Sara (Copilot Studio)
   └─ extracts # → calls GetPolicy ACTION (an API, not a DB)
        └─► Azure API Management  (Entra ID authN/authZ, rate-limit, logging)
             └─► Policy API (microservice / Azure Function)
                  │   SELECT … WHERE PolicyNumber = X    ← indexed
                  └─► Policy store returns ONE row  (~5-20ms, even at 200M)
   ◄─ policy JSON (holder, vehicle, coverage, status) ─┘
Sara replies, grounded: "Hi Sarah, confirming your 2022 Honda Civic?"
```

**Key points:**
- The agent calls a **defined API action**, never a database directly.
- The lookup is a single **indexed** query → one row → milliseconds.

---

## 5. The CQRS / read-model pattern (how real insurers keep it fast)

Real insurers don't hammer the heavy core policy system on every chat. They keep a **fast read-replica / cache** (Cosmos DB or Redis) holding just the fields the agent needs (holder, vehicle, coverage, status), kept in sync from the core system via **events** (CDC / Event Grid / Kafka).

```
Writes ─► System of Record (core policy system)
              │  (events: CDC / Event Grid)
              ▼
         Read model / cache (Cosmos / Redis)  ◄── Agent reads here (sub-20ms)
```

This is **CQRS** (Command Query Responsibility Segregation): writes go to the system of record; reads come from a store optimized for fast lookups. Result: sub-20ms lookups at any scale, and the core system isn't overloaded.

---

## 6. The service-layer rule (agent never touches data directly)

```
Agent (Sara)  →  Service layer (Power Automate flow / Azure Function behind APIM)  →  data store
   (talks)              (business rules, validation, auth, routing, audit)            (stores)
```

Why:
- **Separation of concerns** — agent = conversation; service = logic
- **Security** — least-privilege identity; the agent holds no broad data permissions
- **Reuse** — web / SMS / Teams / email all call the same service → identical audit format
- **Governance** — one chokepoint to log, throttle, monitor

This applies to **both reads and writes**: policy lookup goes through the service layer; claim creation and audit logging go through the service layer.

---

## 7. Demo vs. production — only the backend changes

| | Demo (now) | Production |
|---|---|---|
| Policy lookup | Copilot Studio knowledge over 5-row Dataverse table (generative) | APIM → Policy API → indexed Azure SQL/Cosmos (exact) |
| Coverage wording | — | Azure AI Search |
| Claims + audit | Dataverse | Dataverse |
| Agent → data | knowledge / tool | agent → **service layer** → store |

**The conversation is identical to the user/judge.** Because Sara sits behind a service layer, swapping the backend (stand-in → scalable indexed API) doesn't touch the agent. That's the whole point of the layering.

---

## 8. Judge Q&A cheat sheet (say this out loud)

**Q: "Can this handle 200 million policies?"**
> Yes. The policy master lives in a purpose-built indexed store (Azure SQL Hyperscale or Cosmos), not Dataverse. A lookup by policy number is an indexed query — about 28 comparisons for 200M rows, so milliseconds. We never scan.

**Q: "So the agent searches the whole database?"**
> No. It calls an API that does a single indexed lookup for the exact policy number. Generative/AI search is reserved for the fuzzy job — understanding coverage *wording* — via Azure AI Search.

**Q: "Why is your demo using a Dataverse table for policies then?"**
> That 5-row table is an explicit stand-in for the policy system so the demo is self-contained. In production it's an API call to the indexed policy store. The conversation and the agent don't change — only the backend.

**Q: "Does the agent write to the database directly?"**
> No — it calls a governed service layer (a Power Automate flow / Azure Function behind API Management). That gives us validation, least-privilege security, reuse across channels, and a single audit chokepoint.

**Q: "Where's the audit trail stored?"**
> Dataverse — the `Decision_Rationale` table. Every AI decision writes a plain-English row. That's the Glass Box, and it maps directly to Colorado SB21-169 / NAIC requirements.
