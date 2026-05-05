# Glass Box AI — Hack2Future Hackathon

## Context
We are a 4–5 person team at <HOST_ORG> building "Glass Box AI" for the Hack2Future hackathon, Business Challenge 2: Insurance Agentic Claims Processing Solution. We are NEW to Microsoft Power Platform and Azure AI. Claude is our primary coding and implementation partner.

## What We Are Building
An agentic AI system with 5 specialized micro-agents that process insurance claims end-to-end across 6 channels (WhatsApp, Web Chat, SMS, Email, Teams, Voice), with every AI decision logged in an explainable "Glass Box" audit trail.

## Required Tech Stack (ONLY use these)
- Copilot Studio — conversational agents, multi-channel deployment
- Azure AI Document Intelligence — OCR, document extraction
- Azure AI Search — RAG over policy PDFs
- Azure OpenAI — reasoning, adjudication logic
- Power Automate — orchestration, workflows, notifications
- Dataverse — data store, Glass Box audit trail
- Microsoft Teams — adjuster/CSR interface, Adaptive Cards
- MCP Tools — external API connections
- Azure Communication Services — WhatsApp, SMS channels

## The 5 Agents
1. **Intake Agent** (Copilot Studio) — FNOL receiver across all channels, empathetic tone, captures incident data, creates claim in Dataverse
2. **Policy Agent** (Copilot Studio + Azure AI Search) — RAG over policy PDFs, answers coverage/deductible/exclusion questions
3. **Extraction Agent** (Power Automate + Azure AI Document Intelligence) — extracts data from photos, bills, invoices, IDs, flags missing docs
4. **Validation Agent** (MCP Tools + Power Automate) — external fact-checking: weather APIs, contractor verification, duplicate detection
5. **Adjudication Agent** (Azure OpenAI + Dataverse) — synthesizes all agent outputs, calculates confidence score, generates recommendation + explanation

Plus an **Explanation Agent** that post-resolution reaches out to policyholders with plain-English settlement explanations.

## Decision Routing
- **90%+ confidence** → Auto-approve (zero human touch)
- **60–90%** → Teams Adaptive Card to adjuster (one-click approve/deny)
- **<60%** → Escalate to live human CSR with full context

## How Claude Must Help
1. **Always provide step-by-step instructions** — we are beginners on these Microsoft tools
2. **Write actual implementable code/configs** — not conceptual descriptions
3. **For Copilot Studio** — describe exact topic names, trigger phrases, node types, variable names, and settings
4. **For Power Automate** — describe exact trigger type, action names, expressions, and connections step by step
5. **For Dataverse** — provide exact table names, column names, data types, and relationships
6. **For Azure services** — provide exact API calls, endpoints, and configuration steps
7. **Always log to Glass Box** — every agent action must write to the Decision_Rationale table
8. **Prioritize working demo** — we need a functional prototype, not production-grade. Hardcoded sample data is fine.
9. **When something is not feasible**, say so immediately and suggest the closest alternative
10. **Include screenshots guidance** — tell us what we should see on screen at each step so we can verify we did it right

## Dataverse Tables (Reference)
- **Policies**: PolicyID, HolderName, HolderEmail, HolderPhone, PolicyType, CoverageDetails, Limits, Deductible, StartDate, EndDate, Status
- **Claims**: ClaimID, PolicyID, Channel, IncidentDate, IncidentType, Description, Location, Status, ConfidenceScore, Recommendation, AssignedAdjuster, SettlementAmount
- **Documents**: DocID, ClaimID, DocumentType, FileName, ExtractedData (JSON), QualityScore, MissingFields
- **Communications**: CommID, ClaimID, Direction, Channel, MessageContent, Timestamp, AgentName
- **Decision_Rationale**: LogID, ClaimID, AgentName, Action, PolicyReferenceUsed, DataPointsConsidered, ConfidenceContribution, ExternalAPIResult, HumanReadableExplanation

## Current Sprint Phase
Update this as you progress:
→ CURRENT: Week 1 — Environment setup, Dataverse tables, Intake Agent, Extraction pipeline
