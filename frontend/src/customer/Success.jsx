import { Link } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import { SaraAvatar } from '../components/SaraHeader.jsx';

export default function Success() {
  return (
    <PhoneFrame time="9:46">
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
        </div>
        <h1 className="text-xl font-bold">Your claim is in</h1>
        <p className="text-sm text-emerald-50 mt-1">Sara is reviewing it right now.</p>
        <p className="font-mono text-sm bg-white/15 inline-block px-3 py-1 rounded-md mt-4">CLM-2026-4521</p>
      </div>

      <div className="px-6 -mt-6 pb-8">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <SaraAvatar size={12} ring />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Sara is on it</p>
              <p className="text-xs text-slate-500">Most simple claims approved within minutes</p>
            </div>
          </div>

          <div className="space-y-3">
            <Step done label="Claim received" sub="9:46 AM" />
            <Step current label="Documents being processed" sub="In progress…" />
            <Step idx="3" label="Coverage check" />
            <Step idx="4" label="Decision" />
          </div>

          <div className="border-t border-slate-100 mt-5 pt-4">
            <p className="text-xs text-slate-500">We'll notify you on this number, by text and email, the moment your claim is decided.</p>
          </div>
        </div>

        <Link to="/customer/dashboard" className="w-full block text-center bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-2xl mt-4 text-sm">
          Track my claim
        </Link>
        <button className="w-full text-brand-600 font-medium py-3 mt-1 text-sm">View Glass Box audit trail</button>
      </div>
    </PhoneFrame>
  );
}

function Step({ done, current, idx, label, sub }) {
  return (
    <div className={`flex items-start gap-3 ${idx ? 'opacity-50' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        done ? 'bg-emerald-100 text-emerald-700' :
        current ? 'bg-brand-100 text-brand-700 pulse-dot' :
        'bg-slate-100 text-slate-400'
      }`}>
        {done ? '✓' : current ? <span className="w-2 h-2 rounded-full bg-brand-600" /> : idx}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${idx ? 'text-slate-700' : 'text-slate-900'}`}>{label}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}
