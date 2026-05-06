# US Market Context — Glass Box AI

This file consolidates US auto-claims domain context layered on top of the base architecture in [02_architecture.md](02_architecture.md). It captures the pivot decision (logged in [decisions.md](decisions.md)) and the resulting build/scope changes.

## Why US framing

| Driver | Impact |
|---|---|
| Market size | ~$310B personal auto premium / yr · ~10M claims / yr |
| Speed benchmark | Lemonade / Root push sub-3-min instant settlement — our auto-approve tier matches |
| **Regulatory tailwind** | Colorado SB21-169, NAIC AI Model Bulletin (20+ states), NY DFS Circular Letter No. 7, CA AB 2930 (pending). Glass Box `Decision_Rationale` is a literal compliance artifact under all of these. |
| Channel reality | Mobile app dominates. WhatsApp ≈ 0% adoption in US auto. Pivot channel mix accordingly. |

The regulatory point is the **single strongest pitch lever** the Glass Box concept gives us. Lead with it.

---

## Table 1 — Flow Components × US Context

End-to-end pipeline with US-specific overlays.

| # | Component | Built In | US-Specific Context | Owner | Build | Glass Box Log |
|---|---|---|---|---|---|---|
| 1 | FNOL Channels | Copilot Studio + ACS | Drop WhatsApp. Channels: Mobile App (web chat in phone frame), SMS, Web, Email, Teams | Person 1 | Real | Channel + timestamp |
| 2 | Intake Agent — Identity | Copilot Studio | Capture **policy # + VIN + state of incident** (state drives no-fault routing) | Person 1 | Real | Identity match result |
| 3 | Intake Agent — Triage | Copilot Studio | Injury Y/N → immediate Tier-3. Sentiment check → skip auto-approve if distressed | Person 1 | Real (sentiment via AOAI) | Triage outcome |
| 4 | Intake Agent — FNOL data | Copilot Studio | Police report #, responding agency, other party's carrier+policy, witnesses, airbag deployed, vehicle drivable, towed Y/N | Person 1 | Real | Data points captured |
| 5 | Document AI — initial pass | Power Automate + AI DocIntel | Driver's License (state format), Vehicle Title/Registration, Insurance Card, Police Report (Layout) | Person 2 | Real | Fields extracted, missing |
| 6 | Notification loop | Power Automate | Email + SMS with secure upload link to web form. Automated, not CSR. | Person 4 | Real | Notification sent |
| 7 | CSR (live human) | Teams | Different from notification — only on distress / Tier-3 escalation. Full transcript handover. | Person 4 | Real (manual handoff) | Escalation reason |
| 8 | Document AI — full pass | Power Automate + AI DocIntel | All received docs re-extracted, JSON merged into Documents.ExtractedData | Person 2 | Real | Final extraction summary |
| 9 | Policy Agent — lookup | Dataverse query | Confirm active, paid, in-force at incident date | **Prasad** | Real | Policy validity |
| 10 | Policy Agent — RAG | Power Automate + AI Search | RAG over policy PDF for **US coverage code** (BI/PD/Collision/Comp/UM-UIM/PIP/MedPay) | **Prasad** | Real | Clause cited |
| 11 | Validation — Weather | Power Automate (HTTP) | NOAA api.weather.gov | Person 3 | **REAL** (free public) | API result |
| 12 | Validation — Duplicate (intra-carrier) | Dataverse query | Same policy + similar date/loc | Person 3 | Real | Match result |
| 13 | Validation — Duplicate (cross-carrier) | Power Automate (HTTP mock) | ISO ClaimSearch | Person 3 | Mock | API result |
| 14 | Validation — Fraud watchlist | Power Automate (HTTP mock) | NICB | Person 3 | Mock | API result |
| 15 | Validation — Vehicle history | Power Automate (HTTP mock) | CARFAX / Experian AutoCheck | Person 3 | Mock | API result |
| 16 | Validation — Driver record | Power Automate (HTTP mock) | DMV per state | Person 3 | Mock | API result |
| 17 | Validation — Recall | Power Automate | NHTSA vpic.nhtsa.dot.gov | Person 3 | **REAL** (free public) | API result |
| 18 | Validation — Estimate vs avg | Power Automate (rule) | Repair vs regional avg | Person 3 | Real | Variance % |
| 19 | Telematics / G-force | Power Automate (HTTP mock) | Pre-loaded sensor stream w/ g-force spike at incident time. Production = InfluxDB. | **Suraj** | Mock | Sensor evidence |
| 20 | Health sensor (Fitbit) | — | Heart-rate spike → injury corroboration for PIP/MedPay | **Suraj** | **Deferred — roadmap only** | — |
| 21 | Fraud rules engine | Power Automate | 3 visible rules: estimate >2x avg / cross-carrier dup / police report >48h late | Person 3 | Real (rules) | Rules triggered |
| 22 | Adjudication Agent | Power Automate + Azure OpenAI (GPT-4.1/5) | Prompt includes state, no-fault flag, coverage type, all validation, fraud, sentiment | Person 2 | Real | Full prompt + response |
| 23 | Settlement type | Power Automate | DRP shop / Cash / Total loss (if estimate >70% mock ACV) | Person 2 | Real | Settlement path |
| 24 | Routing tier | Power Automate | ≥90% auto-approve (within state cap) / 60–90% Teams / <60% live CSR | Person 3 | Real | Tier chosen |
| 25 | Teams Adaptive Card | Power Automate + Teams | US-shorthand: "100/300/50 limits", state, no-fault flag | Person 4 | Real | Adjuster decision |
| 26 | Explanation Agent | Copilot Studio + AOAI | Reads Glass Box → friendly explanation citing clause → original channel | Person 1 | Real | Explanation text |
| 27 | Glass Box (regulatory artifact) | Dataverse | **The** Colorado SB21-169 / NAIC compliance artifact | Person 3 | Real | (this IS the log) |
| 28 | Manager Dashboard | Power BI | Confidence dist, tier mix, fraud-flag rate, settlement time, channel mix | Person 5 | Real | — |

