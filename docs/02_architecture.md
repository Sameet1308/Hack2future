# Glass Box AI — Detailed Architecture & Implementation Guide

## System Architecture (4 Layers)

### Layer 1: Frontend / Interaction Channels
All channels feed into the same Intake Agent built in Copilot Studio.

> **US market**: WhatsApp is ~0% adoption in US auto claims. Channel mix below reflects the post-pivot decision (see `decisions.md` 2026-05-05).

| Channel | Technology | Priority | Status |
|---------|-----------|----------|--------|
| Mobile App (web chat in phone frame) | Copilot Studio embedded widget styled as mobile | P0 (Must have) | |
| Web Chat | Copilot Studio embedded widget | P0 (Must have) | |
| Email | Power Automate shared mailbox monitor | P0 (Must have) | |
| Teams | Copilot Studio Teams channel | P0 (Must have) | |
| SMS | Azure Communication Services | P1 (Should have) | |
| WhatsApp | Copilot Studio + Azure Communication Services | P3 (International / roadmap) | |
| Voice/IVR | Copilot Studio Telephony (needs Dynamics 365) | P3 (Stretch) | |

### Layer 2: Orchestration Hub — Power Automate
Power Automate is the central nervous system. When a claim is created in Dataverse:
1. Trigger: "When a row is added" on Claims table
2. Parallel branch 1: Call Azure AI Document Intelligence for each uploaded document
3. Parallel branch 2: Call Azure AI Search to validate policy coverage
4. Parallel branch 3: Call MCP/external APIs for validation checks
5. Wait for all branches to complete
6. Run adjudication logic (Azure OpenAI call)
7. Based on confidence score, route to:
   - Auto-approve flow (update claim status, notify policyholder)
   - Teams Adaptive Card flow (send card to adjuster channel)
   - Escalation flow (notify senior adjuster + CSR)
8. Log every step to Decision_Rationale table

### Layer 3: The Agentic Swarm

#### Intake Agent (Copilot Studio)

> **Source of truth for all questions, branches, and Dataverse columns is [`intake_data_spec.md`](intake_data_spec.md).** That file defines the universal flow, 11 loss-type branches, reusable sub-flows (other-party, witness, injury-triage), documents matrix, escalation triggers, and Copilot Studio topic structure. The summary below is just orientation — when building, follow the spec.

Topics to build (one parent + one per loss type):
- **FNOL_Start** (parent): runs universal questions U1–U11, sentiment check, requests universal documents, then switches on LossType (U5) to the right child topic.
- **FNOL_Collision**, **FNOL_Comp_Weather**, **FNOL_Comp_Theft**, **FNOL_Comp_Vandalism**, **FNOL_Comp_Fire**, **FNOL_Comp_Animal**, **FNOL_Comp_Glass**, **FNOL_Liability_PD**, **FNOL_Liability_BI**, **FNOL_PIP_MedPay**, **FNOL_UM_UIM** (children, one per loss type)
- **SubFlow_OtherParty**, **SubFlow_Witness**, **SubFlow_InjuryTriage** (reusable, called from multiple loss types)
- **FNOL_Confirm**: assembles all answers, calls "Create Claim" Power Automate flow, returns ClaimID to user.

Trigger phrases for FNOL_Start: "file a claim", "report an accident", "I need to make a claim", "my car was damaged", "I had an accident".

Variable naming: prefix all bot variables with `bot.fnol.` (e.g., `bot.fnol.policyId`, `bot.fnol.lossType`, `bot.fnol.collisionSubType`). Pass full bag to Power Automate as JSON string.

- **Missing_Docs**: Triggered by Power Automate when Extraction Agent finds missing documents
  - Response: "To continue processing your claim, we need: [list of missing documents]. Please upload them here."

- **Claim_Status**: Trigger phrases: "what's my claim status", "check my claim", "where is my claim"
  - Ask: What is your claim number?
  - Action: Look up claim in Dataverse
  - Response: Current status + any pending items

- **Escalate_To_Human**: Trigger when user says "speak to a person", "transfer me", or when empathy engine detects distress
  - Action: Transfer to live agent with full transcript

#### Policy Agent (Copilot Studio + Azure AI Search)
Implementation approach:
1. Upload sample policy PDFs to Azure Blob Storage
2. Create Azure AI Search index over these PDFs
3. In Copilot Studio, add Azure AI Search as a Knowledge Source
4. Create topic "Policy_Check" that:
   - Receives: PolicyID + IncidentType from Intake Agent or Power Automate
   - Queries: "Is [IncidentType] covered under policy [PolicyID]? What is the deductible? Are there exclusions?"
   - Returns: Coverage (yes/no), Deductible amount, Applicable exclusions, Policy clause reference
   - Logs: Policy reference to Decision_Rationale

