import { Link, useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import { COPILOT_EMBED_URL } from '../config.js';

/**
 * Live Sara chat embedded in the customer phone frame.
 * Renders the published Copilot Studio agent (real greeting + claim flow) when
 * COPILOT_EMBED_URL is set; otherwise shows a setup hint so the demo never breaks.
 */
export default function Chat() {
  const navigate = useNavigate();
  return (
    <PhoneFrame time="9:41">
      <div className="flex flex-col h-full">
        {/* Sara header strip */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Sara</p>
            <p className="text-[11px] text-emerald-600">Glass Box Claims Assistant · online</p>
          </div>
          <Link to="/customer/dashboard" className="ml-auto text-[11px] text-slate-400 hover:text-slate-600">Close</Link>
        </div>

        {/* Live agent OR setup fallback */}
        {COPILOT_EMBED_URL ? (
          <iframe
            title="Sara — Glass Box Claims Assistant"
            src={COPILOT_EMBED_URL}
            className="flex-1 w-full border-0 bg-slate-50"
            allow="microphone; clipboard-write"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3 bg-slate-50">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-xl">🔌</div>
            <p className="text-sm font-semibold text-slate-700">Sara isn’t connected yet</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Publish the Copilot Studio agent, then set <code className="bg-slate-200 px-1 rounded">VITE_COPILOT_EMBED_URL</code> in
              <code className="bg-slate-200 px-1 rounded">frontend/.env</code> to the Custom-website chat URL. See
              <code className="bg-slate-200 px-1 rounded">src/config.js</code>.
            </p>
          </div>
        )}

        {/* Move from the conversation to the damage photo step */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          <button
            onClick={() => navigate('/customer/assess')}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
            Add a photo of the damage
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
