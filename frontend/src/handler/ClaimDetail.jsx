import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import GlassBoxPanel from './GlassBoxPanel.jsx';
import CommsDispatch from '../components/CommsDispatch.jsx';
import useClaim from '../data/useClaim.js';
import { approveClaim, askPolicy } from '../api/claims.js';

// Real supporting documents served from /public/docs (open in a new tab).
const POLICY_DOCS = [
  { label: 'Auto policy', href: '/docs/policy-sarah-chen.html' },
  { label: 'Police report', href: '/docs/police-report-sarah-chen.html' },
  { label: 'Insurance card', href: '/docs/insurance-card-sarah-chen.html' },
  { label: 'Repair estimate', href: '/docs/repair-estimate-sarah-chen.html' }
];

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { claim, loading } = useClaim(id);
  const [dispatch, setDispatch] = useState(null); // null | 'settlement' | 'missingDoc'

  // Stage 2 — adjuster assigned: send a prompt email once when the claim is opened.
  useEffect(() => {
    if (!claim?.guid) return;
    const key = 'assigned-' + claim.id;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels: [{ kind: 'Email', subject: `An adjuster is reviewing your claim ${claim.id}`,
        body: `Hi Sarah, claims adjuster Mike Patel has been assigned to your claim ${claim.id} and is reviewing it now.` }] })
    }).catch(() => {});
  }, [claim?.guid]);

  if (loading) return <main className="max-w-7xl mx-auto px-6 py-16 text-center text-slate-400">Loading claim…</main>;
  if (!claim) return <main className="max-w-7xl mx-auto px-6 py-16 text-center text-slate-400">Claim not found.</main>;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <Link to="/handler/queue" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1 mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back to queue
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-slate-500">{claim.id}</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{claim.customer} · {claim.lossType}</h1>
          <p className="text-sm text-slate-500 mt-1">{claim.policyId} · {claim.state}{claim.noFault && ' (no-fault state)'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Confidence</p>
          <p className={`text-3xl font-bold font-mono ${claim.confidence >= 90 ? 'text-emerald-600' : claim.confidence >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
            {claim.confidence}%
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="AI Recommendation">
            <div className="flex items-baseline gap-3 mb-3">
              <p className="text-xl font-bold text-slate-900">{claim.recommendation}</p>
              {claim.amount && <p className="text-lg font-semibold text-slate-700">${claim.amount.toLocaleString()}</p>}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{claim.aiSummary}</p>
            {claim.flags?.length > 0 && (
              <div className="mt-4 space-y-2">
                {claim.flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${f.severity === 'high' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      Flag
                    </span>
                    <span className="text-slate-700">{f.text}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Claim details">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Loss type" value={claim.lossType} />
              <Field label="Sub-type" value={claim.subType} />
              <Field label="Incident date" value={claim.incidentDate} />
              <Field label="Location" value={claim.location} />
              <Field label="Reported via" value={claim.channel} />
              <Field label="Vehicle" value={claim.vehicle} />
              <Field label="Policy coverage" value={claim.coverage} />
              <Field label="Deductible" value={`$${claim.deductible}`} />
            </div>
          </Card>

          <Card title="Validation results">
            <div className="space-y-2">
              {claim.validation.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${v.status === 'pass' ? 'bg-emerald-500' : v.status === 'flag' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                    <span className="text-sm font-medium text-slate-700">{v.check}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{v.detail}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Documents">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {claim.photo && (
                <a href={claim.photo} target="_blank" rel="noreferrer" className="bg-slate-50 rounded-lg overflow-hidden block hover:ring-2 hover:ring-brand-300">
                  <img src={claim.photo} alt="Damage photo uploaded by policyholder" className="w-full h-20 object-cover" />
                  <p className="text-xs font-medium text-slate-700 p-2 text-center">Damage photo</p>
                </a>
              )}
              {(claim.evidence || []).map((f, i) => {
                const isImg = (f.dataUrl || '').startsWith('data:image');
                return (
                  <a key={'ev' + i} href={f.dataUrl} target="_blank" rel="noreferrer" className="bg-slate-50 rounded-lg overflow-hidden block hover:ring-2 hover:ring-brand-300">
                    {isImg
                      ? <img src={f.dataUrl} alt={f.name} className="w-full h-20 object-cover" />
                      : <div className="h-14 flex items-center justify-center text-brand-500"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg></div>}
                    <p className="text-[11px] font-medium text-slate-700 p-1.5 text-center truncate">{f.name}</p>
                  </a>
                );
              })}
              {POLICY_DOCS.map((doc) => (
                <a key={doc.label} href={doc.label === 'Police report' ? `${doc.href}?claim=${encodeURIComponent(claim.id)}` : doc.href} target="_blank" rel="noreferrer" className="bg-slate-50 rounded-lg p-3 text-center block hover:ring-2 hover:ring-brand-300">
                  <div className="w-10 h-10 rounded-md bg-white mx-auto mb-2 flex items-center justify-center text-brand-500">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                  </div>
                  <p className="text-xs font-medium text-slate-700">{doc.label}</p>
                </a>
              ))}
            </div>
          </Card>

          {claim.customer === 'Sarah Chen' && <PolicyAsk />}
        </div>

        <div>
          <GlassBoxPanel claim={claim} />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-6 mt-8 px-6 py-4 bg-white border-t border-slate-200 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Decision will be logged in Glass Box and sent to <span className="font-semibold">{claim.customer}</span> on their original channel.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDispatch('missingDoc')}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Request more info
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50">
              Deny
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-amber-700 bg-white border border-amber-200 rounded-lg hover:bg-amber-50">
              Adjust
            </button>
            <button
              onClick={() => { if (claim.guid) approveClaim(claim.guid); setDispatch('settlement'); }}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              ✓ Approve {claim.amount && `· $${claim.amount.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>

      {dispatch && (
        <CommsDispatch
          scenario={dispatch}
          claim={claim}
          onClose={() => setDispatch(null)}
          onComplete={() =>
            dispatch === 'settlement'
              ? navigate(`/customer/settlement/${claim.id}`)
              : setDispatch(null)
          }
        />
      )}
    </main>
  );
}

// Adjuster asks questions answered from the real policy + police report (Azure OpenAI).
function PolicyAsk() {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const ask = async (question) => {
    const text = (question || q).trim();
    if (!text) return;
    setQ(text); setLoading(true); setAnswer('');
    const r = await askPolicy(text);
    setAnswer(r.answer || r.error || 'No answer.');
    setLoading(false);
  };
  const suggestions = ['Is collision damage covered?', "What's the deductible?", 'Who was at fault?'];
  return (
    <Card title="Ask the policy · AI">
      <div className="flex gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask about coverage, deductible, fault…"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button onClick={() => ask()} disabled={loading} className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg">
          {loading ? '…' : 'Ask'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => ask(s)} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md">{s}</button>
        ))}
      </div>
      {loading && <p className="text-sm text-slate-400 mt-3">Reading the policy…</p>}
      {answer && !loading && (
        <div className="mt-3 bg-brand-50 border border-brand-100 rounded-xl p-3 text-sm text-slate-700 leading-relaxed">
          {answer}
          <p className="text-[10px] text-slate-400 mt-2">Retrieved via Azure AI Search · answered by Azure OpenAI GPT-4.1</p>
        </div>
      )}
    </Card>
  );
}

function Card({ title, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}
