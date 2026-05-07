import { Link, useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import { SaraAvatar } from '../components/SaraHeader.jsx';

export default function Initiate() {
  const navigate = useNavigate();
  return (
    <PhoneFrame time="9:43">
      <div className="px-6 pt-6 pb-10">
        <button onClick={() => navigate(-1)} className="text-brand-600 text-sm mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <SaraAvatar size={16} ring />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white pulse-dot" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Sara Bennett</p>
              <p className="text-xs text-slate-500">Claims specialist · Online now</p>
            </div>
          </div>

          <div className="bg-brand-50 rounded-2xl rounded-tl-md p-4 mb-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              Hi Sarah — I'm really sorry you're going through this. I'm Sara and I'll guide you through filing your claim. It usually takes <strong>under 2 minutes</strong>, and most simple claims are <strong>approved the same day</strong>.
            </p>
          </div>
          <div className="bg-brand-50 rounded-2xl rounded-tl-md p-4 typing-bubble inline-block">
            <span></span><span></span><span></span>
          </div>

          <div className="mt-5 text-xs text-slate-500 flex items-start gap-2">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            Everything you tell Sara is logged in our Glass Box audit trail — you can see why every decision was made.
          </div>
        </div>

        <Link to="/customer/loss-type" className="w-full block text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-2xl mt-6 text-sm shadow-sm transition-colors">
          Let's get started →
        </Link>

        <button className="w-full mt-3 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-medium py-3.5 rounded-2xl text-sm">
          Speak to a human instead
        </button>

        <p className="text-center text-xs text-slate-400 mt-5">
          If this is an emergency, call <a className="text-brand-600 underline" href="tel:911">911</a> first.
        </p>
      </div>
    </PhoneFrame>
  );
}
