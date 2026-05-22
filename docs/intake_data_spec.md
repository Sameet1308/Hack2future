# Intake Agent — Data Specification

> The source of truth for what the Intake Agent asks claimants and what data lands in Dataverse. Person 1 (Copilot Studio Lead) builds the FNOL_Start topic + branches directly from this spec.

## 0. How to read this doc

- **Universal questions (§2)** are asked for every claim, in order, before any branching.
- **Reusable sub-flows (§3)** are blocks called from multiple loss types — build once, reuse.
- **Per loss-type specs (§4)** are the branched questions specific to each leaf in the taxonomy.
- **Documents matrix (§5)** consolidates upload requirements per loss type.
- **Auto-escalate triggers (§7)** — any one true → claim skips auto-approve regardless of confidence.
- **Dataverse columns (§8)** lists the Claims-table columns to add on top of the base schema in `02_architecture.md`.

Question wording is provided in plain conversational English. Person 1 should keep this tone — terse but warm. **One question per turn**, never compound.

---

## 0.5. Data flow — where claim and policy data live

**Microsoft Dataverse is the source of truth for the agent layer.** Every AI agent reads from and writes to Dataverse only — never directly to the legacy core.

**Policy data origin:** Legacy core systems at the host carrier (Guidewire PolicyCenter or equivalent). Synced into Dataverse via Azure Data Factory event-triggered pipelines, typically &lt;5 minute latency. The Intake Agent's policy lookup (gate check §1.5 #1) hits the Dataverse replica, not the legacy core.

**Claim data direction:** FNOL is created in Dataverse first (`gbx_claim` row insert triggers Master Orchestration). A reverse-direction ADF pipeline pushes the new claim to the legacy core within minutes for actuarial reserving, GL impact, and downstream claims systems. Bidirectional sync is at the **field level — never full-record overwrite**.

**Why this design:**
- Dataverse is the single agent-readable store (matches the Microsoft-only stack mandate)
- The legacy core remains the enterprise SOR for accountants, auditors, actuaries, regulators
- `Decision_Rationale` (Glass Box audit) lives in Dataverse **only** — never pushed to legacy. The AI audit trail is owned end-to-end by the agent layer.

**Fallback for brand-new policies (bound &lt;5 min ago):** Dataverse policy lookup miss → synchronous read-through to legacy via ADF on-demand call, 3-second timeout. If still not found → fall through to gate-check §1.5 #1 failure path.

**Two claim numbers per claim:**
- `gbx_claim_id` — Dataverse autonumber, issued in real time during FNOL, shown to the customer
- `gbx_legacy_claim_id` — legacy core assigns its own once the ADF push lands; stored back on the same Claim row

---

## 1. Loss taxonomy

```
Auto Claim
├── Collision                           [Scenario 1 demo type]
│   ├── Rear-ended (you were rear-ended)
│   ├── I rear-ended someone
│   ├── Head-on
│   ├── Side-swipe
│   ├── T-bone (intersection)
│   ├── Single-vehicle (lost control / object struck)
│   ├── Parked-and-struck
│   └── Hit-and-run
├── Comprehensive (Comp / OTC)
│   ├── Theft (full vehicle)
│   ├── Vandalism / Break-in
│   ├── Weather (hail / flood / wind / lightning)   [Scenario 2 demo type]
│   ├── Fire
│   ├── Animal strike
│   ├── Glass only
│   └── Falling object
├── Liability — Property Damage (PD)
├── Liability — Bodily Injury (BI)
├── PIP / MedPay (own injury)
└── UM / UIM (other driver no/insufficient insurance)
```

Branch point = U5 in §2. Every other branch flows from this answer.

---

## 1.5. Pre-claim-number GATE checks (10 checks — all must pass)

Before the Intake Agent says *"Your claim number is XYZ"*, every one of these 10 checks must succeed. Each maps to a specific Power Automate action in the `Create_Claim` flow, executed in order. If a check fails → don't issue claim #, branch to the remediation path on the right.

**Guiding principle: "Day-1 claim number, always."** A customer never leaves the conversation without either a claim # or a clear reason + a warm human handoff.

