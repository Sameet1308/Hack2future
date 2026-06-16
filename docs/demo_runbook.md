# 🎬 DEMO SPEECH — read this while you present

**You have 2 tabs: (1) the DECK** `localhost:5173/present.html` (press **F** fullscreen, advance with **→**), **(2) the APP.**
Below: **bold = say it out loud** · `[do] = what you click/type`. Simple. Top to bottom.

**YOUR HOOK (know it cold):** *A car claim takes ~2 weeks. We settle it in minutes — file by talking, AI reads the damage photo and estimates the repair on the spot, agents decide, money's on the way.*

---

## ⚙️ Before you record (not on camera)
```
Terminal 1:  cd frontend && npm run dev      (restart)
Terminal 2:  cd frontend && npm run notify   (wait for: email: READY (Azure ...))
```
- Sign in once: open `localhost:5173/handler/signin` → click **Sign in**.
- Tabs open: **DECK** `localhost:5173/present.html` (fullscreen) · **APP** `localhost:5173/customer/dashboard` · **CONSOLE** `localhost:5173/handler/queue` · **Gmail** · **Azure portal rg-glassbox**.
- *(After setup you navigate by clicking — no more typing URLs.)*
- Damage photo ready: `docs/accidentimage/Gemini_Generated_Image_5d1vps5d1vps5d1v.png`.

---

# PART 1 — THE DECK (the hook)  ·  *DECK tab*

**SLIDE 1**
> "Hi, I'm Sameet, presenting for Team AI Elites — we're spread across time zones, so I'm walking you through our combined work."
`[do] press →`

**SLIDE 2**
> "Picture this: you've just been rear-ended. Today, your insurer's answer is a phone queue and about a two-week wait. It's slow and stressful for you — and carriers are losing money doing it this way."
`[do] press →`

**SLIDE 3**
> "But it doesn't have to be. AI can now settle most of these claims in minutes instead of days, at far lower cost. The technology is finally ready."
`[do] press →`

**SLIDE 4**
> "So we built it — Glass Box AI: five AI agents that settle a claim from start to finish. Intake, reading the photos and documents, checking coverage, running fraud checks, and making the decision. Let me just show you — live."
`[do] switch to the APP tab`

---

# PART 2 — THE LIVE DEMO  ·  *APP tab (all clicks — no typing URLs)*

### Step 1 — Talk to Sara → she creates the claim in Dataverse
`[do] APP tab (customer/dashboard) → click the blue "File a new claim" button → Sara's chat opens`
> "This is Sarah, already signed in. She files a claim and meets Sara — our Copilot Studio agent."
`[do] answer Sara's FNOL questions (incl. "anyone injured?" → No). Let her finish — she creates the claim in Dataverse and gives a real claim number.`
> "Sara walks her through it as a conversation, then opens a real claim in our Dataverse database — that's the live claim number."
`[do] then click the "Add a photo of the damage" button at the bottom`
> ✅ Sara's CreateClaim flow writes the real claim; the app picks up that exact claim next.

### Step 2 — 📸 The AI reads the damage photo (your strongest moment)
You're now on the photo screen — Sara asks for a photo.
`[do] click "Tap to add a photo" → choose your Gemini damage photo`
> "Sara asks for a photo of the damage. And watch — this goes to our AI vision agent live."
`[do] wait ~4 seconds for the result card`
> "There it is. The AI looked at the photo itself: a silver sedan, damage to the rear bumper, tail light and quarter panel, moderate severity — and it estimates the repair at eighteen hundred to thirty-five hundred dollars. From one photo, in seconds. This used to need an in-person appraiser and several days."
`[do] click "Submit this photo with my claim"` — the analysis is written **onto Sara's real Dataverse claim**.

### Step 3 — The analysis is mapped to the real claim + a REAL email
You're now on the confirmation screen showing **Sara's real claim number**.
> "The AI's assessment is now saved against Sarah's real claim in Dataverse — and she gets a real email."
`[do] NOTE the claim number on screen (Sara's real one, e.g. CLM-2026-xxxxxx — you'll open this exact one next).`
`[do] switch to the GMAIL tab → open the "Your claim … has been received" email`
> "A real email — claim received, adjuster assigned, we're looking into it."
`[do] switch to the CONSOLE tab (handler/queue)`

