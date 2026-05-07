// Agent execution timelines for Theater Mode + Customer Processing.
// Each timeline is an ordered list of events with `at` (ms from start).
// `agent` = top-level pipeline node (Intake/Extraction/Policy/Validation/Adjudication)
// `sub`   = sub-check inside Validation
// `state` = idle | running | done | flagged | escalated
// `gb`    = Glass Box log line (rendered into the live feed)
// `verdict` event ends the timeline.

const SARAH = [
  { at: 0,    agent: 'INTAKE', state: 'running', narrate: 'Capturing your details' },
  { at: 1800, agent: 'INTAKE', state: 'done', latency: 1.8, summary: '11 universal + 6 collision questions answered', narrate: 'Got your claim',
    gb: { agent: 'Intake Agent', text: '11 universal + 6 collision questions answered. No injury, no police report, no distress.' } },

  { at: 1900, agent: 'EXTRACTION', state: 'running', narrate: 'Reading your photos and license' },
  { at: 1900, agent: 'POLICY',     state: 'running', narrate: 'Confirming your coverage' },
  { at: 1900, agent: 'VALIDATION', state: 'running', narrate: 'Verifying everything checks out' },

  { at: 2400, sub: 'NOAA',       state: 'done', summary: 'clear, 68°F',
    gb: { agent: 'Validation · NOAA',  text: 'api.weather.gov: clear, 68°F at 14:30 PT — no weather contribution.' } },
  { at: 2900, sub: 'NHTSA',      state: 'done', summary: '0 recalls',
    gb: { agent: 'Validation · NHTSA', text: 'vpic.nhtsa.dot.gov for VIN ending 9186 returned 0 open recalls.' } },
  { at: 3300, agent: 'POLICY',   state: 'done', latency: 1.4, summary: 'Collision §4.2 applies, deductible $500',
    gb: { agent: 'Policy Agent',       text: 'Policy POL-2026-0847 active. Collision coverage applies. Deductible $500.', cite: 'Section 4.2 — Collision Coverage' } },
  { at: 3500, sub: 'ISO',        state: 'done', summary: 'no matches',
    gb: { agent: 'Validation · ISO',   text: 'No prior claims at this address or VIN in 24 months.' } },
  { at: 3900, agent: 'EXTRACTION', state: 'done', latency: 2.0, summary: 'License + 4 photos extracted, all clear',
    gb: { agent: 'Extraction Agent',   text: 'CA-D2334158 verified, expires 2029. Insurance card matches. 4 damage photos: front bumper, all clear.' } },
  { at: 4200, sub: 'NICB',       state: 'done', summary: 'clean',
    gb: { agent: 'Validation · NICB',  text: 'VIN clean. No flagged contractors involved.' } },
  { at: 4600, sub: 'DMV',        state: 'done', summary: 'license valid',
    gb: { agent: 'Validation · DMV',   text: 'CA license valid, no infractions in 3 years.' } },
  { at: 5000, sub: 'Telematics', state: 'done', summary: 'minor impact 14:30:14',
    gb: { agent: 'Validation · Telematics', text: 'Sensor stream shows minor impact at 14:30:14 PT, location matches narrative.' } },
  { at: 5200, agent: 'VALIDATION', state: 'done', latency: 3.3, summary: '6 of 6 checks passed' },

  { at: 5400, agent: 'ADJUDICATION', state: 'running', narrate: 'Making a decision' },
  { at: 7400, agent: 'ADJUDICATION', state: 'done', latency: 2.0, summary: 'Confidence 94% · Approve · $2,300',
    gb: { agent: 'Adjudication Agent', text: 'All 6 validation checks passed. Coverage confirmed. Estimate within norms. Confidence 94%. APPROVE, settle at $2,300 ($2,800 − $500 deductible).' } },

  { at: 7600, type: 'verdict', verdict: { tier: 1, label: 'Auto-approved', confidence: 94, recommendation: 'Approve', amount: 2300, narrate: 'Approved! $2,300 will be deposited in 1–3 business days.' } }
];

