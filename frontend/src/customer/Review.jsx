import { useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import SaraHeader from '../components/SaraHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Review() {
  const navigate = useNavigate();
  return (
    <PhoneFrame time="9:46">
      <SaraHeader />
      <ProgressBar step={4} total={5} secondsLeft={10} />

      <div className="px-6 pt-5 pb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Quick review</h2>
        <p className="text-sm text-slate-500 mb-5">Make sure this looks right before we submit.</p>

        <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100">
          <Section title="Policy" main="POL-2026-0847 · Auto Comprehensive" />
          <Section title="Incident" main="Collision · Parked-and-struck" sub="May 4, 2026 · 2:30 PM · 850 Market St, San Francisco, CA" />
          <Section title="Damage" main="Front · airbag not deployed" sub="No injuries · no police report" />
          <Section title="Documents" main="3 of 4 uploaded" sub="Repair estimate pending" />
        </div>

        <button className="w-full mt-4 text-brand-600 font-medium text-sm py-2">Edit any of this →</button>

        <div className="bg-brand-50 rounded-2xl p-4 mt-5">
          <p className="text-xs text-slate-700">
            By submitting, you agree we may pull external data (DMV, weather, vehicle history) to validate your claim. Every check is logged in your <a href="#" className="text-brand-600 underline font-medium">Glass Box audit trail</a>.
          </p>
        </div>

        <button
          onClick={() => navigate('/customer/success')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-2xl mt-5 text-sm shadow-sm transition-colors"
        >
          Submit claim
        </button>
      </div>
    </PhoneFrame>
  );
}

function Section({ title, main, sub }) {
  return (
    <div className="p-4">
      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{title}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5">{main}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
