# Architectural Decisions Log

Lightweight ADR-style log. Append a new entry whenever the team makes a design choice that future-us would otherwise have to re-derive.

Format:
```
## YYYY-MM-DD — <Title>
Context: <what problem / forcing function>
Decision: <what we chose>
Consequence: <what this enables / costs>
```

---

## 2026-05-04 — Policy Agent built as Power Automate, not Copilot Studio multi-agent
Context: Knowledge file `03_implementation_tips.md` flags that Copilot Studio's master agent summarizes sub-agent responses and may strip citations/links. The Glass Box differentiator depends on preserving exact policy clause references.
Decision: Build the Policy Agent as a Power Automate flow that calls Azure AI Search API directly, then uses Azure OpenAI to extract structured coverage data. Copilot Studio is reserved for user-facing conversation only (Intake, Explanation).
Consequence: Citations preserved end-to-end. Slight loss of "look how cool multi-agent is" demo narrative — recover by showing the parallel branches in Power Automate.

## 2026-05-04 — MCP validation mocked via Power Automate HTTP triggers
Context: Real MCP wiring (weather, contractor registry, fraud lookup) needs API keys, accounts, possibly vendor approval. Hackathon timeline doesn't justify it.
Decision: Each external check is a separate Power Automate flow with "When a HTTP request is received" trigger that returns hardcoded JSON. The Validation Agent calls these like real APIs.
Consequence: Demo looks identical to real integration. If asked, we say "production swaps these endpoints for real APIs — interface is unchanged." Tip file Option 2 path.

## 2026-05-04 — Voice/IVR dropped from live demo
Context: Voice channel requires Dynamics 365 Contact Center license, almost certainly not in our tenant. Listed as P3 in `02_architecture.md`.
Decision: Show Voice in the architecture diagram and pitch deck only. Don't attempt live deployment. Live demo channels = Web Chat + Teams + Email + (WhatsApp if Day 1 test passes).
Consequence: Pitch becomes "5 channels live, Voice in roadmap" instead of "6 channels". More honest, less risky.

## 2026-05-04 — Azure OpenAI model = GPT-4.1 or GPT-5
Context: Day 1 task originally said "deploy GPT-4o", but tip file notes GPT-4o was retired Oct 2025.
Decision: Deploy GPT-4.1 (preferred) or GPT-5 if available in our region. Update Adjudication and Explanation Agent prompts accordingly.
Consequence: One Day 1 checklist item corrected. No downstream changes — APIs are compatible.

## 2026-05-05 — Pivot to US auto-insurance market framing
Context: Original brief was geography-neutral but skewed India (FIR, RC book, RTO, IRDAI surveyor, WhatsApp-first). US market is ~$310B personal auto premium and offers a much stronger pitch lever — Glass Box maps directly to Colorado SB21-169, NAIC AI Model Bulletin (20+ states), NY DFS Circular Letter No. 7, and CA AB 2930. Regulatory compliance becomes the #1 selling point, not just empathy/speed.
Decision: All sample data, agent prompts, validation APIs, and demo scenarios use US-specific terminology (VIN, Driver's License by state, DMV, DRP shops, Police Report, Insurance Card, no-fault vs at-fault state routing). Five sample policyholders rewritten for US (Sarah Chen CA, Michael Johnson TX, Jennifer Rodriguez FL no-fault, David Park NY no-fault, Amanda Williams OH expired). WhatsApp dropped from primary channel mix; replaced with **Mobile App** (Copilot Studio web chat styled as a phone frame). Full mapping in `docs/us_market_context.md`.
Consequence: Pitch leads with "Colorado-compliant by design." Channel mix becomes Mobile App + Web + SMS + Email + Teams. Demo scenarios rewritten — Sarah Chen CA fender bender (auto-approve) and Jennifer Rodriguez FL water damage (escalation with ISO ClaimSearch + NICB + telematics flags).

## 2026-05-05 — Two real public APIs (NOAA + NHTSA), rest mocked
Context: All external validation was originally going to be mocked. Both NOAA Weather (api.weather.gov) and NHTSA Recalls (vpic.nhtsa.dot.gov) are free, public, no-auth APIs. Wiring them up is a half-day each.
Decision: Validation Agent calls NOAA and NHTSA for real. ISO ClaimSearch, NICB, CARFAX, DMV, KBB, telematics all remain mocked Power Automate HTTP-trigger flows.
Consequence: When judges ask "is anything actually real?" — yes, two of the eight validation APIs. Adds ~1 day of work (Person 3) but earns credibility.

## 2026-05-05 — Telematics mocked, Fitbit deferred to roadmap
Context: Suraj proposed full IoT (InfluxDB sensor stream) and Fitbit (heart-rate / health) integrations as differentiators. Telematics is genuinely valuable for fraud detection (g-force corroboration). Fitbit adds an OAuth dance and minimal demo value for an *auto* claim.
Decision: Telematics shipped as a Power Automate HTTP-trigger flow returning a pre-recorded sensor stream (g-force spike at incident time, GPS match). Pitched as "InfluxDB-backed sensor adapter, currently mocked, production interface unchanged." Fitbit removed from sprint scope; appears on the roadmap slide for PIP/MedPay claim corroboration.
Consequence: Suraj owns telematics mock + roadmap deck. No real OAuth or InfluxDB build in 3 weeks.

## 2026-05-05 — Team role assignments
Context: Five generic Person 1–5 placeholders + two named SMEs.
Decision: **Prasad** owns Policy data and RAG (components 9, 10 in `us_market_context.md` Table 1). **Suraj** owns telematics mock + Fitbit roadmap. Person 1–5 still TBD by name; structural roles unchanged.
Consequence: Two domain owners locked in. Daily-task file references map cleanly to people.