const JENNIFER = [
  { at: 0,    agent: 'INTAKE', state: 'running', narrate: 'Capturing your details' },
  { at: 2200, agent: 'INTAKE', state: 'done', latency: 2.2, summary: 'Water damage · FL no-fault state',
    gb: { agent: 'Intake Agent', text: 'Water damage claim, no injury reported. Florida no-fault state, PIP applies for medical.' } },

  { at: 2400, agent: 'EXTRACTION', state: 'running', narrate: 'Reading your photos and contractor estimate' },
  { at: 2400, agent: 'POLICY',     state: 'running', narrate: 'Confirming your coverage' },
  { at: 2400, agent: 'VALIDATION', state: 'running', narrate: 'Verifying with weather data and 5 other sources' },

  { at: 3100, sub: 'NOAA', state: 'done', summary: 'heavy rain confirmed',
    gb: { agent: 'Validation · NOAA', text: 'api.weather.gov confirmed heavy rain (2.4 in/hr) in Miami at incident time. Weather event corroborated.' } },
  { at: 3700, sub: 'NHTSA', state: 'done', summary: '0 recalls',
    gb: { agent: 'Validation · NHTSA', text: 'vpic.nhtsa.dot.gov for VIN ending 0214 returned 0 open recalls.' } },
  { at: 4200, agent: 'POLICY', state: 'done', latency: 1.8, summary: 'Comp §5.1 applies, deductible $500',
    gb: { agent: 'Policy Agent', text: 'Policy POL-2026-0592 active. Comprehensive coverage applies for weather damage.', cite: 'Section 5.1 — Comprehensive (Weather)' } },
  { at: 4800, agent: 'EXTRACTION', state: 'done', latency: 2.4, summary: '3 photos (1 blurry) + estimate $18,500',
    gb: { agent: 'Extraction Agent', text: 'License verified. 3 damage photos extracted (1 flagged blurry). Contractor estimate $18,500 from "Quick Fix Restoration".' } },

  { at: 5400, sub: 'ISO',  state: 'flagged', summary: '⚠ neighbor match',
    gb: { agent: 'Validation · ISO', text: 'WARNING: similar water damage claim at 4423 Coral Way (neighbor) on 2025-11-12 via Carrier X. Possible coordinated fraud pattern.', flag: true } },
  { at: 6100, sub: 'NICB', state: 'flagged', summary: '⚠ contractor flagged',
    gb: { agent: 'Validation · NICB', text: 'WARNING: contractor "Quick Fix Restoration" on NICB watchlist for inflated-estimate practice. 7 prior carrier complaints.', flag: true } },
  { at: 6700, sub: 'DMV',  state: 'done', summary: 'license valid',
    gb: { agent: 'Validation · DMV', text: 'FL license valid, no infractions in 3 years.' } },
  { at: 7200, sub: 'Telematics', state: 'done', summary: 'stationary, GPS gap',
    gb: { agent: 'Validation · Telematics', text: 'Vehicle stationary during flood window (consistent). GPS gap 06:30–07:15 prevents stronger confirmation.' } },
  { at: 7800, sub: 'EstimateRule', state: 'flagged', summary: '⚠ 2.3× regional avg',
    gb: { agent: 'Validation · Estimate-vs-avg', text: 'Estimate $18,500 is 2.3× the $8,000 regional average for water damage on a 2021 RAV4. Strong outlier.', flag: true } },
  { at: 8000, agent: 'VALIDATION', state: 'flagged', latency: 5.6, summary: '3 flags raised, 4 checks passed' },

  { at: 8400, agent: 'ADJUDICATION', state: 'running', narrate: 'Synthesizing 7 inputs and 3 flags' },
  { at: 11000, agent: 'ADJUDICATION', state: 'flagged', latency: 2.6, summary: 'Confidence 58% · Tier 2 review · Adjust to $8,000',
    gb: { agent: 'Adjudication Agent', text: 'Coverage applies. Two HIGH flags (ISO duplicate + NICB contractor) and one MEDIUM (estimate variance). Confidence 58%. Recommendation: ADJUST to regional-norm $8,000 and route to Tier 2 for adjuster judgment. Do not auto-approve.' } },

  { at: 11200, type: 'verdict', verdict: { tier: 2, label: 'Adjuster review', confidence: 58, recommendation: 'Adjust to $8,000', amount: 8000, narrate: 'Sending to a senior adjuster for review. We\'ll text you within 24 hours.' } }
];

const DAVID = [
  { at: 0,    agent: 'INTAKE', state: 'running', narrate: 'Capturing your details' },
  { at: 1500, agent: 'INTAKE', state: 'flagged', latency: 1.5, summary: 'BI flagged · multiple injured',
    gb: { agent: 'Intake Agent', text: 'BI flagged. Multiple injured parties. Auto-escalation triggered before further validation.', flag: true } },
  { at: 1700, agent: 'ADJUDICATION', state: 'escalated', latency: 0.2, summary: 'Auto-escalated to Tier 3',
    gb: { agent: 'Adjudication Agent', text: 'Per BI-claim policy, all bodily injury claims auto-escalate to Tier 3 (live human handler). No autonomous decision attempted.', flag: true } },

  { at: 1900, type: 'verdict', verdict: { tier: 3, label: 'Live handler', confidence: 0, recommendation: 'Escalate', amount: null, narrate: 'A senior claims specialist will call you within 15 minutes.' } }
];

export const timelines = {
  'CLM-2026-4521': SARAH,
  'CLM-2026-4520': JENNIFER,
  'CLM-2026-4519': DAVID
};

// Customer-friendly labels (no agent jargon)
export const customerLabels = {
  INTAKE:       { name: 'Got your claim',         pending: 'Capturing your details' },
  EXTRACTION:   { name: 'Reading your evidence',  pending: 'Reading your photos and documents' },
  POLICY:       { name: 'Confirming coverage',    pending: 'Confirming your policy' },
  VALIDATION:   { name: 'Verifying details',      pending: 'Cross-checking the facts' },
  ADJUDICATION: { name: 'Making a decision',      pending: 'Making a decision' }
};
