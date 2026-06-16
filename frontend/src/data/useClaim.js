import { useState, useEffect } from 'react';
import { mockClaims } from './mockClaims.js';
import { getClaim } from '../api/claims.js';

// Resolve a claim by id: mock data first, else fetch the live claim from the
// server. Lets the adjuster screens render brand-new claims created at FNOL.
export default function useClaim(id) {
  const mock = mockClaims.find((c) => c.id === id);
  const [claim, setClaim] = useState(mock || null);
  const [loading, setLoading] = useState(!mock);

  useEffect(() => {
    let on = true;
    const m = mockClaims.find((c) => c.id === id);
    if (m) { setClaim(m); setLoading(false); return; }
    setLoading(true);
    const load = () => getClaim(id).then((c) => { if (on && c) { setClaim(c); setLoading(false); } });
    load();
    // Poll so the agent audit rows appear as the real agents finish (they run a
    // few seconds after the photo is submitted).
    const iv = setInterval(load, 4000);
    return () => { on = false; clearInterval(iv); };
  }, [id]);

  return { claim, loading };
}
