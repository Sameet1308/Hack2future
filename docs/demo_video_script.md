# Glass Box AI — 10-Minute Demo Video Script (ready to perform)

> **Theme:** an AI *agentic* system that settles auto claims end-to-end and collapses the
> ~3-week settlement cycle into minutes. The explainable audit trail (we call it the "Glass Box")
> is the feature that makes it *deployable* under regulation — a supporting point, not the headline.
> **Happy path:** Sarah Chen, rear-ended in California, files by talking → five agents settle it →
> the adjuster approves → a *real* email lands in her inbox, payment on the way.
> Speaker lines are written to be read aloud verbatim. Every statistic has a source — cite it out loud.

---

## Pre-recording checklist (15 min before)

| ✓ | Check | How |
|---|---|---|
| ☐ | Dev server running | Terminal 1: `cd frontend && npm run dev` → http://localhost:5173. **Restart today** so the `/api` proxy loads. |
| ☐ | **Notify server running** | Terminal 2: `cd frontend && npm run notify` → must print `email: READY (Azure ...)` |
| ☐ | Gmail open in a tab | Inbox that receives the claim email — you'll cut to it live |
| ☐ | **HTML deck open** | Tab → `localhost:5173/present.html` → press **F** for fullscreen. 11 slides, advance with **→ / Space**. |
| ☐ | Live Decision Console works | `localhost:5173/handler/theater/CLM-2026-1001` → **Split** view |
| ☐ | Handler session exists | Visit `/handler/signin` once (auto-stamps Mike Patel) |
| ☐ | Azure portal tab | `rg-glassbox` resource group open |
| ☐ | Notifications OFF · zoom 100% · bookmarks hidden | Focus Assist on, Ctrl+0, Ctrl+Shift+B |
| ☐ | Mic test | Record 10 seconds, play back |

**Recording**: OBS or Win+Alt+R. 1080p, browser window, mic on. One take if possible.

---

## HTML deck ↔ script map (`localhost:5173/present.html`, advance with →)

| Slide | Use during |
|---|---|
| 1 · "Auto claims that settle in minutes" | Opening framing note |
| 2 · The problem (4 cost stats) | Act 1 — problem |
| 3 · The opportunity (>90% STP) | Act 1 — why now |
| 4 · Five agents settle the claim | Act 1→2 — the solution |
| 5 · "Watch one claim settle" | **Switch to the live app (Act 2)** |
| 6 · Architecture | Act 3 — then alt-tab to Azure portal |
| 7 · Impact A — the cost we attack | Act 4 — first half |
| 8 · Impact B — what we deliver | Act 4 — second half |
| 9 · Roadmap & GTM | Act 5 |
| 10 · Close / CTA | Act 5 close |
| 11 · Sources | Leave up during Q&A |

---

## Opening framing note (8 seconds — then straight into the problem)

> "Hi, I'm Sameet, presenting on behalf of **Team AI Elites**. We're a distributed team across several
> time zones, so each of us owned a part of this build — and I'm walking you through our combined work."

---

## ACT 1 — The problem & the opportunity (1:00 – 2:00) · *deck slides 2 → 3 → 4*

**[0:00–0:35]** *slide 2 · start with the person, then the dollars*
> "You've just been rear-ended at a red light. You're shaken — and your insurer's answer is a phone
> queue, a form, and a long wait. J.D. Power clocks the average auto-claim turnaround at **twenty-two
> days**. And it's not just painful for the customer — US auto is a **three-hundred-billion-dollar**
> market that just ran a **104% combined ratio**: insurers are *losing money* on every policy, three
> years running. The slow, manual claim is exactly where cost and customer trust both leak."

**[0:35–1:10]** *slide 3*
> "Here's the opportunity. McKinsey projects that **over ninety percent** of personal-lines claims can
> be processed straight-through — taking settlement, in their words, 'from days to minutes' — and
> cutting the cost of settling a claim by **twenty-five to thirty percent**. The technology is ready.
> The only thing holding it back is trust: regulators now require every AI decision to be *explainable*."