| # | Check | What we look at | Failure path |
|---|---|---|---|
| 1 | **Policy exists** | Dataverse `gbx_policy` lookup on U1 input. Fallback: ADF on-demand read-through to legacy core (3s timeout) for very fresh policies. | *"I'm not finding that policy — let me transfer you to someone who can help."* → live agent |
| 2 | **Policy status = ACTIVE on DOL** | `gbx_policy.gbx_status` + effective/expiry vs U3 IncidentDate | ACTIVE → proceed. CANCELLED with DOL before cancel → proceed with coverage-confirmation flag. CANCELLED after cancel → coverage review handoff. LAPSED → check grace period (10-30 days, state-specific). REINSTATED → check reinstatement effective vs DOL. |
| 3 | **Caller identity verified** | Match U2 RelationshipToHolder against `gbx_policy.gbx_named_insured` + `gbx_listed_drivers`. Verify with DOB + last 4 SSN, OR policy + zip + VIN last 6 | 3 failed attempts → live agent (don't try a 4th) |
| 4 | **Excluded-driver check** | `gbx_policy.gbx_excluded_drivers` array vs caller name | **HARD STOP.** Transfer to coverage specialist. Never issue claim # to an excluded driver — that's a coverage void. |
| 5 | **DOL within policy dates** | U3 IncidentDate between policy effective and expiry | Future-dated DOL → reject as suspicious. DOL &gt;30 days ago → still proceed but flag for late-reporting follow-up questions. |
| 6 | **Duplicate claim check** | Dataverse query: any open `gbx_claim` for same policy + DOL ±24h + vehicle? | Match → *"We already have a claim for this — Claim # XYZ. Let me pull that up."* Don't create a duplicate. |
| 7 | **Coverage matches loss type** | U5 LossType vs the policy's coverage matrix (Collision / Comp / Liab / UM-UIM / PIP-MedPay present?) | Mismatch → *"This policy doesn't carry comprehensive coverage — let me explain your options."* Don't issue claim # for an uncovered loss type. |
| 8 | **Vehicle on policy** | VIN/plate match against `gbx_policy.gbx_scheduled_vehicles` | Exceptions: newly-acquired vehicle within 14-30 day auto-coverage window → proceed. Rental vehicle → check rental endorsement. Borrowed vehicle → permissive-use rules by state. |
| 9 | **Minimum FNOL fields complete** | U1, U3, U4, U5, vehicle, U7 InjuryFlag, U11 OtherPartyInvolved | If incomplete: **still issue claim #** with status = `PENDING_INCOMPLETE`. Notification Agent chases missing fields. Customer always leaves with a number. |
| 10 | **SIU pre-flight check** | Three quick fraud signals: policy purchased &lt;60 days before DOL; &gt;2 claims same policy in last 12 months; weekend incident reported Monday | Any signal → issue claim # but pre-flag with `gbx_siu_preflag = Y`. Don't lose the customer over a signal — trace it through adjudication. |

### Output of the gate
- **All 10 pass** → issue claim # immediately, status = `OPEN`
- **Checks 1, 2, 3, 4, 7 fail** → don't issue, transfer to specialist with full conversation transcript
- **Check 9 fails** → issue # with status = `PENDING_INCOMPLETE`, Notification Agent takes over the chase
- **Check 10 flags** → issue # with `gbx_siu_preflag = Y`, SIU sub-agent in the adjudication path runs deeper

### Audit logging
Every gate-check outcome writes one row to `Decision_Rationale` with `agent = 'intake_gate'`, `check_name`, `result`, raw Dataverse query input, and timestamp — so any auditor or judge can trace exactly why a claim # was or was not issued.

---

## 2. Universal questions (asked for EVERY claim)

| # | Question | Field | Type | Required | Source | Notes |
|---|---|---|---|---|---|---|
| U1 | "What's your policy number? (or the phone number on your policy)" | PolicyID lookup | Text | Yes | Claimant | Lookup against Policies table; pull HolderName for confirmation |
| U2 | "Just to confirm — am I speaking with [HolderName]?" | RelationshipToHolder | Choice: self / spouse / authorized driver / family / other | Yes | Claimant | "Other" → flag for consent verification |
| U3 | "When did the incident happen? (date and approximate time)" | IncidentDate, IncidentTime | DateTime | Yes | Claimant | Validate: not in future, not before policy start, not after policy end |
| U4 | "Where did it happen? (address or nearest cross-streets)" | IncidentLocation, IncidentState | Text + State (extracted) | Yes | Claimant | State drives no-fault routing; geocode for NOAA |
| U5 | "What kind of incident was it?" | LossType | Choice (taxonomy in §1) | Yes | Claimant | **Branch point** |
| U6 | "Briefly, what happened? Just tell me in your own words." | NarrativeText | Multiline | Yes | Claimant | Fed to Adjudication LLM; sentiment analyzed for distress |
| U7 | "Was anyone hurt — you, anyone in your vehicle, or anyone else?" | InjuryFlag, InjuredParties | Y/N + multiline if Y | Yes | Claimant | If Y → trigger §3.3 injury-triage block |
| U8 | "Did you call the police?" | PoliceReportFiled | Y/N | Yes | Claimant | If Y → ask report number + responding agency |
| U8a | (if U8=Y) "What's the report number, and which agency responded?" | PoliceReportNumber, RespondingAgency | Text | Conditional | Claimant | |
| U9 | "Is the vehicle still drivable?" | VehicleDrivable | Y/N | Yes (auto only) | Claimant | If N → trigger tow + rental sub-flow |
| U10 | (if U9=N) "Was the vehicle towed? If so, where to?" | VehicleTowed, TowLocation | Y/N + Text | Conditional | Claimant | |
| U11 | "Was anyone else involved — other vehicles, people, or property?" | OtherPartyInvolved | Y/N | Yes | Claimant | If Y → §3.1 (other-party block) called from loss-type branch |

### Universal documents (always requested, before branching)
- Photo of State Driver's License
- Photo of Insurance Card
- Photo of Vehicle Title or Registration

### Sentiment check
Run on U6 narrative via Azure OpenAI. If `distress_score >= 0.7`:
- Set `DistressFlag = Y`
- Soften the next response: "I'm really sorry you're going through this. Take your time."
- At adjudication, override auto-approve → route to Tier 3 even if confidence ≥ 90%

---

## 2.5. Policyholder-centric UX principles (10 rules the Intake Agent must follow)

These are not optional. Every Copilot Studio topic and every channel adapter must honour these. The empathy KPI in §10 is how we measure compliance.

1. **Pre-fill from policy** — never re-ask what's already on the policy. Name, address, vehicle, coverage, deductible all come from the Dataverse policy record. *"Policy 12345"* → next utterance is *"Hi Sara — confirming this is for your 2022 Honda Civic?"* not eight questions about who they are.

2. **Progressive disclosure** — one question per turn, never compound. Loss-type branching skips irrelevant questions (don't ask about other parties on a single-vehicle weather claim).

3. **Sentiment check every turn** — Azure OpenAI sentiment score on each customer turn. Distress detected (`distress_score >= 0.7`) → soften tone, offer human handoff. Set `DistressFlag = Y` on the Claim row.

4. **Plain language, no jargon** — *"the person you hit"* not *"third-party claimant"*. *"your share of the cost"* not *"deductible"* — or define inline the first time. Insurance terms are barriers, not features.

5. **Empathy first sentence after bad news** — *"I'm so sorry that happened. Let's take this one step at a time."* before any data collection. The customer just had an accident.

6. **Confirm before commit** — before generating claim #, summarise back: *"Here's what I have: collision with another vehicle on May 18 in Austin TX, you're not hurt, other driver was cited. Does that look right?"* Only then commit.

7. **One-click escalation always visible** — every channel must surface a "Talk to a person" affordance at all times. Never trap the customer in the bot.

8. **Photo upload everywhere** — drag-drop in web, camera capture in mobile, attachment in email, MMS in SMS. The customer does not switch channels to send a photo.

9. **Save and resume** — temp claim # issued on minimum fields (gate check §1.5 #9). Customer can close the chat / hang up and come back later via "What's my claim status" with the claim # to finish.

10. **Transparency on what's next** — close every successful FNOL with: *"Here's what happens next: email with your claim # in 2 minutes, document checklist within an hour, your adjuster's name within 24 hours. You can check status any time at [URL] or just text 'STATUS' to this number."*

**Conversation length target** (see §10 for full table): **median FNOL completion in ≤14 turns end-to-end**. If a topic regularly exceeds 18 turns in production telemetry, the topic gets refactored — it's failing the empathy KPI.

---

## 3. Reusable sub-flows

### 3.1 Other-party-info block (called when U11 = Y)

| # | Question | Field | Required |
|---|---|---|---|
| O1 | "What's the other driver's full name?" | OtherDriverName | Yes |
| O2 | "Phone number?" | OtherDriverPhone | Yes |
| O3 | "Their insurance carrier?" | OtherCarrierName | Yes |
| O4 | "Their policy number, if you have it?" | OtherPolicyNumber | Optional |
| O5 | "Their vehicle — make, model, year, color, license plate?" | OtherVehicleDescription | Yes |
| O6 | "Their state and driver's license number, if you exchanged?" | OtherDriverLicense, OtherDriverState | Optional |
| O7 | "Could you upload a photo of their insurance card and license, if you took one?" | (Documents upload) | Optional |

### 3.2 Witness-info block (offered after other-party block)

| # | Question | Field | Required |
|---|---|---|---|
| W1 | "Were there any witnesses?" | WitnessYN | Yes |
| W2 | (if W1=Y, repeat as needed) "What's the witness's name and phone number?" | Witnesses (JSON array of {name, phone}) | Optional |

### 3.3 Injury-triage block (called when U7 = Y)

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| I1 | "How serious are the injuries?" | InjurySeverity | Choice: minor (no medical) / moderate (urgent care) / severe (hospital) / fatal | Yes | Fatal → IMMEDIATE Tier 3, end conversation, transfer to live CSR |
| I2 | "Who was injured?" | InjuredParties | Multi: claimant / passenger / other-vehicle occupant / pedestrian | Yes | |
| I3 | "Did anyone go to the hospital or get medical treatment?" | TreatmentSought | Y/N + provider name if Y | Yes | Drives PIP/MedPay/BI sub-claim path |
| I4 | "Has anyone been admitted to the hospital?" | HospitalAdmitted | Y/N | Yes | If Y → spawn parallel BI sub-claim |
| I5 | "Are you safe right now? Is there anything urgent we should help with?" | SafetyCheck | Y/N + free text | Yes | Empathy lever; if not safe → live CSR |

If I1 = severe or fatal, OR I3 = Y for non-claimant: spawn parallel **BI claim** and/or **PIP/MedPay claim** sub-records linked to the parent ClaimID.

---

## 4. Per loss-type specs

### 4.1 Collision

**Trigger**: U5 = "Collision (I hit something or got hit)"

**Branch question**

| Question | Field | Choices |
|---|---|---|
| "How did the collision happen?" | CollisionSubType | Rear-ended (you were rear-ended) / I rear-ended someone / Head-on / Side-swipe / T-bone / Single-vehicle / Parked-and-struck / Hit-and-run |

**Loss-specific questions**

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| C1 | "Who was driving your vehicle?" | DriverIdentity | Yes | If "other" → check named-driver coverage |
| C2 | "Best estimate of the speed at impact?" | ApproxSpeed (mph) | Optional | Severity proxy |
| C3 | "Was the airbag deployed?" | AirbagDeployed | Yes | Strong severity signal — auto-escalate trigger |
| C4 | "Whose fault do you think it was?" | FaultAssessment | Yes | Choices: mine / other party's / both / unsure / none (parked) |
| C5 | "What were the road conditions?" | RoadConditions | Yes | Multi: dry / wet / icy / snowy / construction / debris |
| C6 | "What was the visibility like?" | Visibility | Yes | Choice: clear / rain / fog / dark / glare |
| C7 | "Where on your vehicle is the damage?" | DamageAreas | Yes | Multi: front / rear / driver-side / passenger-side / top / undercarriage / interior |
| C8 | (if C5/C6 indicates weather) "Was the weather a factor?" | WeatherFactor | Conditional | Triggers NOAA validation |

**Sub-flows called**: §3.1 if U11=Y, §3.2 after §3.1, §3.3 if U7=Y

**Documents required**

| Document | Required | Why |
|---|---|---|
| Damage photos (4–6 angles) | Yes | Extraction Agent + GPT-4 Vision |
| Police Report | Yes if Hit-and-run, injury, or estimate >$1k threshold | State-dependent |
| Repair estimate | Required before settlement | DRP shop preferred |
| Other party's insurance card photo | Optional | Speeds liability resolution |

**Auto-escalate triggers**: U7=Y · C3=Y · CollisionSubType=Hit-and-run AND no police report · DistressFlag=Y · estimate > $25,000

**Dataverse columns added**: CollisionSubType, DriverIdentity, ApproxSpeed, AirbagDeployed, FaultAssessment, RoadConditions, Visibility, DamageAreas, WeatherFactor

**Conversation length target**: 6–9 turns, 90–120 sec

---

### 4.2 Comprehensive — Weather

**Trigger**: U5 = "Comprehensive — Weather damage"

**Branch question**

| Question | Field | Choices |
|---|---|---|
| "What kind of weather damage?" | WeatherSubType | Hail / Flood / Wind / Lightning / Snow-ice / Falling tree-branch |

**Loss-specific questions**

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| W1 | "When did you first notice the damage?" | DamageDiscoveredAt | Yes | May differ from incident date (slow leaks, hidden hail) |
| W2 | "Where was the vehicle parked or located during the event?" | LocationDuringEvent | Yes | Cross-checked with NOAA |
| W3 | (if Hail) "How big were the hailstones?" | HailSize | Choice: pea / marble / golf-ball / baseball / softball | Optional | Severity + NOAA cross-check |
| W4 | (if Flood) "How high did the water reach on the vehicle?" | FloodWaterLevel | Choice: tires only / floorboard / dashboard / above dashboard / fully submerged | Optional | Above floorboard → likely total loss |
| W5 | (if Falling object) "What fell on the vehicle?" | FallingObject | Text | Conditional | |
| W6 | "Where on the vehicle is the damage?" | DamageAreas | Yes | Multi (same as Collision C7) |
| W7 | "Are there any contents inside damaged too — electronics, child seats?" | ContentsDamaged | Y/N + list if Y | Optional | Personal property — separate sub-claim path |

**Sub-flows called**: §3.3 if U7=Y (rare for weather but possible — falling tree)

**Documents required**

| Document | Required | Why |
|---|---|---|
| Damage photos (4+ angles) | Yes | |
| Photos of weather context (hail on ground, water line, downed tree) | Optional but valuable | Corroborates NOAA |
| Repair estimate | Yes before settlement | |
| Police / fire / emergency report | Conditional (severe events only) | Some jurisdictions issue post-storm reports |

**Auto-escalate triggers**: NOAA returns no corroborating event at location/time · Estimate > 2× regional avg for damage type · Estimate > 70% of vehicle ACV (likely total loss path) · Cross-carrier duplicate via ISO ClaimSearch

**Dataverse columns added**: WeatherSubType, DamageDiscoveredAt, LocationDuringEvent, HailSize, FloodWaterLevel, FallingObject, ContentsDamaged

**Conversation length target**: 5–7 turns, 70–100 sec

---

### 4.3 Comprehensive — Theft (full vehicle)

**Trigger**: U5 = "Comprehensive — Theft"

**Loss-specific questions**

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| T1 | "When did you last see the vehicle?" | LastSeenAt | Yes | |
| T2 | "When did you discover it was missing?" | TheftDiscoveredAt | Yes | |
| T3 | "Where was it parked?" | TheftLocation | Yes | |
| T4 | "Were any keys inside the vehicle?" | KeysInVehicle | Yes | **Y = strong fraud red flag** |
| T5 | "Are all sets of keys still in your possession?" | AllKeysAccountedFor | Yes | If N → fraud flag (prior duplication possible) |
| T6 | "Is there an anti-theft device installed? (factory alarm, LoJack, GPS tracker)" | AntiTheftDevice | Optional | May affect deductible / discount |
| T7 | "What's the vehicle's VIN?" | VIN | Yes (re-confirm) | Cross-check with NICB stolen-vehicle DB |
| T8 | "Were there valuable items inside the vehicle? (electronics, tools, child seats)" | ContentsStolen | Optional + list if Y | Separate personal-property sub-claim |
| T9 | "Has the vehicle been recovered? Or is it still missing?" | RecoveryStatus | Yes | Choice: still missing / recovered intact / recovered damaged |

**Sub-flows called**: none

**Documents required**

| Document | Required | Why |
|---|---|---|
| Police Report | **MANDATORY** | All US insurers require for theft |
| Vehicle Title | Yes | Ownership proof for total loss |
| Photo of remaining key(s) | Yes | Verifies T5 answer |
| Loan/lease documentation | If applicable | Lienholder must be notified |

**Auto-escalate triggers**: ALL theft claims to Tier 2 minimum (high fraud rate). Tier 3 if: T4=Y · T5=N · NICB returns prior theft pattern · Cross-carrier duplicate · Recovered with parts stripped (stripping fraud signal)

**Dataverse columns added**: LastSeenAt, TheftDiscoveredAt, TheftLocation, KeysInVehicle, AllKeysAccountedFor, AntiTheftDevice, ContentsStolen, RecoveryStatus

**Conversation length target**: 6–8 turns, 90–120 sec

---

### 4.4 Comprehensive — Vandalism / Break-in

**Trigger**: U5 = "Comprehensive — Vandalism or break-in"

**Loss-specific questions**

| # | Question | Field | Required |
|---|---|---|---|
| V1 | "What was damaged or stolen from the vehicle?" | VandalismDescription | Yes |
| V2 | "Was the vehicle locked at the time?" | VehicleLocked | Yes |
| V3 | "Were any windows broken or locks forced?" | EntryMethod | Optional |
| V4 | "Where was the vehicle when this happened?" | VandalismLocation | Yes |
| V5 | "What items were stolen, if any?" (multi-entry) | ItemsStolen | Optional |
| V6 | "Approximate value of stolen items?" | ItemsValue | Optional |

**Documents required**

| Document | Required |
|---|---|
| Damage photos | Yes |
| Police Report | Strongly recommended (some carriers require) |
| Receipts for stolen items | If claiming personal property |

**Auto-escalate triggers**: V2=N (unlocked vehicle — coverage gap) · ItemsValue > $5,000 · Repeat claimant within 12 months

**Dataverse columns added**: VandalismDescription, VehicleLocked, EntryMethod, VandalismLocation, ItemsStolen, ItemsValue

**Conversation length target**: 5–6 turns, 60–90 sec

---

### 4.5 Comprehensive — Fire

**Trigger**: U5 = "Comprehensive — Fire"

**Loss-specific questions**

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| F1 | "When did the fire happen?" | FireDateTime | Yes | |
| F2 | "Where was the vehicle when it caught fire?" | FireLocation | Yes | Garage/home → may involve homeowner's coverage |
| F3 | "Was anyone in the vehicle when it started?" | OccupiedAtFire | Yes | If Y → cross-check with U7 |
| F4 | "Do you know what caused the fire?" | FireCause | Yes | Choice: electrical / mechanical / collision-related / external (arson suspected) / unknown |
| F5 | "Did the fire department respond?" | FireDeptResponded | Yes | Almost always Y |
| F6 | "What's the fire-department incident number?" | FireDeptIncidentNumber | Yes if F5=Y | Mandatory document |
| F7 | "Did they indicate cause or suspicious circumstances?" | FireDeptCauseAssessment | Optional | Arson hint → Tier 3 |

**Documents required**

| Document | Required |
|---|---|
| Fire Department Incident Report | **MANDATORY** |
| Damage photos (post-fire) | Yes |
| Vehicle Title | Yes (likely total loss) |

**Auto-escalate triggers**: ALL fire claims auto-escalate to Tier 2 minimum. Tier 3 if: F4 = arson suspected · Fire Dept assessment indicates suspicious cause · Vehicle had prior fire claim · Total loss + recent purchase

**Dataverse columns added**: FireDateTime, FireLocation, OccupiedAtFire, FireCause, FireDeptResponded, FireDeptIncidentNumber, FireDeptCauseAssessment

**Conversation length target**: 5–7 turns, 80–110 sec

---

### 4.6 Comprehensive — Animal strike

**Trigger**: U5 = "Comprehensive — Animal strike"

**Loss-specific questions**

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| A1 | "What kind of animal?" | AnimalType | Yes | Choice: deer / dog / cat / livestock / bird / other large / other small |
| A2 | "Did you swerve to avoid the animal?" | SwervedToAvoid | Yes | **Critical**: if Y AND struck something else (tree, vehicle), this RECLASSIFIES as Collision (loss-type changes) |
| A3 | "Where on the vehicle is the damage?" | DamageAreas | Yes | Multi (same as Collision C7) |
| A4 | "Did the animal stay at the scene? Were authorities called?" | AnimalDispositioned | Optional | Some states require reporting deer strikes to game wardens |

**Branching note**: If A2=Y AND damage NOT to front of vehicle → flag for re-classification. Confirm with claimant: "It sounds like you may have hit something else after avoiding the animal — is that right? In that case we'll record this as a Collision claim instead."

**Documents required**

| Document | Required |
|---|---|
| Damage photos (front + impact area) | Yes |
| Photos of animal residue/hair if visible | Optional but corroborating |
| State wildlife report | Conditional (some states for deer) |

**Auto-escalate triggers**: A2=Y with damage to non-front area (re-classification) · Repeat animal claim within 12 months

**Dataverse columns added**: AnimalType, SwervedToAvoid, AnimalDispositioned

**Conversation length target**: 4–5 turns, 50–70 sec

---

### 4.7 Comprehensive — Glass only

**Trigger**: U5 = "Comprehensive — Glass damage only"

**Loss-specific questions**

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| G1 | "Which glass is damaged?" | GlassLocation | Yes | Choice: windshield / driver-side window / passenger-side window / rear window / sunroof / side mirror |
| G2 | "What kind of damage?" | GlassDamageType | Yes | Choice: chip / single crack / multiple cracks / shattered |
| G3 | "How big is the damaged area, roughly?" | GlassDamageSize | Optional | Choice: smaller than a quarter / quarter to dollar / larger than dollar / full pane |
| G4 | "Do you know what caused it?" | GlassDamageCause | Yes | Choice: rock from road / weather / vandalism / unknown |
| G5 | "Is it impairing your view or safe driving?" | DrivingSafety | Yes | If Y → priority repair, may waive deductible |

**Documents required**

| Document | Required |
|---|---|
| Photo of damaged glass (close-up + wide) | Yes |

**Auto-escalate triggers**: Almost none — glass is the cleanest auto-approve path. Most carriers route to glass network (Safelite, etc.) with zero deductible. Only escalate if: G4 = vandalism (re-routes to Vandalism branch) · multiple glass claims within 90 days

**Dataverse columns added**: GlassLocation, GlassDamageType, GlassDamageSize, GlassDamageCause, DrivingSafety

**Conversation length target**: 3–5 turns, 40–60 sec — fastest path

---

### 4.8 Liability — Property Damage (PD)

**Trigger**: U5 = "Liability — I damaged someone else's property" OR third-party detected during Collision flow

**Loss-specific questions**

| # | Question | Field | Required |
|---|---|---|---|
| LP1 | "What did you damage?" | DamagedPropertyType | Yes — Choice: another vehicle / building/structure / fence/landscaping / utility infrastructure / other |
| LP2 | "Briefly describe the property and the damage." | DamagedPropertyDescription | Yes |
| LP3 | "Is the property owner aware? Have they contacted you or filed already?" | OtherPartyClaimFiled | Yes |
| LP4 | "Do you have an estimate of the damage?" | DamageEstimateAmount | Optional |

**Sub-flows called**: §3.1 (other-party-info block — for the property owner)

**Documents required**

| Document | Required |
|---|---|
| Photos of the damaged property (if accessible) | Yes if available |
| Other party's contact info | Yes |
| Other party's estimate (when available) | Required before settlement |
| Police report | If accident on roadway |

**Auto-escalate triggers**: LP1 = building/structure · DamageEstimateAmount > $10,000 · DamageEstimateAmount approaching policy PD limit · Other party already filed via their carrier (subrogation path)

**Dataverse columns added**: DamagedPropertyType, DamagedPropertyDescription, OtherPartyClaimFiled, DamageEstimateAmount

**Conversation length target**: 4–6 turns, 60–80 sec

---

### 4.9 Liability — Bodily Injury (BI)

**Trigger**: U5 = "Liability — Someone else was injured" OR injured non-claimant detected during another flow's §3.3 triage

**This entire branch auto-escalates to Tier 3** — BI claims have legal exposure, must be handled by adjuster from the start.

**Loss-specific questions** (light touch — just enough to triage)

| # | Question | Field | Required |
|---|---|---|---|
| BI1 | "Can you tell me what happened?" | (already captured in U6) | — |
| BI2 | "Who was injured?" | InjuredParties | Yes |
| BI3 | "How serious are their injuries — to your knowledge?" | InjurySeverity | Yes — Choice: minor / moderate / severe / fatal |
| BI4 | "Were they taken to a hospital?" | InjuredHospitalized | Yes |
| BI5 | "Do you have their contact info, or their attorney's contact info?" | InjuredPartyContact | Optional |
| BI6 | "Have you been contacted by anyone yet — them, an attorney, or another insurer?" | ContactReceived | Yes |

After BI6 → "I'm transferring you to one of our claim specialists right now. They'll take it from here." → Tier 3 transfer with full transcript.

**Documents required**: Specialist will request after intake. Don't ask claimant to upload anything beyond universal docs.

**Auto-escalate**: 100% — every BI claim, no exceptions.

**Dataverse columns added**: InjuredParties, InjurySeverity, InjuredHospitalized, InjuredPartyContact, ContactReceived

**Conversation length target**: 4–6 turns max — fast handoff

---

### 4.10 PIP / MedPay (own injury)

**Trigger**: U5 = "PIP / MedPay — I was injured" OR claimant injured detected during another flow's §3.3 triage

**Note on routing**: In **no-fault states** (FL, NY, MI, NJ, PA, MA, MN, KY, ND, HI, KS, UT) → PIP coverage. In other states → MedPay. Adjudication Agent reads `IncidentState` from U4.

**Loss-specific questions**

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| P1 | "Who was injured?" | InjuredParties | Yes | self / spouse / child / passenger |
| P2 | "Briefly describe the injuries." | InjuryDescription | Yes | |
| P3 | "Did you receive medical treatment?" | TreatmentReceived | Yes | |
| P4 | (if P3=Y) "Where? Hospital, urgent care, primary care?" | TreatmentProvider | Yes | |
| P5 | "Are you still receiving treatment?" | OngoingTreatment | Yes | |
| P6 | "Has anyone missed work because of this?" | LostWagesYN | Yes | If Y → PIP wage-loss coverage |
| P7 | (if P6=Y) "How many days approximately, and what's typical earnings?" | LostWagesAmount, LostWagesDays | Optional | Documentation later |

**Documents required**

| Document | Required | Why |
|---|---|---|
| Medical records (HCFA-1500 or UB-04 forms) | Yes | Standard US billing forms |
| Discharge summary (if hospitalized) | Conditional | |
| Prescription receipts | Optional | |
| Lost wages documentation (employer letter, pay stubs) | If LostWagesYN=Y | |
| Police report (if accident-related) | Yes | |

**Auto-escalate triggers**: P3 = severe / hospitalized · OngoingTreatment = Y for >30 days · LostWagesAmount > $5,000 · Total medical billing > policy PIP/MedPay limit · Multiple claimants on same incident

**Dataverse columns added**: InjuredParties, InjuryDescription, TreatmentReceived, TreatmentProvider, OngoingTreatment, LostWagesYN, LostWagesAmount, LostWagesDays

**Conversation length target**: 5–7 turns, 80–110 sec

---

### 4.11 UM / UIM (Uninsured / Underinsured Motorist)

**Trigger**: U5 = "UM/UIM — Other driver had no/insufficient insurance" OR auto-detected when other party's coverage check fails

**Loss-specific questions**

| # | Question | Field | Required | Notes |
|---|---|---|---|---|
| UM1 | "What's the situation with the other driver?" | OtherDriverStatus | Yes | Choice: uninsured (confirmed) / has insurance but not enough / hit-and-run (no info) / refusing to share insurance info |
| UM2 | "Do you have any of their information?" | OtherDriverPartialInfo | Conditional | Free text — license plate, description, anything captured |
| UM3 | (if hit-and-run) "Did you file a police report?" | PoliceReportFiled | Yes | **Mandatory for hit-and-run UM** in most states |
| UM4 | "Were there witnesses to confirm what happened?" | WitnessYN | Yes | UM claims rely heavily on witnesses |

**Sub-flows called**: §3.1 (partially — what info exists), §3.2 (witnesses), §3.3 if U7=Y

**Documents required**

| Document | Required | Why |
|---|---|---|
| Police Report | **MANDATORY** for hit-and-run UM | State requirement |
| Damage photos | Yes | |
| Repair estimate | Yes | |
| Witness statements | Strongly valuable | Often the only corroboration |

**Auto-escalate triggers**: ALL UM/UIM claims auto-escalate to Tier 2 minimum (legal complexity). Tier 3 if: hit-and-run with no police report · injuries · damages exceed UM/UIM policy limits

**Dataverse columns added**: OtherDriverStatus, OtherDriverPartialInfo

**Conversation length target**: 4–6 turns + sub-flows, 100–130 sec

---

## 5. Documents matrix (consolidated)

Mark = required. Mark = ★ for "mandatory by regulation/insurer policy". Mark = ◎ for conditional/optional.

| Document | Coll | Comp-Wthr | Theft | Vand | Fire | Animal | Glass | Liab-PD | Liab-BI | PIP | UM/UIM |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| State Driver's License (universal) | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ |
| Insurance Card (universal) | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ |
| Vehicle Title / Registration | ★ | ★ | ★ | ★ | ★ | ★ | ◎ | ◎ | ◎ | ◎ | ★ |
| Damage photos | ★ | ★ | ◎ | ★ | ★ | ★ | ★ | ◎ | ◎ | ◎ | ★ |
| Repair estimate | ★ | ★ | — | ★ | — | ★ | ★ | ★ | — | — | ★ |
| Police Report | ◎ | ◎ | ★ | ◎ | — | ◎ | — | ◎ | ◎ | ★ | ★ (hit-and-run) |
| Fire Dept Report | — | — | — | — | ★ | — | — | — | — | — | — |
| All keys (theft) | — | — | ★ | — | — | — | — | — | — | — | — |
| Other party contact + insurance | — | — | — | — | — | — | — | ★ | ★ | — | ◎ |
| Medical records (HCFA-1500/UB-04) | — | — | — | — | — | — | — | — | ★ | ★ | ◎ |
| Lost wages documentation | — | — | — | — | — | — | — | — | ◎ | ◎ | ◎ |
| Receipts for stolen contents | — | — | ◎ | ◎ | — | — | — | — | — | — | — |

---

## 6. Time-sensitive flags

| Trigger | Required action | Why |
|---|---|---|
| Hit-and-run + no police report | Prompt claimant to file within 24h, follow up via SMS/email | Most states deny UM coverage without timely police report |
| BI severity = severe or fatal | Immediate Tier 3 transfer; auto-notify legal/SIU | Regulatory + legal exposure |
| Theft | Confirm police report filed within 48h; flag if not | Insurer requirement |
| Fire suspected arson | Hold claim; SIU referral | Fraud investigation |
| Estimate not received within 14 days | Auto-reminder via SMS/email | Claim cannot progress without it |
| Glass damage impairing view | Same-day repair authorization, deductible may be waived | Safety |
| Total-loss path triggered | Notify lienholder within 5 days | Lender requirement |

---

## 7. Auto-escalate triggers (consolidated)

Any one true → claim does NOT auto-approve regardless of confidence score.

| Trigger | From |
|---|---|
| Injury (U7 = Y) | Universal |
| DistressFlag = Y (sentiment) | Universal |
| Estimate > $25,000 (any auto claim) | Universal threshold |
| Estimate > 70% of vehicle ACV | Total-loss path |
| Cross-carrier duplicate via ISO ClaimSearch | Validation Agent |
| NICB watchlist hit | Validation Agent |
| NOAA cannot corroborate weather event | Validation Agent (Comp-Weather) |
| Estimate > 2× regional average | Validation Agent |
| Airbag deployed (C3) | Collision |
| Hit-and-run with no police report | Collision / UM |
| Keys-in-vehicle (T4) for Theft | Theft |
| All-keys-not-accounted (T5=N) for Theft | Theft |
| Fire arson suspected | Fire |
| ALL Theft claims | Tier 2 minimum |
| ALL Fire claims | Tier 2 minimum |
| ALL BI claims | Tier 3 |
| ALL UM/UIM claims | Tier 2 minimum |
| Liability PD > $10,000 | Liability-PD |
| Multiple claims same policy within 90 days | Cross-validation |

---

## 8. Dataverse Claims column additions

On top of the base Claims schema in `02_architecture.md`, add these columns. Group by purpose for the schema build.

### Universal additions
- `RelationshipToHolder` (Choice: self/spouse/authorized-driver/family/other)
- `IncidentTime` (Time — separate from IncidentDate for granularity)
- `IncidentState` (Choice: 50 US states + DC)
- `NarrativeText` (Multiline)
- `InjuryFlag` (Yes/No)
- `InjuredParties` (Multiline JSON)
- `PoliceReportFiled` (Yes/No)
- `PoliceReportNumber` (Text)
- `RespondingAgency` (Text)
- `VehicleDrivable` (Yes/No)
- `VehicleTowed` (Yes/No)
- `TowLocation` (Text)
- `OtherPartyInvolved` (Yes/No)
- `DistressFlag` (Yes/No)
- `VIN` (Text — already in US-context table)

### Other-party block (3.1)
- `OtherDriverName`, `OtherDriverPhone`, `OtherCarrierName`, `OtherPolicyNumber`, `OtherVehicleDescription`, `OtherDriverLicense`, `OtherDriverState` (all Text, optional)

### Witness block (3.2)
- `Witnesses` (Multiline JSON: array of `{name, phone}`)

### Injury triage (3.3)
- `InjurySeverity` (Choice: minor/moderate/severe/fatal)
- `TreatmentSought` (Yes/No)
- `TreatmentProvider` (Text)
- `HospitalAdmitted` (Yes/No)
- `SafetyCheck` (Multiline)

### Loss-type-specific (added per branch in §4)
- **Collision**: CollisionSubType, DriverIdentity, ApproxSpeed, AirbagDeployed, FaultAssessment, RoadConditions, Visibility, DamageAreas, WeatherFactor
- **Comp — Weather**: WeatherSubType, DamageDiscoveredAt, LocationDuringEvent, HailSize, FloodWaterLevel, FallingObject, ContentsDamaged
- **Theft**: LastSeenAt, TheftDiscoveredAt, TheftLocation, KeysInVehicle, AllKeysAccountedFor, AntiTheftDevice, ContentsStolen, RecoveryStatus
- **Vandalism**: VandalismDescription, VehicleLocked, EntryMethod, VandalismLocation, ItemsStolen, ItemsValue
- **Fire**: FireDateTime, FireLocation, OccupiedAtFire, FireCause, FireDeptResponded, FireDeptIncidentNumber, FireDeptCauseAssessment
- **Animal**: AnimalType, SwervedToAvoid, AnimalDispositioned
- **Glass**: GlassLocation, GlassDamageType, GlassDamageSize, GlassDamageCause, DrivingSafety
- **Liab-PD**: DamagedPropertyType, DamagedPropertyDescription, OtherPartyClaimFiled, DamageEstimateAmount
- **Liab-BI**: InjuredPartyContact, ContactReceived (others reused from §3.3)
- **PIP/MedPay**: InjuryDescription, OngoingTreatment, LostWagesYN, LostWagesAmount, LostWagesDays
- **UM/UIM**: OtherDriverStatus, OtherDriverPartialInfo

### Schema strategy recommendation
Don't add 70+ columns to the Claims table. Instead:
- Keep Claims slim with the universal columns + a `LossTypeDetails` Multiline JSON column
- Store loss-type-specific answers as JSON in `LossTypeDetails`
- Adjudication Agent prompt assembles inputs from JSON → no UI/schema overhead
- For Power BI dashboard, use Dataverse virtual columns or Power Query JSON parsing

---

## 9. Mapping to Copilot Studio FNOL_Start topic structure

Build it as one parent topic + one child topic per loss type. Avoid one giant topic with 11 branches (becomes unmaintainable).

```
Topics:
├── FNOL_Start (parent)
│   ├── Universal questions (U1–U11)
│   ├── Sentiment check on U6 narrative
│   ├── Universal documents request
│   └── Switch on LossType (U5) → triggers child topic
├── FNOL_Collision (child)
├── FNOL_Comp_Weather (child)
├── FNOL_Comp_Theft (child)
├── FNOL_Comp_Vandalism (child)
├── FNOL_Comp_Fire (child)
├── FNOL_Comp_Animal (child)
├── FNOL_Comp_Glass (child)
├── FNOL_Liability_PD (child)
├── FNOL_Liability_BI (child)
├── FNOL_PIP_MedPay (child)
├── FNOL_UM_UIM (child)
├── SubFlow_OtherParty (reusable)
├── SubFlow_Witness (reusable)
├── SubFlow_InjuryTriage (reusable)
└── FNOL_Confirm (parent again — assembles, calls "Create Claim" Power Automate flow, returns ClaimID)
```

Variable naming convention in Copilot Studio: prefix all bot variables with `bot.fnol.` (e.g., `bot.fnol.policyId`, `bot.fnol.lossType`, `bot.fnol.collisionSubType`). Pass the full bag to Power Automate as a JSON string.

---

## 10. Conversation length targets (for empathy KPI)

| Loss type | Target turns | Target seconds | Max acceptable |
|---|:-:|:-:|:-:|
| Collision | 6–9 | 90–120 | 180 |
| Comp — Weather | 5–7 | 70–100 | 150 |
| Comp — Theft | 6–8 | 90–120 | 180 |
| Comp — Vandalism | 5–6 | 60–90 | 120 |
| Comp — Fire | 5–7 | 80–110 | 150 |
| Comp — Animal | 4–5 | 50–70 | 90 |
| Comp — Glass | 3–5 | 40–60 | 90 |
| Liab — PD | 4–6 | 60–80 | 120 |
| Liab — BI | 4–6 (then Tier 3 transfer) | 60–90 | 120 |
| PIP / MedPay | 5–7 | 80–110 | 150 |
| UM / UIM | 4–6 + sub-flows | 100–130 | 180 |

Pitch line: *"Average traditional FNOL takes 22 minutes on a phone call. We do it in 90 seconds via chat — and the customer never has to repeat themselves to a human."*