### Step 4 — It's in the adjuster's queue (read live from Dataverse)
`[do] find Sarah's claim (top of the queue) → click "Review →"`
> "And here it is on the adjuster's side — read straight from Dataverse, the claim Sarah just filed."

### Step 5 — The decision card: evidence + approve → REAL settlement email
You're on the adjuster's decision card.
> "This is where the adjuster sees everything the agents logged: the AI's photo damage assessment — rear bumper, tail light, quarter panel — the coverage check, the validations, and the recommendation: approve, ninety percent confidence."
`[do] point at the Documents section — the uploaded photo + Sarah's policy documents`
> "And every document is right here: the photo Sarah uploaded, her auto policy, her insurance card, and the repair estimate."
`[do] (optional) click "Auto policy" → it opens her real policy declarations page (POL-2026-0847, collision §4.2) → close the tab`
> "Her policy confirms collision coverage — exactly what the Policy agent checked."
`[do] click the green "✓ Approve · $2,150" button → a box pops up`
> "He approves, and Sarah's notified everywhere at once — text, email, and the claims team on Teams."
`[do] when the Email card says "Delivered · live", switch to GMAIL → show the settlement email`
> "Another real email — approved, twenty-one fifty on the way. The AI estimated eighteen hundred to thirty-five hundred from the photo; after her five-hundred-dollar deductible, it settled at twenty-one fifty."
`[do] switch back → in the box, click "View on customer device →"`
> "And on Sarah's phone: approved, paid, with a plain reason. Two weeks of stress became two minutes."

### Step 5b (optional) — Sarah's view, before vs after the decision
> "And from Sarah's side, the whole time: before the decision her claim showed **'In review'** on her dashboard; the moment Mike approved, it flipped to **'Approved · $2,150.'**"
`[do] (if you want to show it) open the customer dashboard → her claim now reads "Approved · $2,150" → click it → the settlement screen`

---

# PART 3 — BACK TO THE DECK (close)  ·  *DECK tab*

**SLIDE 6 (Architecture)**
> "Under the hood it's 100% Microsoft — Copilot Studio for the chat, Power Automate running the agents, Azure AI doing the vision and the reasoning with GPT-4.1, and Azure for the notifications."
`[do] switch to the AZURE PORTAL tab (rg-glassbox)`
> "And it's real — here's our Azure resource group. The photo AI and that email came from right here."
`[do] switch back to the DECK → press →`

**SLIDE 7 (cost we attack)**
> "The dollars: fraud costs carriers about 45 billion a year, and bad, slow claims put 170 billion in premiums at risk — a third of unhappy customers just switch. We attack both."
`[do] press →`

**SLIDE 8 (what we deliver)**
> "What we deliver: claims in minutes not weeks, 25 to 30% lower cost per claim, and adjusters freed to handle only the hard cases. Same team, far more throughput."
`[do] press →`

**SLIDE 9 (roadmap)**
> "Next we plug in the live industry data feeds and voice intake, then take the same engine to underwriting and lending. And it runs on the carrier's existing Microsoft tenant — no new vendor."
`[do] press →`

**SLIDE 10 (close)**
> "So that's Glass Box AI: a claim filed by talking, damage assessed by AI from a photo, and settled in minutes — on Microsoft Azure. Faster for the customer, cheaper for the carrier, and every decision is on record. Our ask is a pilot. Thank you, from Team AI Elites."
`[do] press → to the Sources slide and leave it up. Stop recording.`

---

## 🆘 If something breaks
- **Photo card says "N/A" or errors** → Terminal 2 (`npm run notify`) isn't running, or it wasn't a clear vehicle photo. Use the Gemini image.
- **Email card doesn't say "live"** → skip the Gmail cut, keep going. Everything else works.
- **Approve button missing** → you're not signed in: open `/handler/signin`, click Sign in.
- **Console stacked, not side-by-side** → maximize window / press Ctrl+− once.

**One take. Simple. You've got this. 🎬**
