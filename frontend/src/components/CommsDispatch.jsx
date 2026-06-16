import { useEffect, useState } from 'react';

// Multi-channel notification dispatch — shows the system actually sending the
// message on every channel at once: SMS + Email to the policyholder, Teams to
// the internal claims channel. Used for the missing-document request and the
// settlement/decision notice. Visual for the demo; each card maps 1:1 to a
// production connector (Azure Communication Services SMS/Email + Teams webhook).
export default function CommsDispatch({ scenario, claim, onComplete, onClose }) {
  const [delivered, setDelivered] = useState(0); // how many channels delivered (visual)
  const [results, setResults] = useState({});    // real send results keyed by channel kind

  const content = buildContent(scenario, claim);
  const channels = content.channels;

  useEffect(() => {
    // Visual baseline — always animates, even if the notify server is down.
    const timers = channels.map((_, i) => setTimeout(() => setDelivered((d) => Math.max(d, i + 1)), 500 + i * 550));

    // Real dispatch — fire the actual sends; enhance cards with delivery detail.
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, claim: { id: claim.id, customer: claim.customer }, channels })
    })
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        (data.results || []).forEach((r) => { map[r.kind] = r; });
        setResults(map);
        setDelivered(channels.length); // everything resolved
      })
      .catch(() => {/* offline → timer fallback already covers it */});

    return () => timers.forEach(clearTimeout);
  }, [scenario]); // eslint-disable-line

  const allDone = delivered >= channels.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${content.accent.chip}`}>
              {content.icon}
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{content.title}</h3>
              <p className="text-xs text-slate-500">{content.subtitle}</p>
            </div>
            <span className="ml-auto text-xs font-medium text-slate-500">
              {allDone ? 'All channels delivered' : `Sending… ${delivered}/${channels.length}`}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-3 bg-slate-50">
          {channels.map((ch, i) => (
            <ChannelCard key={ch.kind} ch={ch} delivered={i < delivered} result={results[ch.kind]} />
          ))}
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Logged to Glass Box audit · {claim.id}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
              Close
            </button>
            <button
              onClick={onComplete}
              disabled={!allDone}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                allDone ? 'text-white bg-brand-600 hover:bg-brand-700' : 'text-slate-400 bg-slate-100 cursor-not-allowed'
              }`}
            >
              {content.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ ch, delivered, result }) {
  const real = delivered && result && result.status === 'delivered';
  return (
    <div className={`rounded-xl border bg-white p-3 transition-all duration-300 ${delivered ? 'border-slate-200 opacity-100' : 'border-dashed border-slate-200 opacity-60'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          {ch.badge} {ch.kind}
        </span>
        <Status delivered={delivered} result={result} />
      </div>
      <p className="text-[11px] text-slate-400 mb-1">{ch.to}</p>
      <div className={`rounded-lg p-2.5 text-[11px] leading-snug ${ch.bubble}`}>
        {ch.subject && <p className="font-semibold text-slate-800 mb-1">{ch.subject}</p>}
        <p className="text-slate-600">{ch.body}</p>
      </div>
      {real && result.detail && (
        <p className="text-[10px] text-emerald-600 mt-1.5 font-medium">✓ Sent live · {result.detail}</p>
      )}
    </div>
  );
}

function Status({ delivered, result }) {
  if (delivered) {
    const live = result && result.status === 'delivered';
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
        {live ? 'Delivered · live' : 'Delivered'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
      <span className="w-2 h-2 rounded-full bg-slate-300 pulse-dot" />
      Sending
    </span>
  );
}

function buildContent(scenario, claim) {
  const first = claim.customer.split(' ')[0];
  const amount = claim.amount ? `$${claim.amount.toLocaleString()}` : '';

  if (scenario === 'missingDoc') {
    return {
      title: 'Requesting missing document',
      subtitle: `${claim.customer} · repair estimate needed to continue`,
      cta: 'Done',
      accent: { chip: 'bg-amber-100 text-amber-700' },
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>,
      channels: [
        { kind: 'SMS', badge: '💬', to: '+1 (415) ···-4471', bubble: 'bg-emerald-50',
          body: `AI Elites: To finish claim ${claim.id} we need your repair estimate. Upload securely: aielites.co/u/3f9b. Reply HELP for help.` },
        { kind: 'Email', badge: '✉️', to: `${first.toLowerCase()}@email.com`, bubble: 'bg-slate-50', subject: 'Action needed: one document to finish your claim',
          body: `Hi ${first}, we're almost done. Please upload your repair estimate so Sara can complete your assessment. It takes about a minute.` },
        { kind: 'Teams', badge: '👥', to: '#claims-tier2 · Mike Patel', bubble: 'bg-indigo-50',
          body: `${claim.id} — awaiting repair estimate from policyholder. Auto-reminder sent. Will resume on upload.` }
      ]
    };
  }

  // settlement / decision
  return {
    title: 'Decision sent to policyholder',
    subtitle: `${claim.customer} · approved${amount ? ` · ${amount}` : ''}`,
    cta: 'View on customer device →',
    accent: { chip: 'bg-emerald-100 text-emerald-700' },
    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>,
    channels: [
      { kind: 'SMS', badge: '💬', to: '+1 (415) ···-4471', bubble: 'bg-emerald-50',
        body: `Good news, ${first}! Your AI Elites claim ${claim.id} is approved. ${amount} is on its way to your account ending 4471 (1–2 business days).` },
      { kind: 'Email', badge: '✉️', to: `${first.toLowerCase()}@email.com`, bubble: 'bg-slate-50', subject: `Your claim is approved — ${amount} settlement`,
        body: `Hi ${first}, your claim is approved and ${amount} has been released. Tap to see the full plain-English breakdown of how we decided.` },
      { kind: 'Teams', badge: '👥', to: '#claims-decisions', bubble: 'bg-indigo-50',
        body: `✅ ${claim.id} auto-approved (Tier ${claim.tier}, ${claim.confidence}%). ${amount} released. Rationale logged to Glass Box.` }
    ]
  };
}
