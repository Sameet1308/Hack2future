# Glass Box AI — Day-by-Day Task Breakdown

## WEEK 1: Foundation

### Day 1: Environment Verification
**Goal: Confirm we have access to everything we need**

Tasks for the WHOLE TEAM:
- [ ] Login to Power Platform (make.powerapps.com) — confirm Copilot Studio access
- [ ] Login to Azure Portal (portal.azure.com) — confirm subscription access
- [ ] Create a Resource Group: "GlassBoxAI-Hackathon"
- [ ] Create Azure AI Document Intelligence resource in the resource group
- [ ] Create Azure AI Search resource in the resource group
- [ ] Create Azure OpenAI resource (or confirm existing one) — deploy GPT-4.1 or GPT-5 model (GPT-4o retired Oct 2025)
- [ ] Test WhatsApp channel availability in Copilot Studio (Settings → Channels → look for WhatsApp)
- [ ] Create a Teams channel: "Glass Box AI - Claims Review"

If WhatsApp is NOT available: Don't panic. Web Chat + Email + Teams = 3 solid channels. Show WhatsApp in architecture.

### Day 2: Dataverse Setup + Sample Data
**Goal: All 5 tables created with sample data**

Person 3 (Data Lead) does this. Ask Claude:
"Help me create the 5 Dataverse tables for Glass Box AI with exact column definitions, choice options, and relationships. Then help me create 5 sample policy records."

### Day 3-4: Intake Agent
**Goal: A working chatbot that takes claim details and saves to Dataverse**

Person 1 (Copilot Studio Lead) does this. Ask Claude:
"Help me build the Intake Agent in Copilot Studio. I need the FNOL topic that asks for incident details, accepts photo uploads, and creates a claim record in Dataverse. Give me step-by-step instructions with exact settings."

### Day 5-6: Extraction Pipeline
**Goal: Upload a document → get extracted data in Dataverse**

Person 2 (Azure AI Lead) does this. Ask Claude:
"Help me build a Power Automate flow that triggers when a document is added to the Documents table in Dataverse, sends it to Azure AI Document Intelligence, parses the response, and updates the ExtractedData column. Start with the prebuilt-invoice model."

### Day 7: Integration Test + Glass Box
**Goal: Submit a claim via web chat → see it processed with audit trail**

Person 3 + Person 4. Ask Claude:
"Help me create the Glass Box logging flow — a reusable Power Automate child flow that writes to Decision_Rationale table. Then help me add Glass Box logging to the Extraction Agent flow we built on Day 5."

---

## WEEK 2: Intelligence & Channels

### Day 8-9: Policy Agent (RAG)
**Goal: Ask "Is collision covered?" and get answer from policy PDF**

Person 2 (Azure AI Lead). Ask Claude:
"Help me set up Azure AI Search to index policy PDFs from blob storage, then connect it as a Knowledge Source in Copilot Studio so the Policy Agent can answer coverage questions."

### Day 10-11: Validation Agent + Adjudication Agent
**Goal: External checks done, confidence score calculated**

Person 2 + Person 3. Ask Claude:
"Help me build the Validation Agent as a Power Automate flow that does a mock weather check and duplicate claim check, then build the Adjudication Agent that calls Azure OpenAI to synthesize all results into a confidence score and recommendation."

### Day 12: Power Automate Orchestration
**Goal: All agents triggered in parallel when claim is created**

Person 3 (Power Automate Lead). Ask Claude:
"Help me build the master orchestration flow in Power Automate that triggers when a claim is created, runs Extraction + Policy + Validation in parallel, waits for all to complete, then runs Adjudication and routes to the right tier."

### Day 13-14: Multi-Channel Deployment
**Goal: Working on WhatsApp (or SMS) + Email + Web + Teams**

Person 1 (Copilot Studio Lead). Ask Claude:
"Help me deploy my Copilot Studio Intake Agent to WhatsApp using Azure Communication Services. Give me step-by-step instructions."

Person 4: Set up email monitoring flow.

---

## WEEK 3: Human-in-Loop & Demo

### Day 15-16: Teams Adaptive Cards + CSR Bot
**Goal: Adjusters can approve/deny claims in Teams**

Person 4 (Teams Lead). Ask Claude:
"Help me build a Power Automate flow that sends a rich Adaptive Card to the Claims Review channel in Teams when a claim hits Tier 2, with one-click approve/deny buttons, and processes the adjuster's response back to Dataverse."

### Day 17-18: Explanation Agent + Dashboard
**Goal: Policyholder gets explanation; manager sees dashboard**

Person 1 + Person 5. Ask Claude:
"Help me build the Explanation Agent logic — a Power Automate flow that reads the Glass Box entries for a resolved claim, sends them to Azure OpenAI to generate a friendly explanation, and sends it to the policyholder via their original channel."

Person 5 builds Power BI dashboard connected to Dataverse.

### Day 19: Full Integration Test
**Goal: Both demo scenarios work end-to-end**

WHOLE TEAM runs both scenarios multiple times:
- Scenario 1: Simple claim via web chat → auto-approved in minutes
- Scenario 2: Complex claim → Teams card → adjuster approves → explanation sent

### Day 20: Demo Recording + Backup
**Goal: Backup video ready**

Person 5 records screen capture of both scenarios working perfectly.

### Day 21: Rehearsal Day
**Goal: 10 dry runs minimum**

Practice the 5-minute pitch + live demo. Time it. Fix any issues. Practice Q&A.

---

## Chat Starters for Each Task
Copy-paste these into Claude Project chats:

### Dataverse Setup
"I need to create 5 Dataverse tables for our insurance claims system. The tables are: Policies, Claims, Documents, Communications, and Decision_Rationale. Give me exact step-by-step instructions for creating each table in make.powerapps.com including column names, data types, choice values, and lookup relationships. Also create 5 sample policy records."

### Intake Agent
"I need to build an Intake Agent in Copilot Studio for insurance claims. The agent should have a topic called FNOL_Start that: greets the user empathetically, asks what happened, when, where, their policy number, accepts photo uploads, creates a Claim row in Dataverse, and confirms with the claim number. Give me exact step-by-step instructions for Copilot Studio."

### Extraction Agent
"I need to build a Power Automate flow that processes insurance documents. When a new row is added to the Documents table in Dataverse, it should: get the file, call Azure AI Document Intelligence API (prebuilt-invoice model), parse the extracted fields, update the ExtractedData column with JSON, check for missing fields, and log to the Decision_Rationale table. Give me the exact flow with every action specified."

### Policy Agent
"I need to set up RAG for insurance policy PDFs. Help me: 1) Upload sample policies to Azure Blob Storage, 2) Create an Azure AI Search index, 3) Connect it to Copilot Studio as a Knowledge Source. Then build a Power Automate flow that validates a claim against the policy. Give me step-by-step."

### Adjudication Agent
"I need to build the Adjudication Agent as a Power Automate flow. It receives: policy validation results, document extraction results, and validation check results. It calls Azure OpenAI with a prompt to generate: recommendation (approve/deny/partial/escalate), confidence score (0-100), settlement amount, and plain-English explanation. Then routes to auto-approve, Teams card, or escalation based on confidence. Show me the exact flow."

### Teams Adaptive Card
"I need to build a Power Automate flow that sends a rich Adaptive Card to Microsoft Teams when a claim needs human review. The card should show: claim details, AI summary, policy analysis, fraud indicators, recommended payout, and have Approve/Deny/Request More Info buttons. When the adjuster clicks a button, the flow should update the claim in Dataverse and notify the policyholder. Give me the complete Adaptive Card JSON and the flow steps."