---

## Table 2 — US-Specific Data Points (Intake & Documents)

Replaces India-flavored fields throughout the build.

| Data Point | India Version | US Version | Where Stored |
|---|---|---|---|
| Vehicle ID | Reg # | **VIN (17 chars)** + Reg # | Claims.VIN |
| Driver ID | Driving Licence | **State Driver's License** (e.g. CA-D1234567) | Documents (License) |
| Vehicle ownership | RC book | **Title / Registration** | Documents (Title) |
| Police filing | FIR # | **Police Report #** + responding agency | Claims.PoliceReportNumber + RespondingAgency |
| Regulator records | RTO | **DMV** (state-specific) | Validation API |
| Garage system | Cashless network | **DRP (Direct Repair Program)** shop | Claims.SettlementType |
| Surveyor | IRDAI surveyor | **Independent appraiser / staff adjuster** | (HITL — Teams) |
| Insurance proof | — | **Insurance Card** (mandatory in vehicle in most states) | Documents (InsuranceCard) |
| State of incident | — | **State (2-letter)** — drives no-fault routing | Claims.IncidentState |
| Other party info | — | **Other carrier + policy #** (third-party claims) | Claims.OtherPartyCarrier |
| Severity proxy | — | Airbag deployed Y/N, vehicle drivable Y/N, tow used Y/N | Claims.SeverityFlags |
| Witnesses | — | Witness contacts | Claims.Witnesses |

---

## Table 3 — External APIs (Real vs Mocked)

All mocked endpoints are Power Automate HTTP-trigger flows returning realistic JSON.
Pitch line: *"Production-ready interface, mocked for hackathon."*

| API | Purpose | Real Cost | Demo Approach | Mock Returns (example) |
|---|---|---|---|---|
| **NOAA Weather** | Storm/flood corroboration | Free public | **REAL** (api.weather.gov) | `{"conditions_at_incident": "thunderstorm"}` |
| **NHTSA Recalls** | Recall lookup by VIN | Free public | **REAL** (vpic.nhtsa.dot.gov) | `{"recalls": [...]}` |
| ISO ClaimSearch | Cross-carrier duplicate | Subscription + carrier vetting | Mock | `{"matches": 1, "details": "Similar claim filed at neighboring address 2026-04-12"}` |
| NICB | Fraud watchlist, theft | Member-only | Mock | `{"vehicle_status": "clean", "contractor_flag": false}` |
| CARFAX / AutoCheck | Vehicle history | $40/report retail | Mock | `{"prior_accidents": 0, "title_status": "clean"}` |
| DMV (state) | Driver record | Per-state portals | Mock | `{"license_status": "valid", "infractions_3yr": 0}` |
| KBB / NADA / CCC ONE | ACV for total-loss | Paid B2B | Mock | `{"acv": 18500, "source": "KBB"}` |
| Telematics (UBI) | G-force at incident | Carrier-owned | Mock | `{"g_force_max": 3.2, "timestamp": "2026-04-10T14:32:00", "location_match": true}` |

> **Demo pro-tip**: NOAA + NHTSA being real lets us answer "is *anything* real?" with yes. Use it.

---

## Table 4 — Team Ownership Map

| Person | Lead Area | Components Owned (Table 1) |
|---|---|---|
| **Person 1** (Copilot Studio Lead) | Conversational agents | 1, 2, 3, 4, 26 |
| **Person 2** (Azure AI Lead) | Document AI + Adjudication | 5, 8, 22, 23 |
| **Person 3** (Power Automate Lead) | Orchestration + Validation + Glass Box | 11–18, 21, 24, 27 |
| **Person 4** (Teams + CSR Lead) | HITL + Notifications | 6, 7, 25 |
| **Person 5** (Demo + Dashboard Lead) | BI + recording | 28, demo prep, backup video |
| **Prasad** (Policy SME) | Policy data + RAG | 9, 10 |
| **Suraj** (Sensor / Telematics) | IoT mock + Fitbit roadmap | 19 (mock), 20 (deferred) |

---

## Regulatory pitch (the killer slide)

| Regulation | What it requires | Glass Box answer |
|---|---|---|
| **Colorado SB21-169** (in force 2023) | AI/ML must demonstrate no unfair discrimination + maintain governance + be explainable | `Decision_Rationale` = literal compliance artifact |
| **NAIC AI Model Bulletin** (Dec 2023, 20+ states) | AI governance, documentation, third-party vendor controls, monitoring | Per-claim audit log |
| **NY DFS Circular Letter No. 7** (2024) | Documented AI use + consumer challenge ability | Plain-English explanation per claim |
| **CA AB 2930** (pending) | Algorithmic decision-making transparency | Same |
| **EU AI Act** (extraterritorial reach) | High-risk AI systems require traceability + human oversight | Tiered routing + Glass Box |

**Pitch line**: *"Glass Box AI doesn't just process claims faster — it's the only architecture that's Colorado-compliant by design. Every other agentic system creates regulatory liability with every decision. Ours creates a compliance artifact."*
