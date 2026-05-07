import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import SaraHeader from '../components/SaraHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

const types = [
  { key: 'collision', label: 'Collision', sub: 'I hit something or got hit', icon: 'M3 11l1.5-4.5A2 2 0 016.5 5h11a2 2 0 012 1.5L21 11M5 11h14M5 11v6M19 11v6M7 17h2M15 17h2', enabled: true },
  { key: 'weather', label: 'Weather damage', sub: 'Hail, flood, wind, lightning', icon: 'M2 16c2-3 6-3 8 0M14 16c2-3 6-3 8 0M2 10c2-3 6-3 8 0M14 10c2-3 6-3 8 0', enabled: true },
  { key: 'theft', label: 'Theft', sub: 'Vehicle or contents stolen', icon: 'M4 6h16v12H4z M9 6V4h6v2', enabled: true },
  { key: 'glass', label: 'Glass only', sub: 'Windshield chip / crack', icon: 'M3 12h2l3-9 4 18 3-9h6', enabled: true }
];

export default function LossType() {
  const [selected, setSelected] = useState('collision');
  const navigate = useNavigate();

  return (
    <PhoneFrame time="9:43">
      <SaraHeader />
      <ProgressBar step={1} total={5} secondsLeft={90} />

      <div className="px-6 pt-6 pb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">What kind of incident?</h2>
        <p className="text-sm text-slate-500 mb-5">Pick the closest match. We can adjust later.</p>

        <div className="space-y-2.5">
          {types.map((t) => {
            const isSel = selected === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSelected(t.key)}
                className={`w-full text-left bg-white rounded-2xl p-4 flex items-center gap-3 transition-all ${
                  isSel ? 'border-2 border-brand-600 shadow-sm' : 'border border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSel ? 'bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-500'}`}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={t.icon} /></svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-900">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.sub}</p>
                </div>
                {isSel && (
                  <svg className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7" /></svg>
                )}
              </button>
            );
          })}
          <button className="w-full text-left text-xs text-brand-600 font-medium py-3">
            See all 11 options →
          </button>
        </div>

        <button
          onClick={() => navigate('/customer/questions')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-2xl mt-5 text-sm transition-colors"
        >
          Continue
        </button>
      </div>
    </PhoneFrame>
  );
}
