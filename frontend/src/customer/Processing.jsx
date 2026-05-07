import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAgentTimeline from '../hooks/useAgentTimeline.js';
import { timelines } from '../data/agentTimelines.js';
import AgentFlow from '../components/AgentFlow.jsx';
import PhoneFrame from '../components/PhoneFrame.jsx';
import { SaraAvatar } from '../components/SaraHeader.jsx';

export default function Processing() {
  const { id = 'CLM-2026-4521' } = useParams();
  const navigate = useNavigate();
  const timeline = timelines[id] || timelines['CLM-2026-4521'];

  const t = useAgentTimeline(timeline, { autoStart: true, speed: 1.5 });

  // When the timeline finishes, route forward
  useEffect(() => {
    if (t.verdict) {
      const to = setTimeout(() => navigate('/customer/success'), 2400);
      return () => clearTimeout(to);
    }
  }, [t.verdict, navigate]);

  return (
    <PhoneFrame time="9:46">
      <div className="px-5 pt-5 pb-6 flex flex-col gap-4 min-h-full">
        {/* Sara strip */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <SaraAvatar size={11} ring />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white pulse-dot" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Sara is on it</p>
            <p className="text-[11px] text-slate-500 min-h-[14px]">{t.narrate || 'Reviewing your claim…'}</p>
          </div>
          <span className="ml-auto text-[10px] font-mono text-slate-400">+{(t.elapsed / 1000).toFixed(1)}s</span>
        </div>

        {/* Progress */}
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-150" style={{ width: `${t.progress * 100}%` }} />
        </div>

        {/* Friendly agent flow */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-3">What's happening</p>
          <AgentFlow variant="customer" agents={t.agents} subs={t.subs} latencies={t.latencies} summaries={t.summaries} />
        </div>

        {/* Glass Box transparency cue */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2">
          <span>🔍</span>
          <span>Every step is logged in your <strong>Glass Box audit trail</strong>. You'll be able to see exactly what was checked and why.</span>
        </div>

        {/* Verdict */}
        {t.verdict && <VerdictBubble verdict={t.verdict} navigate={navigate} />}

        <p className="mt-auto text-center text-[11px] text-slate-400">
          Don't close this screen — we'll move you forward as soon as Sara is done.
        </p>
      </div>
    </PhoneFrame>
  );
}

function VerdictBubble({ verdict, navigate }) {
  const tone = {
    1: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    2: 'bg-amber-50 border-amber-200 text-amber-700',
    3: 'bg-rose-50 border-rose-200 text-rose-700'
  }[verdict.tier];
  return (
    <div className={`rounded-2xl p-4 border-2 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Decision</p>
      <p className="text-base font-bold">{verdict.recommendation}{verdict.amount && ` · $${verdict.amount.toLocaleString()}`}</p>
      {verdict.narrate && <p className="text-xs mt-1 opacity-90">{verdict.narrate}</p>}
    </div>
  );
}