Alternative implementation (more reliable for hackathon):
- Build as a Power Automate flow that calls Azure AI Search API directly
- Parse the response with Azure OpenAI to extract structured coverage data
- This avoids multi-agent handoff limitations

#### Extraction Agent (Power Automate + Azure AI Document Intelligence)
Power Automate flow:
1. Trigger: "When a row is added" on Documents table
2. Get the uploaded file from Dataverse/SharePoint
3. Call Azure AI Document Intelligence:
   - For invoices/bills: Use prebuilt Invoice model
   - For receipts: Use prebuilt Receipt model
   - For IDs: Use prebuilt ID Document model
   - For damage photos: Use Azure OpenAI GPT-4o Vision to assess damage
   - For FIR/police reports: Use Layout model for text extraction
4. Parse the response JSON
5. Update Documents table with ExtractedData JSON
6. Check for missing required fields → flag MissingFields
7. Check photo quality (Azure OpenAI: "Is this photo clear enough to assess damage?")
8. Log extraction results to Decision_Rationale

Document requirements per claim type (US):
- **Auto (Collision / Comprehensive)**: Damage photos (min 2 angles), State Driver's License, Vehicle Title/Registration, Insurance Card, Police Report (if filed), Repair estimate from DRP or chosen shop
- **Auto (Third Party / Liability)**: Same as above + other party's carrier, policy #, license, registration; witness contacts
- **Health (PIP / MedPay)**: Hospital bills (HCFA-1500/UB-04), discharge summary, prescription receipts, State ID
- **Property**: Damage photos, contractor estimate, proof of ownership (deed/title)

#### Validation Agent (MCP Tools + Power Automate)
Power Automate flow:
1. Trigger: Parallel branch from orchestration
2. Actions (each logged to Glass Box):
   - Weather check: Call weather API with claim date + location → confirm weather event
   - Duplicate check: Query Dataverse for claims with same PolicyID + similar date/description
   - Estimate validation: Compare repair estimate against average for that damage type/region
   - (Stretch) Contractor verification: Check contractor license against public registry
3. Return validation results as JSON
4. Log each check to Decision_Rationale

For hackathon demo: Mock the external APIs with simple Power Automate HTTP responses or hardcoded data. The architecture matters more than real API connections.

#### Adjudication Agent (Azure OpenAI + Power Automate)
Power Automate flow:
1. Trigger: All parallel branches complete
2. Gather: Policy Agent results + Extraction results + Validation results
3. Call Azure OpenAI with structured prompt:
   ```
   You are an insurance claim adjudicator. Based on the following data, provide:
   1. Recommendation: APPROVE / DENY / PARTIAL / ESCALATE
   2. Confidence Score: 0-100
   3. Recommended Settlement Amount (if approve/partial)
   4. Explanation in plain English (2-3 sentences)

   Policy Coverage: [from Policy Agent]
   Extracted Claim Data: [from Extraction Agent]
   Validation Results: [from Validation Agent]
   Missing Documents: [list]
   ```
4. Parse response
5. Update Claims table with ConfidenceScore, Recommendation, SettlementAmount
6. Route based on confidence:
   - 90+: Run auto-approve sub-flow
   - 60-90: Send Teams Adaptive Card
   - <60: Trigger escalation
7. Log complete rationale to Decision_Rationale

### Layer 4: Data & Audit (Dataverse)

#### Glass Box Logging Pattern
Every agent action follows this pattern:
```
Create row in Decision_Rationale:
- ClaimID: [current claim]
- AgentName: "Extraction Agent" (or Policy/Validation/Adjudication)
- Action: "Extracted invoice data" (or "Validated coverage", "Checked weather", etc.)
- PolicyReferenceUsed: "Section 4.2 - Comprehensive Coverage" (if applicable)
- DataPointsConsidered: JSON of input data used
- ConfidenceContribution: How this step affected overall confidence
- ExternalAPIResult: Raw API response (if applicable)
- HumanReadableExplanation: "Extracted 5 line items from contractor invoice totaling $4,200. Missing: date of service."
```

## Teams Adaptive Card Design (For Adjusters)