**[1:10–2:00]** *slide 4*
> "So we built **Glass Box AI** — five specialist agents that settle an auto claim end to end. Intake
> talks to the customer. Extraction reads the documents. Policy confirms coverage. Validation runs the
> fraud and fact checks. Adjudication decides and triggers payment. And every step is written, in plain
> English, to an auditable trail — so it's compliant the moment it ships. Let me show you one settle, live."

---

## ACT 2 — Live demo: a claim settles end-to-end (2:00 – 4:00) · *switch to app*

**[2:00–2:30]** → `localhost:5173/customer/dashboard` → **File a new claim** → Sara chat
> "This is Sarah Chen in the AI Elites app — already signed in, so we never ask who she is. She meets
> Sara, our Copilot Studio intake agent: greeted by name, vehicle and active policy confirmed, safety
> first. A few plain-language questions — first-notice-of-loss, rebuilt as a conversation. No forms."

**[2:30–3:15]** → new tab → `localhost:5173/handler/theater/CLM-2026-1001` · **Split** view
> "Now watch the agents actually settle it. Same claim, two windows, in sync. On the left, what *Sarah*
> sees — friendly progress. On the right, the engine: Extraction reading her documents, Policy confirming
> collision coverage, Validation running seven checks including fraud, and Adjudication landing on
> *approve, 94% confidence*. What took twenty-two days is happening in seconds — and the feed in the
> middle is every decision, logged before the agent acts."

**[3:15–4:00]** → toggle **Adjuster** → **✓ Approve** → dispatch modal
> "The adjuster confirms — and settlement fires. Notifications go out on every channel: SMS and email to
> Sarah, Teams to the claims team." → **when 'Delivered · live' shows, cut to Gmail** → "And this is not
> a mockup — there's the real email, in a real inbox, sent through Azure Communication Services, just
> now." → **back → 'View on customer device'** → "On Sarah's phone: approved, $3,200 deposited, with a
> plain-English reason. Two weeks of stress became two minutes."

---

## ACT 3 — Architecture & tech choices (4:00 – 6:00) · *slide 6 + Azure portal*

**[4:00–4:50]** *slide 6*
> "Under the agents, it's one hundred percent Microsoft. Copilot Studio runs the conversation. Power
> Automate orchestrates the agents — they never touch the database directly. Azure AI does the work:
> Document Intelligence reads evidence, AI Search grounds policy answers, and Azure OpenAI — GPT-4.1 —
> adjudicates and writes the explanation. Dataverse stores the claim and the audit trail. And Azure
> Communication Services sends the notifications you just watched."

**[4:50–5:30]** → **alt-tab to Azure portal, `rg-glassbox`**
> "And this isn't slideware — here's our actual Azure resource group. Communication Services, Azure
> OpenAI with GPT-4.1 deployed, Document Intelligence, AI Search. All provisioned, all Microsoft, one
> tenant. The email Sarah just got came from right here."

**[5:30–6:00]** *back to slide 6*
> "One design choice: transparency is calibrated to the audience. The customer sees friendly progress;
> the adjuster sees full forensics; the regulator can audit every line. Our distributed team split the
> build the same way — policy data and RAG, agent orchestration, telematics adapters, and the front-end
> were each owned by a teammate."

---

## ACT 4 — Business impact & scalability (6:00 – 8:00) · *slides 7 → 8*

**[6:00–6:45]** *slide 7 · the cost we attack*
> "Let's talk dollars. Insurance fraud costs P&C carriers about **forty-five billion dollars a year** —
> the Coalition Against Insurance Fraud — and the Insurance Research Council finds **one in five** auto
> injury claims shows fraud or buildup. On the other side, Accenture estimates **a hundred and seventy
> billion dollars** in premiums are at risk by 2027 from poor claims experiences — thirty percent of
> unhappy customers had *already* switched carriers. Slow settlement loses customers; weak validation
> loses money to fraud. Our agents attack both at once."

**[6:45–7:30]** *slide 8 · what we deliver*
> "And here's the return. **Time:** clean claims settle in minutes, not weeks — McKinsey's straight-through
> vision, running. **Cost:** twenty-five to thirty percent off the loss-adjustment expense of every claim.
> **Fraud:** Deloitte projects AI across the claims lifecycle could save P&C insurers **eighty to a hundred
> sixty billion dollars** by 2032 — and in a real Deloitte case study, one US insurer's auto-claims
> rebuild cut cycle time and saved around **forty million dollars**, with ninety-two percent customer
> satisfaction. **Resource:** our agents handle the routine, so adjusters work only the Tier-2 and Tier-3
> exceptions. Same team, far more throughput."

