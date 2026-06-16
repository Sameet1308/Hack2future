import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import { listClaims } from '../api/claims.js';

export default function CustomerDashboard() {
  const [claims, setClaims] = useState([]);
  useEffect(() => {
    let on = true;
    const refresh = () => listClaims().then((all) => {
      if (on) setClaims(all.filter((c) => c.customer === 'Sarah Chen'));
    });
    refresh();
    const iv = setInterval(refresh, 4000);          // status updates after the adjuster decides
    window.addEventListener('focus', refresh);
    return () => { on = false; clearInterval(iv); window.removeEventListener('focus', refresh); };
  }, []);

  return (
    <PhoneFrame time="9:42">
      <div className="px-6 pt-6 pb-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs text-slate-500">Welcome back</p>
            <h1 className="text-xl font-bold text-slate-900">Sarah Chen</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-semibold text-brand-700">SC</div>
        </div>

        <Link
          to="/customer/chat"
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-2xl shadow-sm text-sm flex items-center justify-center gap-2 mb-2 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          File a new claim
        </Link>
        <Link
          to="/customer/initiate"
          className="w-full block text-center text-xs text-slate-400 hover:text-slate-600 mb-6"
        >
          Prefer a step-by-step form instead?
        </Link>

        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your policy</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500">Auto Comprehensive · CA</p>
              <p className="font-mono text-sm font-semibold text-slate-900 mt-0.5">POL-2026-0847</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">Active</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div><p className="text-xs text-slate-400">Liability</p><p className="text-sm font-semibold">100/300/50</p></div>
            <div><p className="text-xs text-slate-400">Collision</p><p className="text-sm font-semibold">$500</p></div>
            <div><p className="text-xs text-slate-400">Comp</p><p className="text-sm font-semibold">$500</p></div>
          </div>
          <a href="/docs/policy-sarah-chen.html" target="_blank" rel="noreferrer" className="block text-center text-xs text-brand-600 font-medium mt-3 pt-3 border-t border-slate-100">
            View policy document →
          </a>
        </div>

        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your claims</h2>
        <div className="space-y-3">
          {claims.map((c) => {
            const approved = c.status === 'approved';
            const card = (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-mono text-xs text-slate-500">{c.id}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{c.lossType} · {c.subType}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {approved ? `Approved · $${(c.amount || 0).toLocaleString()}` : 'In review'}
                </span>
              </div>
            );
            return approved
              ? <Link key={c.id} to={`/customer/settlement/${c.id}`} className="block bg-white rounded-2xl p-4 shadow-sm hover:ring-2 hover:ring-emerald-200">{card}</Link>
              : <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">{card}</div>;
          })}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-mono text-xs text-slate-500">CLM-2025-1412</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">Glass repair · Jan 2025</p>
              </div>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">Closed</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          <a href="#" className="underline">Talk to a person</a>
        </p>
      </div>
    </PhoneFrame>
  );
}
