import { Link } from 'react-router-dom';
import { mockClaims } from '../data/mockClaims.js';

export default function Queue() {
  const tier2 = mockClaims.filter((c) => c.tier === 2).length;
  const tier3 = mockClaims.filter((c) => c.tier === 3).length;
  const auto = mockClaims.filter((c) => c.tier === 1).length;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Claims queue</h1>
          <p className="text-sm text-slate-500 mt-1">{mockClaims.length} claims · last refreshed just now</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
            Filters
          </button>
          <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Awaiting your review (Tier 2)" value={tier2} accent="amber" />
        <Stat label="Escalated (Tier 3)" value={tier3} accent="rose" />
        <Stat label="Auto-approved today" value={auto} accent="emerald" />
        <Stat label="Avg time to decision" value="42 sec" accent="brand" />
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Claim</th>
              <th className="text-left px-5 py-3 font-semibold">Customer</th>
              <th className="text-left px-5 py-3 font-semibold">Type</th>
              <th className="text-left px-5 py-3 font-semibold">State</th>
              <th className="text-left px-5 py-3 font-semibold">Confidence</th>
              <th className="text-left px-5 py-3 font-semibold">Recommended</th>
              <th className="text-left px-5 py-3 font-semibold">Tier</th>
              <th className="text-right px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockClaims.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-mono text-xs text-slate-500">{c.id}</p>
                  <p className="text-xs text-slate-400">{c.submittedAt}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900">{c.customer}</p>
                  <p className="text-xs text-slate-500">{c.policyId}</p>
                </td>
                <td className="px-5 py-4">{c.lossType}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-mono ${c.noFault ? 'text-amber-600' : 'text-slate-500'}`}>
                    {c.state}{c.noFault && ' (no-fault)'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <ConfidenceBar value={c.confidence} />
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">{c.recommendation}</p>
                  {c.amount && <p className="text-xs text-slate-500">${c.amount.toLocaleString()}</p>}
                </td>
                <td className="px-5 py-4">
                  <TierBadge tier={c.tier} />
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    to={`/handler/claim/${c.id}`}
                    className="text-brand-600 font-medium hover:underline text-sm"
                  >
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value, accent }) {
  const tone = {
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
    brand: 'text-brand-600'
  }[accent];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function ConfidenceBar({ value }) {
  const tone = value >= 90 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${tone} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-600">{value}%</span>
    </div>
  );
}

function TierBadge({ tier }) {
  const tones = {
    1: 'bg-emerald-50 text-emerald-700',
    2: 'bg-amber-50 text-amber-700',
    3: 'bg-rose-50 text-rose-700'
  };
  const labels = { 1: 'Auto', 2: 'Review', 3: 'Escalate' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tier]}`}>
      Tier {tier} · {labels[tier]}
    </span>
  );
}