**[7:30–8:00]**
> "It scales technically too — claims and audit in Dataverse, policy in an indexed store that's
> flat-latency at two hundred million policies — and operationally, because the human stays exactly where
> judgment matters: bodily-injury and high-risk claims escalate to a person immediately."

---

## ACT 5 — Roadmap, GTM & the close (8:00 – 10:00) · *slides 9 → 10*

**[8:00–8:45]** *slide 9*
> "Roadmap. Near term: connect the six industry data feeds — ISO, NICB, CARFAX, DMV, KBB, telematics —
> through the sandbox adapters we've already built, plus voice intake and the Teams adjuster experience.
> Then we extend the same agentic-plus-audit layer beyond auto: underwriting, lending, benefits — any
> regulated decision. Go-to-market: Glass Box AI ships on the carrier's **existing** Microsoft tenant —
> no new vendor, no rip-and-replace. We sell speed and compliance as one product."

**[8:45–10:00]** *slide 10, slow down, land it*
> "So, to close. The problem: settling auto claims is slow and expensive, and the AI that could fix it
> was undeployable because regulators demand explanations. Our solution: agentic claim settlement that
> takes minutes instead of weeks, settles the routine, escalates the rest, and proves every decision —
> on a hundred-percent Microsoft stack. Our ask is a pilot on synthetic claims through the full pipeline.
> We didn't just make AI claims processing possible — we made it **deployable**. Thank you, from all of
> Team AI Elites." *(leave slide 11 — Sources — up for Q&A)*

---

## Backup plans

| Failure | Recovery |
|---|---|
| Email card stays "Delivered" (not "live") | Visual still plays — just don't say "real email," skip the Gmail cut. |
| Email slow to Gmail | The "Delivered · live · Azure" label is itself the proof; open Gmail at the end. |
| Sara chat stalls | Reopen `/customer/chat`; if down, jump to the Live Console: "here's a claim filed this morning." |
| Console shows stacked not split | Below 1024px — maximize window / Ctrl+− once. |
| App down | `npm run dev` (20s), cut from recording. |
| Total disaster | Narrate over the deck; slides 7–8 + sources carry the impact. |

---

## Q&A prep

1. **"Is this real or mocked?"** — Conversation, the settlement console, the audit feed, and the **email
   notification are real** (Copilot Studio + Azure OpenAI GPT-4.1 + Azure Communication Services, all in our
   tenant). The six *industry data feeds* are sandbox adapters with production-final interfaces — ISO/NICB/
   CARFAX contracts take 60–90 days of procurement, so we built the swap-in point. Teams is integrated; we
   narrated it.
2. **"Where do your numbers come from?"** — All sourced, on slide 11: NAIC, Triple-I, J.D. Power, McKinsey,
   Deloitte, Accenture, Coalition Against Insurance Fraud, Insurance Research Council. The 22-day figure is
   J.D. Power's repair turnaround; the cost/savings figures are McKinsey and Deloitte.
3. **"What happens when the AI is wrong?"** — Tiering: low confidence or any flag routes to a human. The
   audit trail makes the error *findable* — you can read which agent reasoned what, and when.
4. **"How is this different from existing claims automation?"** — Two things: it's *agentic* (specialist
   agents reason and hand off, not a fixed rules engine), and it's *explainable by design* — which is what
   makes it legally deployable under Colorado SB21-169 and the NAIC AI bulletin.
5. **"You're presenting alone — who built this?"** — Distributed team across time zones; policy/RAG, agent
   orchestration, telematics adapters, and the front-end were each led by a teammate.

---

## Shorter cuts

- **3 min**: framing (0:08) → problem stats (0:40) → file the claim (0:45) → Live Console + approve + real
  email (1:05) → close (0:20).
- **60 sec**: "22 days, losing money, undeployable AI" (0:12) → approve → real email (0:30) → close (0:18).
