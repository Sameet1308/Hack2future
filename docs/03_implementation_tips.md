# Glass Box AI — Implementation Tips, Known Limitations & Gotchas

## Copilot Studio Tips

### Multi-Agent Orchestration
- Multi-agent orchestration is GA as of April 2026 in Copilot Studio
- Use CHILD AGENTS (embedded within parent) for tightly coupled logic
- Use CONNECTED AGENTS for independently operated capabilities
- KNOWN LIMITATION: Master agent summarizes sub-agent responses and may strip citations/links
- WORKAROUND: For the processing pipeline (Extraction, Validation, Adjudication), use Power Automate flows instead of agent-to-agent delegation. Only use Copilot Studio agents for user-facing conversations (Intake, Policy queries, Explanation).

### Channel Deployment
- Web Chat: Always works. Deploy first. Test everything here before other channels.
- Teams: Straightforward. Second channel to deploy.
- WhatsApp: GA since September 2025. Requires Azure Communication Services + WhatsApp Business account + Meta approval. TEST ON DAY 1 — if it doesn't work in your tenant, don't waste time. Demo via web chat + show WhatsApp as architecture.
- SMS: Requires Azure Communication Services. Simpler than WhatsApp.
- Voice/IVR: Requires Dynamics 365 Contact Center license. Likely NOT available. Show in architecture only.
- Email: NOT a native Copilot Studio channel. Handle via Power Automate monitoring a shared mailbox.

### Copilot Studio Best Practices
- Use Generative Orchestration (not Classic) — it's smarter at routing
- Write CLEAR topic descriptions — the orchestrator uses these to decide which topic to trigger
- Use GPT-4.1 or GPT-5 as the orchestration model (GPT-4o was retired Oct 2025)
- For file uploads in conversation: use the "File upload" node type
- For calling Power Automate: use "Call an action" node → select your cloud flow
- For RAG: add Azure AI Search as a Knowledge Source in agent settings

## Power Automate Tips

### Parallel Processing Pattern
Use "Parallel branch" in Power Automate to run agents simultaneously:
```
Trigger: When a row is added (Dataverse - Claims)
├── Branch 1: Call Azure AI Document Intelligence
├── Branch 2: Call Azure AI Search (Policy check)
├── Branch 3: Call external APIs (Validation)
[All branches complete]
└── Call Azure OpenAI (Adjudication)
```

### Calling Azure AI Services from Power Automate
- Use the HTTP action with the service endpoint URL
- Set headers: Ocp-Apim-Subscription-Key (for Document Intelligence), api-key (for OpenAI)
- Parse JSON action after each HTTP call to extract structured data
- Store results in Dataverse using "Add a new row" action

### Email Monitoring Pattern
- Trigger: "When a new email arrives" (Office 365 Outlook connector)
- Condition: Subject contains "claim" or sent to claims@yourdomain.com
- Actions: Extract attachments, create claim in Dataverse, save attachments, trigger processing

### Error Handling
- Always add "Configure run after" on critical actions (set to run on failure too)
- Add a "Compose" action logging errors to Decision_Rationale for Glass Box
- For demo: add Try-Catch scopes around external API calls

## Azure AI Document Intelligence Tips

### Pre-built Models to Use
- **prebuilt-invoice**: Best for contractor estimates, repair bills
- **prebuilt-receipt**: Best for medical receipts, small bills
- **prebuilt-idDocument**: Best for driving licenses, ID proofs
- **prebuilt-layout**: Best for FIR copies, police reports (general text extraction)
- **For damage photos**: DON'T use Document Intelligence. Use Azure OpenAI GPT-4o Vision instead.

### API Call Pattern
```
POST https://{endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-11-30
Headers:
  Content-Type: application/json
  Ocp-Apim-Subscription-Key: {key}
Body:
  { "urlSource": "{document_url}" }
  OR
  { "base64Source": "{base64_encoded_document}" }
```
Response is async — poll the operation URL until status is "succeeded".

### For Hackathon Demo
- Prepare clean sample documents in advance (clear photos, real-looking invoices)
- Test each document type with Document Intelligence BEFORE the demo
- Have backup extracted data in Dataverse in case the API is slow during live demo

## Azure AI Search (RAG) Tips