The card sent to adjusters in Teams should contain:
```json
{
  "type": "AdaptiveCard",
  "body": [
    { "type": "TextBlock", "text": "New Claim for Review", "size": "large", "weight": "bolder" },
    { "type": "FactSet", "facts": [
      { "title": "Claim #", "value": "CLM-2024-4521" },
      { "title": "Policy", "value": "POL-2024-0847 (Active)" },
      { "title": "Type", "value": "Auto - Own Damage" },
      { "title": "Incident Date", "value": "April 10, 2026" },
      { "title": "Confidence", "value": "74% (Medium)" },
      { "title": "Recommended", "value": "Approve - $3,200" }
    ]},
    { "type": "TextBlock", "text": "AI Summary", "weight": "bolder" },
    { "type": "TextBlock", "text": "Front bumper damage from collision. Policy covers comprehensive own damage. Deductible $500 applied. Repair estimate $3,700. No fraud signals. Weather confirmed rainy conditions at location.", "wrap": true },
    { "type": "TextBlock", "text": "Reason for Review: Repair estimate is 1.8x regional average for this damage type.", "wrap": true, "color": "attention" }
  ],
  "actions": [
    { "type": "Action.Submit", "title": "Approve ($3,200)", "data": { "action": "approve", "amount": 3200 } },
    { "type": "Action.Submit", "title": "Approve with Adjustment", "data": { "action": "adjust" } },
    { "type": "Action.Submit", "title": "Deny", "data": { "action": "deny" } },
    { "type": "Action.Submit", "title": "Request More Info", "data": { "action": "moreinfo" } }
  ]
}
```

## Sample Data for Demo

### Sample Policies (Create 5 in Dataverse — US format)
US shorthand for liability: `100/300/50` = $100k per-person BI / $300k per-accident BI / $50k PD.

1. POL-2026-0847: **Sarah Chen** · CA · Auto: BI/PD 100/300/50 + Collision $500 ded + Comp $500 ded + UM/UIM 100/300 · Active
2. POL-2026-1123: **Michael Johnson** · TX · Auto: BI/PD 50/100/25 + Collision $1k ded + Comp $1k ded · Active
3. POL-2026-0592: **Jennifer Rodriguez** · FL (no-fault state) · Auto: BI/PD 25/50/10 + PIP $10k + Comp $500 ded · Active
4. POL-2026-0331: **David Park** · NY (no-fault state) · Auto: BI/PD 100/300/50 + PIP $50k + Collision $500 ded · Active
5. POL-2026-0998: **Amanda Williams** · OH · Auto: BI/PD 25/50/25 only (state minimum) · **Expired** (for denial demo)

### Demo Scenario 1: Simple Auto-Approve (via Mobile App / Web Chat)
- Policyholder: **Sarah Chen** (POL-2026-0847), CA
- Incident: Parking-lot fender bender, front bumper damage
- Uploads: 2 clear damage photos, CA Driver's License, Insurance Card, repair estimate ($2,800) from DRP shop
- Validation: NOAA confirms clear weather (real API call), NHTSA confirms no recalls (real API call), DMV mock returns clean record, ISO ClaimSearch mock returns no duplicates
- Expected: All docs present, policy valid, low amount, no flags → Auto-approve, confidence 94%, settlement $2,300 ($2,800 − $500 Collision deductible)
- **Pitch angle**: *"This would have taken 14 days at State Farm. We did it in 90 seconds."*

### Demo Scenario 2: Complex Escalation (via Teams)
- Policyholder: **Jennifer Rodriguez** (POL-2026-0592), FL (no-fault state)
- Incident: Water damage to vehicle from alleged storm + minor injury (PIP)
- Uploads: Damage photos (one blurry), contractor estimate ($18,500)
- Missing: No NOAA-corroborating storm event at location/time
- Fraud signals (visible in Glass Box):
  - Estimate is 2.3× regional average for water damage
  - **ISO ClaimSearch mock** shows neighbor at same address filed similar claim 6 months ago
  - **NICB mock** flags the named contractor
- Telematics: **Suraj's mocked sensor stream** shows no g-force event at incident time
- Expected: Confidence 58% → Tier 2 Teams Adaptive Card → adjuster reviews and approves with adjustment to $8,000
- **Pitch angle**: *"Every flag and every decision is logged in Glass Box — Colorado SB21-169 compliance artifact generated automatically."*

## Implementation Priority Order
Build in this exact order to ensure you always have something demoable:

### Phase 1: Minimum Viable Demo (Week 1)
1. Create Dataverse tables with sample data
2. Build Intake Agent in Copilot Studio (Web Chat only)
3. Build basic claim creation flow in Power Automate
4. Test: Submit a claim via web chat → see it in Dataverse

### Phase 2: Intelligence Layer (Week 2)
5. Integrate Azure AI Document Intelligence
6. Build Policy Agent (Azure AI Search RAG)
7. Build Adjudication logic (Azure OpenAI call)
8. Build Glass Box logging
9. Deploy to WhatsApp channel
10. Test: Submit claim → documents extracted → policy checked → recommendation generated

### Phase 3: Human-in-Loop & Polish (Week 3)
11. Build Teams Adaptive Card for adjusters
12. Build notification flows (claim received, approved, denied)
13. Build Explanation Agent logic
14. Build Power BI dashboard
15. Demo preparation and rehearsal
