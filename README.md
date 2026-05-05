# Glass Box AI

> An agentic swarm for empathetic insurance claims resolution.
> Hack2Future Business Challenge 2 — 3-week prototype.

## Pitch
Five specialized AI agents process insurance claims end-to-end across WhatsApp, Web Chat, SMS, Email, and Teams. Every decision is logged in an explainable "Glass Box" audit trail — no black-box liability.

## The agents
| Agent | Built in | Job |
|---|---|---|
| Intake | Copilot Studio | First Notice of Loss across all channels |
| Policy | Power Automate + Azure AI Search | RAG over policy PDFs |
| Extraction | Power Automate + Azure AI Document Intelligence | Pull data from photos, bills, IDs |
| Validation | Power Automate (mocked external APIs) | Weather / duplicate / contractor checks |
| Adjudication | Power Automate + Azure OpenAI | Synthesize, score confidence, recommend |
| Explanation | Copilot Studio | Post-resolution policyholder explainer |

## Decision routing
- **≥ 90% confidence** → auto-approve
- **60–90%** → Teams Adaptive Card to adjuster (one-click)
- **< 60%** → live human escalation

## Stack
Copilot Studio · Azure AI Document Intelligence · Azure AI Search · Azure OpenAI · Power Automate · Dataverse · Microsoft Teams · Azure Communication Services

## What's in this repo
This repo is the **planning + knowledge + config snippets** for the build. The actual implementation lives in Power Platform and Azure (no local code to run).

```
.
├── CLAUDE.md           # project context for AI pair-programming
├── CHANGELOG.md        # sprint log
└── docs/
    ├── 01_project_brief.md
    ├── 02_architecture.md
    ├── 03_implementation_tips.md
    ├── 04_daily_tasks.md
    └── decisions.md
```

## Working with this repo
- Pair with Claude using the context in `CLAUDE.md` — it'll auto-load each session.
- Update `CHANGELOG.md` at the end of every working session.
- Log architectural choices in `docs/decisions.md` (ADR-style: context, decision, consequence).

## Demo scenarios
1. **Auto-approved** — minor auto claim via Web Chat → settled in minutes
2. **Escalated** — water-damage claim with fraud signals → Teams Adaptive Card → adjuster decides
