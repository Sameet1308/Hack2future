# 01 — First 30 Minutes (tonight, before anything else)

> If these 4 things aren't done in the first 30 minutes, the rest of Day 1 will be blocked.

---

## Parallel — do all 4 simultaneously, no waiting

### A. Submit Azure OpenAI access request (5 min)
**Owner**: Sameet (or whoever runs the Azure subscription)

1. Go to **https://aka.ms/oai/access**
2. Fill in the form:
   - **Subscription ID**: the one with $55 credits
   - **Models requested**:
     - `gpt-4o-mini` (dev)
     - `gpt-4.1` (demo Adjudication)
     - `gpt-4o` (vision, for Tier B real-mode demo)
   - **Region**: East US 2
   - **Use case** (paste this verbatim):
     > Building Glass Box AI, an agentic Microsoft Power Platform + Azure AI insurance claim processing demo for a Hack2Future hackathon. Adjudication agent uses GPT-4.1 to reason over coverage + extraction + validation. Extraction agent uses GPT-4o vision for accident photos. Explainability writes plain-English rationale to Decision_Rationale audit log. Microsoft-only stack, ~30 demo calls total expected.
3. **Submit**. Approval can take 24-48 hours.

**If access already approved on this subscription** — skip this step, confirm by running:
```bash
az cognitiveservices account list --query "[?kind=='OpenAI'].{Name:name, Location:location, SKU:sku.name}" -o table
```

---

### B. `az login` from this terminal (2 min)
**Owner**: Sameet (or any builder with Azure access)

Open the existing terminal in this Claude session and run:
```bash
az login --use-device-code
```

- Follow the device-code prompt (opens browser, sign in with the Azure account holding the $55 credit)
- After login, confirm:
  ```bash
  az account show --query "{name:name, id:id, tenantId:tenantId}" -o table
  ```
- **Set the active subscription** (if multiple shown):
  ```bash
  az account set --subscription "<subscription-id-from-step-above>"
  ```

Once `az login` is done, **I (Claude) can drive provisioning from this terminal** when we choose to. No clicking through portal.azure.com.

**Important**: I won't run anything that costs money without telling you first.

---

### C. Confirm Power Platform admin access (3 min)
**Owner**: Whoever is the M365 Global Admin or Power Platform Admin in your tenant

1. Go to **https://admin.powerplatform.microsoft.com**
2. Confirm you can see the **Environments** tab
3. If you see *"You need permission"*: M365 Global Admin needs to assign the `Power Platform Administrator` role to your account via https://entra.microsoft.com → Roles → Power Platform Administrator
4. If you can see the tab, you're good

**This is the one step Claude cannot help with** — it's a tenant role assignment that needs an existing admin.

---

### D. Install PAC CLI locally (5 min)
**Owner**: Whoever will drive the Dataverse setup (suggest Abhijit since it's his track)

PAC = Power Platform CLI. Used to create Dataverse environments + tables + import solutions from the command line, without clicking.

**Windows / PowerShell**:
```powershell
# If you have dotnet 6+ installed
dotnet tool install --global Microsoft.PowerApps.CLI.Tool

# Or download the standalone MSI
# https://aka.ms/PowerPlatformCLI
```

Confirm install:
```bash
pac --version
# should show 1.x.x or higher
```

Authenticate PAC against your tenant:
```bash
pac auth create --name glassbox-dev
# follow the prompts to sign in
```

Confirm:
```bash
pac auth list
```

---

## After all 4 are done (= roughly 10-15 min if parallel)

Come back to me in the chat and say **"first 30 done"**. I'll then:

1. Generate `infra/main.bicep` and `infra/deploy.sh`
2. Generate `docs/setup/02_dataverse.md` with the exact PAC CLI commands to create all 9 tables
3. Generate the 5 sample data CSVs
4. Tell you which command to run first (it's the Bicep deploy — provisions Azure resources)

We'll be approximately **30 minutes in** at that point, and the next 90 minutes should land us at the Hello World milestone (web chat → real Dataverse policy lookup).

---

## If something fails

| Problem | Fix |
|---|---|
| AOAI form rejects with "access not available" | Try with `gpt-35-turbo` as the only model — usually instant approval. Adjudication falls back per Rule 8 in `00_cost_guardrails.md`. |
| `az login` fails / no devices | `az logout` then retry. If still failing, sign in via `portal.azure.com` first to confirm credentials, then back to CLI. |
| Can't see Environments tab in Power Platform admin | You need the Power Platform Administrator role. M365 Global Admin assigns via Entra ID → Roles. |
| `pac --version` fails | Path issue. Close terminal, reopen. If still failing, use the standalone MSI from https://aka.ms/PowerPlatformCLI instead of `dotnet tool install`. |

---

## Status check — when "first 30" is truly done

```
[ ] AOAI access request submitted (or already approved)
[ ] az login succeeded — `az account show` returns the right subscription
[ ] Power Platform admin centre is reachable
[ ] pac --version returns a version number
[ ] pac auth list shows the glassbox-dev profile
```

When all 5 are checked → ping me **"first 30 done"** and we move.
