import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useAgentTimeline from '../hooks/useAgentTimeline.js';
import useClaimAudit from '../hooks/useClaimAudit.js';
import { timelines } from '../data/agentTimelines.js';
import { mockClaims } from '../data/mockClaims.js';
import { CLAIM_AUDIT_URL } from '../config.js';
import AgentFlow from '../components/AgentFlow.jsx';
import GlassBoxLiveFeed from '../components/GlassBoxLiveFeed.jsx';

export default function Theater() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const claim = mockClaims.find((c) => c.id === id) || mockClaims[0];
  const timeline = timelines[claim.id] || timelines['CLM-2026-4521'];

  // Scripted mock — always runs, always the demo-safe fallback.
  const mock = useAgentTimeline(timeline, {
    autoStart: true,
    speed: 1,
    baseTimeISO: incidentBase(claim)
  });

  // Real backend audit — only fetches when CLAIM_AUDIT_URL is set (or ?live=1 forces intent).
  // Passes the claim's GUID (gbx_claimid) — GetClaimAudit filters audit rows by it.
  const wantLive = CLAIM_AUDIT_URL && claim.guid && (params.get('live') !== '0');
  const audit = useClaimAudit(claim.guid, { enabled: !!wantLive });

  // HYBRID merge: real rows drive the steps they cover; mock backfills the rest
  // so the pipeline always looks complete. Pure mock when no live rows exist.
  const live = audit.live;
  const t = live ? mergeLiveOverMock(audit, mock) : mock;

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
            <LiveBadge live={live} wantLive={!!wantLive} />
          </div>
          <div className="text-center">
            <p className="font-mono text-xs text-slate-400">{claim.id}</p>
            <p className="text-sm font-semibold">{claim.customer} · {claim.lossType}</p>
          </div>
          <div className="flex items-center gap-2">
            {!live && <SpeedSelector speed={mock.speed} setSpeed={mock.setSpeed} />}
            {!live && (
              <button
                onClick={mock.playing ? mock.pause : (mock.progress >= 1 ? mock.restart : mock.play)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs font-semibold flex items-center gap-1.5"
              >
                {mock.progress >= 1 ? '↻ Replay' : mock.playing ? '⏸ Pause' : '▶ Play'}
              </button>
            )}
          </div>
        </div>
        <ProgressBar progress={t.progress} />
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Agent pipeline</p>
              <p className="text-xs text-slate-400 font-mono">
                {live ? 'live · Dataverse' : `T+${(mock.elapsed / 1000).toFixed(1)}s`}
              </p>
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

/**
 * Real audit state takes precedence per-agent; mock backfills any agent/sub the
 * backend hasn't logged yet. The Glass Box feed shows REAL rows when present,
 * else the scripted feed. Progress + verdict prefer the live signal.
 */
function mergeLiveOverMock(audit, mock) {
  const agents = { ...mock.agents };
  Object.entries(audit.agents).forEach(([k, v]) => {
    if (v && v !== 'idle') agents[k] = v;
  });

  const subs = { ...mock.subs };
  Object.entries(audit.subs).forEach(([k, v]) => {
    if (v && v !== 'idle') subs[k] = v;
  });

  const verdict = audit.verdict || mock.verdict;
  const doneCount = Object.values(agents).filter((s) => s === 'done' || s === 'flagged' || s === 'escalated').length;

  return {
    agents,
    subs,
    latencies: { ...mock.latencies, ...audit.latencies },
    summaries: { ...mock.summaries, ...audit.summaries },
    narrate: audit.narrate || mock.narrate,
    log: audit.log.length ? audit.log : mock.log,
    verdict,
    progress: verdict ? 1 : Math.min(0.95, doneCount / 5)
  };
}

function LiveBadge({ live, wantLive }) {
  if (live) {
    return (
      <span className="ml-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" /> LIVE
      </span>
    );
  }
  if (wantLive) {
    return (
      <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-semibold">
        connecting…
      </span>
    );
  }
  return (
    <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-semibold">
      mock
    </span>
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
