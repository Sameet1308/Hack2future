import { useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import SaraHeader from '../components/SaraHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

const docs = [
  { name: 'Damage photos', sub: '4 photos uploaded · all clear', verified: true, required: true },
  { name: 'Driver\'s license', sub: 'CA · expires 2029', verified: true, required: true },
  { name: 'Insurance card', sub: 'Verified', verified: true, required: true },
  { name: 'Repair estimate', sub: 'Tap to upload — or send later', verified: false, required: false }
];

export default function Documents() {
  const navigate = useNavigate();
  return (
    <PhoneFrame time="9:45">
      <SaraHeader />
      <ProgressBar step={3} total={5} secondsLeft={50} />

      <div className="px-6 pt-5 pb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload some evidence</h2>
        <p className="text-sm text-slate-500 mb-5">A clear set of photos speeds things up. We'll guide you on what's missing.</p>

        <div className="space-y-2.5 mb-5">
          {docs.map((d) => (
            <div
              key={d.name}
              className={`bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm ${
                d.verified ? 'border border-emerald-200' : 'border-2 border-dashed border-brand-300 bg-brand-50/40'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${d.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-100 text-brand-600'}`}>
                {d.verified ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5L20 7" /></svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold text-slate-900 ${d.required ? 'req inline' : ''}`}>
                  {d.name} {!d.required && <span className="text-slate-400 font-normal">(optional now)</span>}
                </p>
                <p className="text-xs text-slate-500">{d.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-2xl mb-3 text-sm flex items-center justify-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Add another photo
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800 flex gap-2">
          <span>💡</span>
          <span>If you don't have the repair estimate yet, no problem — Sara will text you a secure link to upload it later.</span>
        </div>

        <button
          onClick={() => navigate('/customer/review')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors"
        >
          Continue
        </button>
      </div>
    </PhoneFrame>
  );
}
