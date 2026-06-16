import { Link, useParams } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import { SaraAvatar } from '../components/SaraHeader.jsx';
import useClaim from '../data/useClaim.js';

// Customer-facing settlement notification — the moment the decision lands.
// This is the close of the loop: adjuster approves → customer is notified by
// push + text + email, sees the payout, and a plain-English "why" (Glass Box
// calibrated to the customer tier — friendly, never the full fraud forensics).
export default function Settlement() {
  const { id } = useParams();
  const { claim, loading } = useClaim(id);

  if (loading || !claim) {
    return <PhoneFrame time="9:48"><div className="p-10 text-center text-slate-400 text-sm">Loading your settlement…</div></PhoneFrame>;
  }

  const settlement = claim.amount ?? 0;          // post-deductible payout
  const deductible = claim.deductible ?? 0;
  const estimate = settlement + deductible;       // gross repair estimate

  return (
    <PhoneFrame time="9:48">
      {/* Push notification banner — slides in at the top */}
      <div className="px-4 pt-3">
        <div className="settlement-toast bg-white rounded-2xl shadow-lg border border-slate-100 p-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-900">AI Elites</p>
              <p className="text-[10px] text-slate-400">now</p>
            </div>
            <p className="text-xs text-slate-600 leading-snug mt-0.5">
              Good news, Sarah — your claim is approved. ${settlement.toLocaleString()} is on its way.
            </p>
          </div>
        </div>
      </div>

      {/* Decision header */}
      <div className="px-6 pt-5 pb-7 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
          <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Claim approved</h1>
        <p className="text-sm text-slate-500 mt-1">{claim.lossType} · {claim.subType}</p>
        <p className="font-mono text-xs bg-slate-100 text-slate-600 inline-block px-2.5 py-1 rounded-md mt-3">{claim.id}</p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        {/* Settlement breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Settlement</p>
          <div className="space-y-2 text-sm">
            <Row label="Approved repair estimate" value={`$${estimate.toLocaleString()}`} />
            <Row label="Your deductible" value={`– $${deductible.toLocaleString()}`} muted />
            <div className="border-t border-slate-100 my-2" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Paid to you</span>
              <span className="text-2xl font-bold text-emerald-600">${settlement.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-4 bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
            <div>
              <p className="text-sm font-medium text-slate-900">Direct deposit · card ending 4471</p>
              <p className="text-xs text-slate-500">Arrives in 1–2 business days</p>
            </div>
          </div>
        </div>

        {/* Glass Box — customer tier: plain-English why, no forensics */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <SaraAvatar size={9} />
            <p className="text-sm font-semibold text-slate-900">Why Sara approved this</p>
          </div>
          <ul className="space-y-2.5">
            <Why text="Your policy was active and covers collision damage." />
            <Why text="Seven independent checks passed — weather, vehicle recalls, and prior-claim history all came back clean." />
            <Why text="The repair estimate was in line with typical costs for this damage." />
          </ul>
          <button className="w-full text-brand-600 font-medium text-xs mt-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50">
            See the full plain-English audit trail
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 px-4">
          We also sent these details to your phone by text and to your email.
        </p>

        <Link to="/customer/dashboard" className="w-full block text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors">
          Done
        </Link>
      </div>
    </PhoneFrame>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium ${muted ? 'text-slate-500' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function Why({ text }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7" /></svg>
      <span className="text-sm text-slate-600 leading-snug">{text}</span>
    </li>
  );
}
