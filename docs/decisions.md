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
