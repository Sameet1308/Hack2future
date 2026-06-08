// claimAudit.js — client for the GlassBox-GetClaimAudit read flow.
//
// Fetches the real Glass Box audit trail (gbx_decisionrationale rows) for one claim
// from the Power Automate HTTP-trigger flow, and normalizes the payload so the
// React Theater / Processing screens can consume it.
//
// Endpoint contract (see docs/setup/flows/03_get_claim_audit.md):
//   GET  <CLAIM_AUDIT_URL>&claimGuid=<guid>     (preferred)
//   GET  <CLAIM_AUDIT_URL>&claimId=<CLM-...>    (fallback — flow resolves the GUID)
//   200 -> JSON array of:
//     { logId, agent, action, explanation, adapterStatus, flagRaised, latencyMs, timestamp }
//
// NOTE: the flow's Select action (text mode) stringifies values, so flagRaised arrives
// as "true"/"false" and latencyMs as "320". We coerce them here to real boolean/number.
//
// CORS: we deliberately issue a *simple* GET (no custom headers, no request body) so the
// browser skips the OPTIONS preflight that the HTTP trigger can't answer. Do not add
// headers like Content-Type to this request.

import { CLAIM_AUDIT_URL } from '../config.js';

/**
 * Append a query param to a URL that already carries the SAS query string.
 * @param {string} url   base flow URL (already has ?api-version=...&sig=...)
 * @param {string} key
 * @param {string} value
 */
function withParam(url, key, value) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

/**
 * Coerce one raw row from the flow into a typed audit entry.
 * Tolerant of both string ("true"/"320") and native (true/320) values.
 */
export function normalizeAuditRow(raw) {
  const flagRaw = raw?.flagRaised;
  const flagRaised =
    flagRaw === true || flagRaw === 'true' || flagRaw === 1 || flagRaw === '1';

  const latNum = Number(raw?.latencyMs);
  const latencyMs = Number.isFinite(latNum) ? latNum : 0;

  return {
    logId: raw?.logId ?? '',
    agent: raw?.agent ?? '',                 // "Intake" | "Policy" | ... (FormattedValue text)
    action: raw?.action ?? '',
    explanation: raw?.explanation ?? '',
    adapterStatus: raw?.adapterStatus ?? '', // "Live" | "Sandbox" | "NotApplicable"
    flagRaised,
    latencyMs,
    timestamp: raw?.timestamp ?? null
  };
}

/**
 * Fetch the ordered audit trail for a claim.
 *
 * @param {Object} args
 * @param {string} [args.claimGuid]  claim row GUID (preferred — exact, indexed)
 * @param {string} [args.claimId]    claim number e.g. "CLM-2026-0001" (fallback)
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<Array>} normalized audit rows, ordered by timestamp asc
 * @throws if CLAIM_AUDIT_URL is not configured or the request fails
 */
export async function fetchClaimAudit({ claimGuid, claimId, signal } = {}) {
  if (!CLAIM_AUDIT_URL) {
    throw new Error(
      'VITE_CLAIM_AUDIT_URL is not set — add the GlassBox-GetClaimAudit flow URL to frontend/.env.local'
    );
  }
  if (!claimGuid && !claimId) {
    throw new Error('fetchClaimAudit requires claimGuid or claimId');
  }

  let url = CLAIM_AUDIT_URL;
  if (claimGuid) url = withParam(url, 'claimGuid', claimGuid);
  else url = withParam(url, 'claimId', claimId);

  // Simple GET — no custom headers — keeps the browser from sending a CORS preflight.
  const res = await fetch(url, { method: 'GET', signal });
  if (!res.ok) {
    throw new Error(`GetClaimAudit failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  const rows = Array.isArray(data) ? data : [];
  return rows.map(normalizeAuditRow);
}

export default fetchClaimAudit;
