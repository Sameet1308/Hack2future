# 00 — Cost Guardrails (non-negotiable)

> **Budget**: $55 Azure credits · **Projected spend**: $7-12 · **Safety margin**: ≥ $40

These rules are non-negotiable. If a rule needs to break for a real reason, ADR it in `docs/decisions.md` first.

---

## Rule 1 — Free tier or pay-per-call only. No idle compute.

**Bicep pins these SKUs:**

| Service | SKU pinned | Why |
|---|---|---|
| Azure AI Search | `free` (`sku.name: 'free'`) | 50MB, 3 indexes, 10K docs — fits 5 policy PDFs easily |
| Document Intelligence | `F0` | 500 pages/month free |
| Speech Service | `F0` | 5 audio hours/month free (avatar included) |
| Static Web Apps | `Free` | Already in use |
| Azure Functions | Consumption plan | 1M executions/month free |
| Container Apps env | Consumption only | $0 idle, billed per request |
| Key Vault | Standard | Pennies — operations only |
| Storage Account | Standard_LRS | Pennies at our scale |
| App Insights | 5GB free + 1% sampling | Stays in free quota |
| Bot Service | Direct Line Free | Free for one bot |
| Azure OpenAI | `S0` (no idle cost — pay per token) | See Rule 3 |
| Foundry project | Token-based when called | Zero idle |
| Log Analytics workspace | PerGB2018, 5GB free included | Stays in free quota |

**Bicep enforces all of the above.** If you see anything else in `infra/main.bicep`, that's a bug — file an issue, do not deploy.

---

## Rule 2 — No App Service, no VMs, no AKS, no Premium tiers, no AI Search Basic.

These will eat the budget in a day:

| Service | Why blocked |
|---|---|
| ❌ Azure AI Search Basic | $74/month — $2.45/day from spin-up |
| ❌ App Service Standard S1+ | $50+/month |
| ❌ Azure Container Instances (always-on) | $30+/month for our footprint |
| ❌ AKS | Cluster + node cost |
| ❌ Premium Functions plan | Idle cost |
| ❌ Azure SQL Database | Even Basic = $5+/month |
| ❌ Cosmos DB Provisioned throughput | Burns credits idle |
| ❌ Power BI Embedded (paid service) | Use Power BI Desktop (free) instead |

If any of these get provisioned by accident — `az resource delete` immediately.

---

## Rule 3 — Model selection by environment

| Environment | Adjudication | Extraction (vision) | Notes |
|---|---|---|---|
| **Dev / test** | `gpt-4o-mini` | **MOCKED** (`gbx_use_real_vision = false`) | gpt-4o-mini is ~67× cheaper than gpt-4.1 |
| **Demo (production-mode toggle)** | `gpt-4.1` | `gpt-4o` (vision) | Only for live demo runs in front of judges |
| **Recording / rehearsal** | `gpt-4o-mini` | mocked | Don't burn vision credits on dress rehearsals |

**Adjudication flow checks env var `gbx_demo_mode`:**
- `gbx_demo_mode = false` (default) → calls `gpt-4o-mini`
- `gbx_demo_mode = true` (flipped 5 min before demo) → calls `gpt-4.1`

Same applies to `gbx_use_real_vision`.

---

## Rule 4 — Daily spend check (every morning at 9am)

```bash
# Show today's spend so far
az consumption usage list \
  --start-date $(date +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[].{Service:meterCategory, Cost:pretaxCost, Currency:currency}" \
  -o table

# Show cumulative spend this billing period
az consumption usage list \
  --query "sum([].pretaxCost)" \
  -o tsv
```

**Threshold**: if cumulative ever exceeds **$20**, freeze new resource provisioning and triage. We have $35 of headroom for demo + buffer at that point.

---

## Rule 5 — Kill switch (always one command away)

```bash
# Nuclear option — deletes ALL resources in the RG, runs in background
az group delete --name rg-glassbox-dev --yes --no-wait

# Confirm gone (after a minute or two)
az group exists --name rg-glassbox-dev   # → returns "false" when complete
```

**When to fire kill switch:**
- Cumulative spend hits **$30** (still under $55 with margin)
- We accidentally provisioned a paid-tier resource we can't downgrade
- End of demo day if no follow-up sessions planned

Power Platform resources (Dataverse env, Copilot Studio, Power Automate) are **NOT** in the Azure RG — they survive the kill switch. To delete those, use Power Platform admin centre.

---

## Rule 6 — Mock-vs-real config flags (Dataverse env vars)

These live as **Environment Variables** in the Glass Box AI Solution. Power Automate flows read them at runtime. Flipping any one is a 10-second admin task in the Solution editor.

| Env var | Default | Flip to true for | Cost when true |
|---|---|---|---|
| `gbx_demo_mode` | `false` | Live demo (uses gpt-4.1 instead of gpt-4o-mini) | ~$0.15/demo call |
| `gbx_use_real_vision` | `false` | Demo extraction of real photos | ~$0.05/photo via gpt-4o-mini vision; ~$2.50/photo via gpt-4o full |
| `gbx_use_real_iso` | `false` | When ISO sandbox URL is procured | $0 (sandbox is free for partners) |
| `gbx_use_real_nicb` | `false` | When NICB sandbox URL is procured | $0 |
| `gbx_use_real_carfax` | `false` | When CARFAX sandbox URL is procured | $0 |
| `gbx_use_real_dmv` | `false` | When DMV sandbox URL is procured | $0 |
| `gbx_use_real_kbb` | `false` | When KBB sandbox URL is procured | $0 |
| `gbx_use_real_telematics` | `false` | When telematics sandbox is procured | $0 |

**Rule**: Never set `gbx_demo_mode = true` or `gbx_use_real_vision = true` outside the actual demo window. Flip back to `false` immediately after.

---

## Rule 7 — Tear-down protocol after demo

**If no follow-up sessions scheduled:**
```bash
# 1. Final spend check
az consumption usage list --query "sum([].pretaxCost)" -o tsv

# 2. Save Application Insights data we want (optional, for analysis)
az monitor app-insights query --app glassbox-appins-dev --analytics-query "traces | take 1000" > demo_logs.json

# 3. Kill the Azure RG
az group delete --name rg-glassbox-dev --yes --no-wait

# 4. Confirm
az group exists --name rg-glassbox-dev
```

**If follow-up sessions exist:**
- Set `gbx_demo_mode = false` and `gbx_use_real_vision = false` so dev calls go through cheap models
- Stop the Container Apps replica scale to 0 (`az containerapp revision deactivate ...`) until needed
- Leave everything else — idle cost is negligible

---

## Rule 8 — What to do if AOAI access is denied / rate-limited

- **First fallback**: use `gpt-35-turbo` (cheaper, older — pattern still works, just less impressive output)
- **Second fallback**: mocked adjudication that returns canned `{decision, tier, confidence, payout, rationale}` JSON from a Power Automate static response
- **Demo story**: *"Adjudication is currently using cached responses while AOAI provisioning is in flight — production-final interface is unchanged"* (same line we use for the 6 sandbox validators)

---

## Quick reference card

```
Daily spend check     : az consumption usage list --start-date $(date +%Y-%m-%d) --end-date $(date +%Y-%m-%d)
Cumulative spend      : az consumption usage list --query "sum([].pretaxCost)" -o tsv
Kill switch           : az group delete --name rg-glassbox-dev --yes --no-wait
Demo-mode on          : pac solution publish + update env var gbx_demo_mode=true
Demo-mode off         : update env var gbx_demo_mode=false
Threshold             : freeze provisioning at $20, kill switch at $30
```
