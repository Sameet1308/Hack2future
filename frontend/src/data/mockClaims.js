export const mockClaims = [
  {
    id: 'CLM-2026-4521',
    customer: 'Sarah Chen',
    policyId: 'POL-2026-0847',
    submittedAt: '2026-05-04 09:46',
    lossType: 'Collision',
    subType: 'Parked-and-struck',
    state: 'CA',
    noFault: false,
    confidence: 94,
    recommendation: 'Approve',
    amount: 2300,
    tier: 1,
    channel: 'Mobile App',
    incidentDate: 'May 4, 2026 · 2:30 PM',
    location: '850 Market St, San Francisco, CA',
    vehicle: '2023 Honda Civic · VIN 1HGBH41JXMN109186',
    coverage: 'Collision · 100/300/50',
    deductible: 500,
    aiSummary: 'Front-bumper damage from parked-and-struck collision. Policy active and covers collision. Repair estimate $2,800 within regional norms. NOAA confirms clear weather. NHTSA shows no recalls. ISO ClaimSearch returned no duplicates. Recommend approve, settle at $2,300 ($2,800 − $500 deductible).',
    flags: [],
    validation: [
      { check: 'NOAA weather (real)', status: 'pass', detail: 'Clear, 68°F' },
      { check: 'NHTSA recalls (real)', status: 'pass', detail: '0 open recalls' },
      { check: 'ISO ClaimSearch', status: 'pass', detail: 'no matches' },
      { check: 'NICB watchlist', status: 'pass', detail: 'clean' },
      { check: 'DMV record', status: 'pass', detail: 'license valid' },
      { check: 'Estimate vs regional avg', status: 'pass', detail: '0.92×' },
      { check: 'Telematics g-force', status: 'pass', detail: 'mild impact confirmed' }
    ],
    documents: ['Damage photos (4)', 'Driver\'s License', 'Insurance Card', 'Repair Estimate'],
    glassBox: [
      { agent: 'Intake Agent', ts: '09:46:02', action: 'FNOL captured', explanation: '11 universal questions + 6 collision-specific answered. No injury, no police report, no distress signals.' },
      { agent: 'Extraction Agent', ts: '09:46:11', action: 'Documents extracted', explanation: 'Driver\'s license CA-D2334158 verified, expires 2029. Insurance card matches policy. 4 damage photos: front-bumper damage, all clear quality.' },
      { agent: 'Policy Agent', ts: '09:46:14', action: 'Coverage verified', explanation: 'Policy POL-2026-0847 active. Collision coverage applies. Deductible $500.', policyRef: 'Section 4.2 — Collision Coverage' },
      { agent: 'Validation Agent', ts: '09:46:18', action: 'NOAA weather check (real API)', explanation: 'api.weather.gov returned: clear, 68°F at 14:30 PT. No weather contribution to incident.' },
      { agent: 'Validation Agent', ts: '09:46:19', action: 'NHTSA recall check (real API)', explanation: 'vpic.nhtsa.dot.gov for VIN 1HGBH41JXMN109186 returned 0 open recalls.' },
      { agent: 'Validation Agent', ts: '09:46:20', action: 'ISO ClaimSearch lookup', explanation: 'No prior claims at this address or for this VIN in the last 24 months.' },
      { agent: 'Validation Agent', ts: '09:46:21', action: 'NICB watchlist check', explanation: 'VIN clean. No flagged contractors involved.' },
      { agent: 'Validation Agent', ts: '09:46:22', action: 'DMV driver record', explanation: 'CA license valid, no infractions in 3 years.' },
      { agent: 'Validation Agent', ts: '09:46:22', action: 'Repair estimate validation', explanation: 'Estimate $2,800 is 0.92× regional average for parked-bumper damage. Within tolerance.' },
      { agent: 'Validation Agent', ts: '09:46:23', action: 'Telematics corroboration', explanation: 'Sensor stream shows minor impact event at 14:30:14 PT, location matches. Consistent with claimant narrative.' },
      { agent: 'Adjudication Agent', ts: '09:46:25', action: 'Synthesized decision', explanation: 'All 7 validation checks passed. Coverage confirmed. Estimate within norms. Confidence 94%. Recommendation: APPROVE, settle at $2,300 ($2,800 − $500 deductible).' }
    ]
  },
  {
    id: 'CLM-2026-4520',
    customer: 'Jennifer Rodriguez',
    policyId: 'POL-2026-0592',
    submittedAt: '2026-05-04 08:12',
    lossType: 'Comprehensive',
    subType: 'Weather (water)',
    state: 'FL',
    noFault: true,
    confidence: 58,
    recommendation: 'Adjust to $8,000',
    amount: 8000,
    tier: 2,
    channel: 'Mobile App',
    incidentDate: 'May 3, 2026 · 6:45 AM',
    location: '4421 Coral Way, Miami, FL',
    vehicle: '2021 Toyota RAV4 · VIN 2T3F1RFV5MC180214',
    coverage: 'Comp · PIP $10k',
    deductible: 500,
    aiSummary: 'Water damage claim with several risk signals. Contractor estimate $18,500 is 2.3× regional average. Cross-carrier duplicate match at neighboring address from 6 months ago. Named contractor flagged on NICB. Telematics shows no movement during claimed event window. Recommend adjusting to $8,000 (regional norm) with adjuster review.',
    flags: [
      { severity: 'high', text: 'Cross-carrier duplicate via ISO ClaimSearch (neighbor address, Nov 2025)' },
      { severity: 'high', text: 'Contractor "Quick Fix Restoration" on NICB watchlist' },
      { severity: 'medium', text: 'Estimate is 2.3× regional average for water damage on this vehicle class' },
      { severity: 'medium', text: 'Telematics shows vehicle stationary during claimed flood — consistent with parked, but no corroborating GPS data' }
    ],
    validation: [
      { check: 'NOAA weather (real)', status: 'pass', detail: 'Heavy rain confirmed' },
      { check: 'NHTSA recalls (real)', status: 'pass', detail: '0 open recalls' },
      { check: 'ISO ClaimSearch', status: 'flag', detail: '1 match (neighbor)' },
      { check: 'NICB watchlist', status: 'flag', detail: 'contractor flagged' },
      { check: 'DMV record', status: 'pass', detail: 'license valid' },
      { check: 'Estimate vs regional avg', status: 'flag', detail: '2.3×' },
      { check: 'Telematics', status: 'pass', detail: 'stationary, GPS gap' }
    ],
    documents: ['Water damage photos (3)', 'Driver\'s License', 'Insurance Card', 'Contractor Estimate'],
    glassBox: [
      { agent: 'Intake Agent', ts: '08:12:04', action: 'FNOL captured', explanation: 'Water damage claim, no injury reported. Florida no-fault state, PIP applies for medical.' },
      { agent: 'Policy Agent', ts: '08:12:10', action: 'Coverage verified', explanation: 'Policy POL-2026-0592 active. Comprehensive coverage applies for weather damage.', policyRef: 'Section 5.1 — Comprehensive (Weather)' },
      { agent: 'Validation Agent', ts: '08:12:14', action: 'NOAA weather check (real API)', explanation: 'api.weather.gov confirmed heavy rain (2.4 in / hr) in Miami at incident time. Weather event corroborated.' },
      { agent: 'Validation Agent', ts: '08:12:16', action: 'ISO ClaimSearch lookup', explanation: 'WARNING: similar water damage claim filed at 4423 Coral Way (neighboring property) on 2025-11-12 via Carrier X. Possible coordinated fraud pattern.' },
      { agent: 'Validation Agent', ts: '08:12:17', action: 'NICB contractor check', explanation: 'WARNING: contractor "Quick Fix Restoration" on NICB watchlist for inflated-estimate practice. 7 prior carrier complaints.' },
      { agent: 'Validation Agent', ts: '08:12:18', action: 'Repair estimate validation', explanation: 'Estimate $18,500 is 2.3× the $8,000 regional average for water damage on a 2021 RAV4. Strong outlier.' },
      { agent: 'Validation Agent', ts: '08:12:19', action: 'Telematics corroboration', explanation: 'Vehicle stationary during flood window, consistent with parked claim. GPS data gap from 06:30–07:15 prevents stronger confirmation.' },
      { agent: 'Adjudication Agent', ts: '08:12:21', action: 'Synthesized decision', explanation: 'Coverage applies. Two HIGH-severity fraud signals (ISO duplicate + NICB contractor) and one MEDIUM (estimate variance). Confidence 58%. Recommendation: ADJUST to regional-norm $8,000 and route to Tier 2 for adjuster judgment. Do not auto-approve.' }
    ]
  },
  {
    id: 'CLM-2026-4519',
    customer: 'David Park',
    policyId: 'POL-2026-0331',
    submittedAt: '2026-05-04 07:55',
    lossType: 'PIP / MedPay',
    subType: 'Multi-vehicle injury',
    state: 'NY',
    noFault: true,
    confidence: 32,
    recommendation: 'Escalate',
    amount: null,
    tier: 3,
    channel: 'SMS',
    incidentDate: 'May 4, 2026 · 7:20 AM',
    location: 'I-495 Eastbound, Queens, NY',
    vehicle: '2024 Tesla Model Y',
    coverage: 'BI 100/300/50 + PIP $50k',
    deductible: 500,
    aiSummary: 'Bodily injury reported. Multiple parties hospitalized. New York no-fault state — PIP coverage triggers. AI escalates immediately per BI-claim policy: legal exposure too high for autonomous decision.',
    flags: [
      { severity: 'high', text: 'Bodily injury — auto-escalate per BI policy' },
      { severity: 'high', text: 'Multiple injured parties' }
    ],
    validation: [
      { check: 'NOAA weather (real)', status: 'pass', detail: 'wet roads' },
      { check: 'NHTSA recalls (real)', status: 'pass', detail: '0 open recalls' }
    ],
    documents: ['Damage photos (6)', 'Driver\'s License', 'Police Report'],
    glassBox: [
      { agent: 'Intake Agent', ts: '07:55:11', action: 'FNOL captured', explanation: 'BI flagged. Multiple injured. Auto-escalation triggered before further validation.' },
      { agent: 'Adjudication Agent', ts: '07:55:13', action: 'Tier 3 escalation', explanation: 'Per BI-claim policy, all bodily injury claims auto-escalate to Tier 3 (live human handler). No autonomous decision attempted. Confidence not computed.' }
    ]
  }
];
