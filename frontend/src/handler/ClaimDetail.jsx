import { useParams, Link, useNavigate } from 'react-router-dom';
import { mockClaims } from '../data/mockClaims.js';
import GlassBoxPanel from './GlassBoxPanel.jsx';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const claim = mockClaims.find((c) => c.id === id) || mockClaims[0];

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
              {claim.documents.map((d, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="w-10 h-10 rounded-md bg-white mx-auto mb-2 flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                  </div>
                  <p className="text-xs font-medium text-slate-700">{d}</p>
                </div>
              ))}
            </div>
          </Card>
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
            <button className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              Request more info
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50">
              Deny
            </button>
            <button className="px-4 py-2.5 text-sm font-medium text-amber-700 bg-white border border-amber-200 rounded-lg hover:bg-amber-50">
              Adjust
            </button>
            <button
              onClick={() => navigate('/handler/queue')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              ✓ Approve {claim.amount && `· $${claim.amount.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </main>
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
