import { useEffect, useMemo, useRef, useState } from 'react';
import { CLAIM_AUDIT_URL } from '../config.js';

/**
 * useClaimAudit — polls the GlassBox-GetClaimAudit read-flow for a claim's
 * Decision_Rationale (gbx_decisionrationale) rows and maps them into the SAME
 * shape useAgentTimeline produces, so AgentFlow + GlassBoxLiveFeed render the
 * real backend run with zero component changes.
 *
 * Returns: { live, ready, agents, subs, latencies, summaries, narrate, log, verdict }
 *   - live    : true once we have at least one real row (Theater can switch over)
 *   - ready   : the fetch has completed at least once (success or empty)
 *   - agents  : { INTAKE: 'idle'|'running'|'done'|'flagged'|'escalated', ... }
 *   - subs    : validation sub-check state map (NOAA/NHTSA/ISO/...)
 *   - log     : [{ idx, ts, agent, text, cite, flag }] for GlassBoxLiveFeed
 *   - verdict : { tier, label, confidence, recommendation, amount, narrate } | null
 *
 * Graceful no-op: if CLAIM_AUDIT_URL is unset or claimId is falsy, it never
 * fetches and returns live=false so callers fall back to the scripted mock.
 *
 * @param claimId  e.g. 'CLM-2026-4521' (matches gbx_claim_id autonumber)
 * @param opts     { enabled?: bool, intervalMs?: 1500 }
 */
export default function useClaimAudit(claimId, opts = {}) {
  const { enabled = true, intervalMs = 1500 } = opts;
  const active = !!(enabled && claimId && CLAIM_AUDIT_URL);

  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    stopRef.current = false;
    let timer = null;

    const tick = async () => {
      if (stopRef.current) return;
      try {
        const url = `${CLAIM_AUDIT_URL}${CLAIM_AUDIT_URL.includes('?') ? '&' : '?'}claimGuid=${encodeURIComponent(claimId)}`;
        const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          const next = normalizeRows(data);
          setRows(next);
          setReady(true);
          // Stop once a verdict (Adjudication recommendation) row has landed.
          if (next.some(isVerdictRow)) {
            stopRef.current = true;
            return;
          }
        }
      } catch {
        // Network hiccup — keep polling; the mock fallback keeps the demo whole.
      }
      if (!stopRef.current) timer = setTimeout(tick, intervalMs);
    };

    tick();
    return () => {
      stopRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, claimId, intervalMs]);

  return useMemo(() => mapRowsToTimelineState(rows, ready, active), [rows, ready, active]);
}

/* ----------------------------- normalization ----------------------------- */

// The read-flow may return rows in a few shapes depending on how it's authored:
//   { value: [...] }              (raw Dataverse List rows)
//   { rows: [...] } / { audit: [...] }
//   [...]                          (already an array)
function normalizeRows(data) {
  const arr = Array.isArray(data)
    ? data
    : data?.value || data?.rows || data?.audit || [];
  return arr
    .slice()
    .sort((a, b) => new Date(ts(a)).getTime() - new Date(ts(b)).getTime());
}

const ts = (r) => r.gbx_timestamp || r.timestamp || r.createdon || r['createdon'] || 0;

// Choice gbx_agent_name integer → pipeline agent name.
const AGENT_INT = {
  10000: 'Intake',
  10001: 'Extraction',
  10002: 'Policy',
  10003: 'Validation',
  10004: 'Adjudication',
  10005: 'Explanation',
  10006: 'Notification',
  10007: 'Adjuster',
  10008: 'AssignmentEngine',
  10009: 'VendorEngine'
};

// Map a row's agent → canonical name. Handles the clean GetClaimAudit shape
// ({agent: "Intake"}) first, then raw-Dataverse fallbacks.
function agentNameOf(r) {
  if (r.agent) return r.agent;
  const fv = r['gbx_agent_name@OData.Community.Display.V1.FormattedValue'];
  if (fv) return fv;
  const raw = r.gbx_agent_name;
  if (typeof raw === 'number') return AGENT_INT[raw] || String(raw);
  return raw || '';
}
const explanationOf = (r) => r.explanation || r.gbx_human_readable_explanation || r.action || r.gbx_action || '';
const actionOf = (r) => r.action || r.gbx_action || '';
const flagOf = (r) => r.flagRaised === true || r.flagRaised === 'True' || r.flagRaised === 'true' || !!r.gbx_flag_raised;
const adapterOf = (r) => r.adapterStatus || r['gbx_adapter_status@OData.Community.Display.V1.FormattedValue'] || '';

// AgentFlow's top-level pipeline keys.
const AGENT_KEY = {
  Intake: 'INTAKE',
  Extraction: 'EXTRACTION',
  Policy: 'POLICY',
  Validation: 'VALIDATION',
  Adjudication: 'ADJUDICATION'
};

// Validation sub-check chips that AgentFlow renders.
const SUB_LIST = ['NOAA', 'NHTSA', 'ISO', 'NICB', 'DMV', 'Telematics', 'EstimateRule'];

