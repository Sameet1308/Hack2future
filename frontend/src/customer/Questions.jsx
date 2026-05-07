import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import SaraHeader from '../components/SaraHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Questions() {
  const [injury, setInjury] = useState('No');
  const [police, setPolice] = useState('No');
  const [airbag, setAirbag] = useState('No');
  const [damageArea, setDamageArea] = useState('Front');
  const navigate = useNavigate();

  const Pill = ({ value, current, setter }) => (
    <button
      onClick={() => setter(value)}
      className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
        current === value
          ? 'border-2 border-brand-600 bg-brand-50 text-brand-700'
          : 'border border-slate-200 bg-white text-slate-700'
      }`}
    >
      {value}
    </button>
  );

  return (
    <PhoneFrame time="9:44">
      <SaraHeader />
      <ProgressBar step={2} total={5} secondsLeft={70} />

      <div className="px-6 pt-5 pb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">A few quick details</h2>
        <p className="text-sm text-slate-500 mb-5">Fields marked <span className="text-rose-500 font-bold">*</span> are required.</p>

        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">About the incident</div>

        <label className="block req text-xs font-medium text-slate-700 mb-1">When did it happen?</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <input defaultValue="May 4, 2026" className="rounded-xl border border-slate-200 px-3 py-3 text-sm focus:ring-2 focus:ring-brand-500" />
          <input defaultValue="2:30 PM" className="rounded-xl border border-slate-200 px-3 py-3 text-sm focus:ring-2 focus:ring-brand-500" />
        </div>

        <label className="block req text-xs font-medium text-slate-700 mb-1">Where did it happen?</label>
        <input defaultValue="850 Market St, San Francisco, CA" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm mb-1 focus:ring-2 focus:ring-brand-500" />
        <p className="text-[11px] text-slate-400 mb-4">📍 Detected: California (no-fault: no)</p>

        <label className="block req text-xs font-medium text-slate-700 mb-1">Briefly, what happened?</label>
        <textarea
          rows="3"
          defaultValue="Was leaving a parking spot and another car backed into my front bumper. No injuries."
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm mb-4 focus:ring-2 focus:ring-brand-500"
        />

        <label className="block req text-xs font-medium text-slate-700 mb-2">Was anyone hurt?</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Pill value="No" current={injury} setter={setInjury} />
          <Pill value="Yes" current={injury} setter={setInjury} />
        </div>

        <label className="block req text-xs font-medium text-slate-700 mb-2">Did you call the police?</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Pill value="Yes" current={police} setter={setPolice} />
          <Pill value="No" current={police} setter={setPolice} />
        </div>

        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 mt-2">About the collision</div>

        <label className="block req text-xs font-medium text-slate-700 mb-2">How did it happen?</label>
        <select className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm mb-4 bg-white focus:ring-2 focus:ring-brand-500">
          <option>Parked-and-struck (my car was parked)</option>
          <option>Rear-ended me</option>
          <option>I rear-ended someone</option>
          <option>Side-swipe</option>
          <option>T-bone (intersection)</option>
          <option>Hit-and-run</option>
        </select>

        <label className="block req text-xs font-medium text-slate-700 mb-2">Was the airbag deployed?</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Pill value="Yes" current={airbag} setter={setAirbag} />
          <Pill value="No" current={airbag} setter={setAirbag} />
        </div>

        <label className="block req text-xs font-medium text-slate-700 mb-2">Where on your vehicle is the damage?</label>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {['Front', 'Rear', 'Side'].map((d) => (
            <button
              key={d}
              onClick={() => setDamageArea(d)}
              className={`rounded-xl py-2 text-xs font-semibold ${damageArea === d ? 'border-2 border-brand-600 bg-brand-50 text-brand-700' : 'border border-slate-200 bg-white text-slate-700'}`}
            >{d}</button>
          ))}
        </div>

        <details className="mb-5">
          <summary className="text-xs text-brand-600 font-medium cursor-pointer">+ Add optional details (other driver, witnesses)</summary>
          <p className="text-xs text-slate-400 mt-2">Optional fields shown here when expanded.</p>
        </details>

        <button
          onClick={() => navigate('/customer/documents')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors"
        >
          Continue
        </button>
      </div>
    </PhoneFrame>
  );
}
