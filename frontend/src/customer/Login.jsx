import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';

export default function CustomerLogin() {
  const [policy, setPolicy] = useState('POL-2026-0847');
  const navigate = useNavigate();

  return (
    <PhoneFrame>
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-brand-600 to-brand-700 text-white">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 mb-4">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">AI Elites Claims</h1>
          <p className="text-sm text-blue-100 mt-1">File a claim in under 2 minutes</p>
        </div>
      </div>

      <div className="px-6 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Sign in to your policy</h2>
          <p className="text-xs text-slate-500 mb-5">We'll text you a code to confirm it's you.</p>

          <label className="block text-xs font-medium text-slate-600 mb-1">Policy number</label>
          <input
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <label className="block text-xs font-medium text-slate-600 mb-1">Mobile number on file</label>
          <input
            value="(415) ••• 4421"
            readOnly
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm mb-5 bg-slate-50"
          />

          <button
            onClick={() => navigate('/customer/dashboard')}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Send verification code
          </button>
          <button className="w-full mt-3 text-brand-600 font-medium py-2 text-sm">
            Forgot policy number?
          </button>
        </div>

        <div className="text-center text-xs text-slate-400 mt-6">
          <a href="#" className="underline">Talk to a person</a>
          <span className="mx-2">·</span>
          <a href="#" className="underline">English</a>
        </div>
      </div>
    </PhoneFrame>
  );
}
