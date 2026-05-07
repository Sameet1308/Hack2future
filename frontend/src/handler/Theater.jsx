import { Link, useNavigate, useParams } from 'react-router-dom';
import useAgentTimeline from '../hooks/useAgentTimeline.js';
import { timelines } from '../data/agentTimelines.js';
import { mockClaims } from '../data/mockClaims.js';
import AgentFlow from '../components/AgentFlow.jsx';
import GlassBoxLiveFeed from '../components/GlassBoxLiveFeed.jsx';

export default function Theater() {
  const { id } = useParams();
  const navigate = useNavigate();

  const claim = mockClaims.find((c) => c.id === id) || mockClaims[0];
  const timeline = timelines[claim.id] || timelines['CLM-2026-4521'];

  const t = useAgentTimeline(timeline, {
    autoStart: true,
    speed: 1,
    baseTimeISO: incidentBase(claim)
  });

  return (
    <div className="fixed inset-0 bg-elite-deep text-white overflow-y-auto">
      <header className="bg-black/30 border-b border-white/10 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/handler/queue" className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Queue
            </Link>
            <span className="text-slate-600">·</span>
            <span className="text-xs uppercase tracking-wider text-slate-400">Theater Mode</span>
          </div>
          <div className="text-center">
            <p className="font-mono text-xs text-slate-400">{claim.id}</p>
            <p className="text-sm font-semibold">{claim.customer} · {claim.lossType}</p>
          </div>
          <div className="flex items-center gap-2">
            <SpeedSelector speed={t.speed} setSpeed={t.setSpeed} />
            <button
              onClick={t.playing ? t.pause : (t.progress >= 1 ? t.restart : t.play)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs font-semibold flex items-center gap-1.5"
            >
              {t.progress >= 1 ? '↻ Replay' : t.playing ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>
        </div>
        <ProgressBar progress={t.progress} />
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Agent pipeline</p>
              <p className="text-xs text-slate-400 font-mono">T+{(t.elapsed / 1000).toFixed(1)}s</p>
            </div>
            <AgentFlow variant="handler" agents={t.agents} subs={t.subs} latencies={t.latencies} summaries={t.summaries} />
          </div>

          {t.verdict && <VerdictCard verdict={t.verdict} claim={claim} navigate={navigate} />}
        </section>

        <GlassBoxLiveFeed log={t.log} />
      </main>
    </div>
  );
}

function SpeedSelector({ speed, setSpeed }) {
  return (
    <div className="flex items-center bg-white/5 rounded-md p-0.5 text-[11px] font-mono">
      {[0.5, 1, 2].map((s) => (
        <button
          key={s}
          onClick={() => setSpeed(s)}
          className={`px-2 py-1 rounded transition-colors ${speed === s ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          {s}×
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ progress }) {
  return (
    <div className="h-0.5 bg-white/5">
      <div className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 transition-all duration-100" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

function VerdictCard({ verdict, claim, navigate }) {
  const tone = {
    1: { bg: 'bg-emerald-500/15', border: 'border-emerald-400/40', text: 'text-emerald-300', label: 'Auto-approved' },
    2: { bg: 'bg-amber-500/15',   border: 'border-amber-400/50',   text: 'text-amber-300',   label: 'Adjuster review' },
    3: { bg: 'bg-rose-500/15',    border: 'border-rose-400/50',    text: 'text-rose-300',    label: 'Live escalation' }
  }[verdict.tier];

  return (
    <div className={`rounded-2xl p-6 border ${tone.bg} ${tone.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs uppercase tracking-wider font-semibold ${tone.text} mb-1`}>Final · Tier {verdict.tier} · {tone.label}</p>
          <p className="text-2xl font-bold text-white">{verdict.recommendation}{verdict.amount && ` · $${verdict.amount.toLocaleString()}`}</p>
          {verdict.confidence > 0 && <p className="text-sm text-slate-300 mt-1">Confidence {verdict.confidence}%</p>}
        </div>
        <button
          onClick={() => navigate(`/handler/claim/${claim.id}`)}
          className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-semibold hover:bg-slate-100"
        >
          Open standard view →
        </button>
      </div>
    </div>
  );
}

function incidentBase(claim) {
  // Synthesize an ISO date for the live feed clock
  const map = {
    'CLM-2026-4521': '2026-05-04T09:46:00',
    'CLM-2026-4520': '2026-05-04T08:12:00',
    'CLM-2026-4519': '2026-05-04T07:55:00'
  };
  return map[claim.id];
}
