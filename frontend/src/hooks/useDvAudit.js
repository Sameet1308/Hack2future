import { useState, useEffect } from 'react';
import { getClaim } from '../api/claims.js';

// Drives the Live Console from REAL Dataverse audit rows. Polls the claim; as the
// real agents (vision, AI Search, adjudication) finish and write rows, the pipeline
// nodes light up and the Glass Box feed streams in — genuinely live, not scripted.
const ORDER = ['INTAKE', 'EXTRACTION', 'POLICY', 'VALIDATION', 'ADJUDICATION'];
const KEY = { INTAKE: 'intake', EXTRACTION: 'extraction', POLICY: 'policy', VALIDATION: 'validation', ADJUDICATION: 'adjudication' };

export default function useDvAudit(id, { enabled }) {
  const [claim, setClaim] = useState(null);
  useEffect(() => {
    if (!enabled || !id) return;
    let on = true;
    const load = () => getClaim(id).then((c) => { if (on && c) setClaim(c); });
    load();
    const iv = setInterval(load, 2000);
    return () => { on = false; clearInterval(iv); };
  }, [id, enabled]);

  const rows = claim?.glassBox || [];
  const has = (k) => rows.some((r) => (r.agent || '').toLowerCase().includes(KEY[k]));

  const agents = {};
  let runningSet = false;
  ORDER.forEach((k) => {
    if (has(k)) agents[k] = (k === 'VALIDATION' && rows.some((r) => r.flag)) ? 'flagged' : 'done';
    else if (!runningSet && rows.length) { agents[k] = 'running'; runningSet = true; }
    else agents[k] = 'idle';
  });

  const summaries = {};
  rows.forEach((r) => ORDER.forEach((k) => {
    if ((r.agent || '').toLowerCase().includes(KEY[k])) summaries[k] = r.action;
  }));

  const log = rows.map((r, i) => ({ idx: i, ts: r.ts, agent: r.agent, text: r.explanation, flag: r.flag }));
  const doneCount = ORDER.filter((k) => agents[k] === 'done' || agents[k] === 'flagged').length;
  const verdict = (claim && agents.ADJUDICATION === 'done')
    ? { tier: 1, label: 'Auto-approved', confidence: claim.confidence, recommendation: claim.recommendation || 'Approve', amount: claim.amount }
    : null;
  const progress = verdict ? 1 : Math.min(0.92, doneCount / 5);

  return { agents, subs: {}, latencies: {}, summaries, narrate: null, log, verdict, progress, live: true, dv: true };
}
