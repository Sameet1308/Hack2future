// Client for the REAL Dataverse-backed claim endpoints (server/notify.mjs).
// Reads claims created by Sara (Copilot) and writes the photo analysis + decision.

export async function listClaims() {
  try {
    const r = await fetch('/api/dv/claims');
    const d = await r.json();
    return d.claims || [];
  } catch { return []; }
}

export async function getClaim(id) {
  try {
    const r = await fetch('/api/dv/claim/' + encodeURIComponent(id));
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// The most recent claim in Dataverse (the one Sara just created in the chat).
export async function getLatestClaim() {
  try {
    const r = await fetch('/api/dv/latest-claim');
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// Write the photo damage assessment onto that Dataverse claim (PATCH + audit row).
export async function writeAnalysis(guid, assessment, photo, evidence) {
  try {
    const r = await fetch('/api/dv/claim/' + encodeURIComponent(guid) + '/analysis', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assessment, photo, evidence })
    });
    return r.json();
  } catch { return null; }
}

// Ask a question answered from the real policy + police-report documents (Azure OpenAI).
export async function askPolicy(question) {
  try {
    const r = await fetch('/api/policy-qa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question })
    });
    return r.json();
  } catch { return { error: 'offline' }; }
}

// Adjuster approval → update status + write an Adjudication audit row in Dataverse.
export async function approveClaim(guid) {
  try {
    const r = await fetch('/api/dv/claim/' + encodeURIComponent(guid) + '/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    });
    return r.json();
  } catch { return null; }
}