### Setting Up Policy RAG
1. Create Azure AI Search resource
2. Create a Blob Storage container, upload sample policy PDFs
3. Create an indexer that points to the blob container
4. Use "Integrated vectorization" for semantic search
5. In Copilot Studio: Settings → Knowledge → Add Knowledge → Azure AI Search → connect

### Sample Policy PDF Structure
Create 2-3 realistic policy PDFs with sections like:
- Section 1: Policy Details (policy number, holder name, dates)
- Section 2: Coverage (what's covered — collision, comprehensive, theft, etc.)
- Section 3: Limits and Deductibles (dollar amounts per coverage type)
- Section 4: Exclusions (what's NOT covered — wear and tear, intentional damage, etc.)
- Section 5: Claims Procedure (how to file, required documents)

## Dataverse Tips

### Column Types
- Use "Choice" columns for Status, Channel, IncidentType, DocumentType (not free text)
- Use "Lookup" columns for relationships (Claims.PolicyID → Policies)
- Use "Multiline Text" for Description, MessageContent, HumanReadableExplanation
- Use "Whole Number" for ConfidenceScore (0-100)
- Use "Currency" for SettlementAmount, Limits, Deductible
- Use "Date and Time" for all date fields
- ExtractedData: Use "Multiline Text" and store JSON strings

### Auto-numbering
- Set ClaimID column to auto-number format: "CLM-{YYYY}-{SEQNUM:4}"
- Set PolicyID to: "POL-{YYYY}-{SEQNUM:4}"

## Teams Adaptive Cards Tips

### Sending from Power Automate
- Use "Post adaptive card and wait for a response" action (Teams connector)
- Post to a specific channel (e.g., "Claims Review" channel)
- The action WAITS for the adjuster to click a button
- Capture the response data (which button, any input values)
- Use the response to update claim status in Dataverse

### Design Tips
- Keep cards under 30KB (Teams limit)
- Use FactSet for structured data (claim details)
- Use TextBlock with "wrap": true for AI summary
- Use Action.Submit for buttons (max 6 actions)
- Use "color": "attention" (orange) for warnings/flags
- Use "color": "good" (green) for positive indicators

## MCP Tools Tips

### For Hackathon: Mock External APIs
Rather than connecting to real external APIs (which may require keys, accounts, etc.):

Option 1: Create simple Azure Functions that return mock data:
- Weather API mock: Always returns "Heavy rain confirmed on [date] at [location]"
- Contractor API mock: Returns "License #12345 - Active and Valid"
- Duplicate check: Query Dataverse directly

Option 2: Use Power Automate HTTP Request trigger to create mock endpoints:
- Create a flow with "When a HTTP request is received" trigger
- Return hardcoded JSON response
- Call this URL from your Validation Agent

Option 3: If MCP is too complex, use Power Automate Premium connectors:
- HTTP connector to call any REST API
- This achieves the same result without MCP protocol complexity

## Glass Box Implementation Pattern

### Standard Logging Function (Power Automate)
Create a child flow called "Log_To_GlassBox" that every agent calls:
- Input: ClaimID, AgentName, Action, PolicyRef, DataPoints, ConfidenceContribution, APIResult, Explanation
- Action: Create row in Decision_Rationale table
- This ensures consistent logging format across all agents

### Reading Glass Box for Explanation Agent
When the Explanation Agent needs to explain a decision:
1. Query Decision_Rationale where ClaimID = [current claim]
2. Sort by Timestamp
3. Concatenate all HumanReadableExplanation entries
4. Send to Azure OpenAI: "Summarize this claim journey into a friendly 3-4 sentence explanation for the policyholder: [Glass Box entries]"
5. Send the summary to the policyholder via their original channel

## Demo Day Checklist
- [ ] Sample data loaded in Dataverse (5 policies, 0 claims — create claims during demo)
- [ ] Sample documents ready (damage photos, invoice PDF, driving license image)
- [ ] Web Chat working and tested
- [ ] WhatsApp working (or backup: show architecture diagram)
- [ ] Email flow working (or backup: trigger manually)
- [ ] Teams Adaptive Card tested
- [ ] Power BI dashboard connected to Dataverse
- [ ] Backup video recorded of both demo scenarios
- [ ] Demo script printed for presenter
- [ ] Roles assigned: presenter, demo driver, Q&A handler
- [ ] 10+ dry runs completed