// Choice gbx_recommendation integer → label.
const RECO_INT = {
  10000: 'Approve',
  10001: 'Deny',
  10002: 'Partial',
  10003: 'Escalate',
  10004: 'Adjust'
};
// Choice gbx_tier integer → numeric tier (1/2/3).
const TIER_INT = { 10000: 1, 10001: 2, 10002: 3 };

function recommendationOf(r) {
  const fv = r['gbx_recommendation@OData.Community.Display.V1.FormattedValue'];
  if (fv) return fv;
  const raw = r.gbx_recommendation;
  if (typeof raw === 'number') return RECO_INT[raw] || null;
  return raw || null;
}

function tierOf(r) {
  const raw = r.gbx_tier;
  if (typeof raw === 'number') return TIER_INT[raw] ?? null;
  const fv = r['gbx_tier@OData.Community.Display.V1.FormattedValue'];
  if (fv) return parseInt(fv, 10) || null;
  return null;
}

// A row is the "verdict" when the Adjudication agent acts.
function isVerdictRow(r) {
  return agentNameOf(r) === 'Adjudication';
}

// Derive the verdict from the Adjudication row's plain-English text (clean shape
// carries no choice fields, so we read tier/confidence/amount from the wording).
function deriveVerdict(r) {
  const expl = explanationOf(r);
  const txt = (expl + ' ' + actionOf(r)).toLowerCase();
  let tier = 1;
  if (/tier 3|escalat|live handler|bodily injury/.test(txt)) tier = 3;
  else if (/adjuster|tier 2|route to|adjust/.test(txt)) tier = 2;
  const conf = expl.match(/confidence\s+(\d+)/i);
  const amt = expl.match(/\$([\d,]+)/);
  return {
    tier,
    label: { 1: 'Auto-approved', 2: 'Adjuster review', 3: 'Live handler' }[tier],
    confidence: conf ? Number(conf[1]) : 0,
    recommendation: tier === 1 ? 'Approve' : tier === 3 ? 'Escalate' : 'Adjust',
    amount: amt ? Number(amt[1].replace(/,/g, '')) : null,
    narrate: expl || null,
  };
}

/* --------------------------- state derivation ---------------------------- */

function mapRowsToTimelineState(rows, ready, active) {
  const agents = { INTAKE: 'idle', EXTRACTION: 'idle', POLICY: 'idle', VALIDATION: 'idle', ADJUDICATION: 'idle' };
  const subs = Object.fromEntries(SUB_LIST.map((s) => [s, 'idle']));
  const latencies = {};
  const summaries = {};
  let narrate = null;
  let verdict = null;

  rows.forEach((r) => {
    const name = agentNameOf(r);
    const key = AGENT_KEY[name];
    const flag = flagOf(r);
    const explanation = explanationOf(r);

    if (key) {
      // Once a row exists for an agent it has at least run; flag/verdict refine it.
      agents[key] = flag ? 'flagged' : 'done';
      if (explanation) summaries[key] = explanation;
      if (r.gbx_latency_ms != null) latencies[key] = Number(r.gbx_latency_ms) / 1000;
      if (explanation) narrate = explanation;
    }

    // Validation sub-checks: only on Validation rows, matched from the wording.
    if (name === 'Validation') {
      const subKey = subKeyOf(r);
      if (subKey) {
        subs[subKey] = flag ? 'flagged' : 'done';
        if (explanation) summaries[subKey] = shorten(explanation);
      }
    }

    if (isVerdictRow(r)) {
      verdict = deriveVerdict(r);
      agents.ADJUDICATION = verdict.tier === 3 ? 'escalated' : flag ? 'flagged' : 'done';
    }
  });

  // Mark agents that have a successor as "done", and the newest active agent as "running"
  // when no verdict yet (gives the pipeline a live, in-flight feel between polls).
  if (active && ready && !verdict && rows.length) {
    const lastKey = AGENT_KEY[agentNameOf(rows[rows.length - 1])];
    if (lastKey && agents[lastKey] === 'done') agents[lastKey] = 'running';
  }

  const log = rows.map((r, idx) => {
    const name = agentNameOf(r);
    const sub = name === 'Validation' ? subKeyOf(r) : null;
    return {
      idx,
      at: idx,
      ts: clockOf(r),
      agent: sub ? `${name} · ${sub}` : name + ' Agent',
      text: explanationOf(r),
      cite: r.gbx_policy_reference || null,
      flag: flagOf(r)
    };
  });

  return {
    live: active && rows.length > 0,
    ready,
    agents,
    subs,
    latencies,
    summaries,
    narrate,
    log,
    verdict
  };
}

// Detect which validation sub-chip a row maps to. Clean shape has no sub_agent
// field, so we match the known check names from the action + explanation wording.
function subKeyOf(r) {
  const hay = ((r.gbx_sub_agent || '') + ' ' + actionOf(r) + ' ' + explanationOf(r)).toLowerCase();
  const hit = SUB_LIST.find((s) => hay.includes(s.toLowerCase()));
  if (hit) return hit;
  if (/estimate/i.test(hay)) return 'EstimateRule';
  return null;
}

function clockOf(r) {
  const v = ts(r);
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour12: false });
}

function shorten(s, n = 24) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
