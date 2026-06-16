import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useAgentTimeline from '../hooks/useAgentTimeline.js';
import useClaimAudit from '../hooks/useClaimAudit.js';
import { timelines } from '../data/agentTimelines.js';
import { mockClaims } from '../data/mockClaims.js';
import { CLAIM_AUDIT_URL } from '../config.js';
import AgentFlow from '../components/AgentFlow.jsx';
import GlassBoxLiveFeed from '../components/GlassBoxLiveFeed.jsx';
import PhoneFrame from '../components/PhoneFrame.jsx';
import { SaraAvatar } from '../components/SaraHeader.jsx';
import useClaim from '../data/useClaim.js';
import useDvAudit from '../hooks/useDvAudit.js';

// Live Decision Console — the adjuster's real-time view of the agent pipeline.
// A single view toggle lets you show the policyholder's natural app experience
// and the adjuster's forensic console side-by-side, both driven by ONE timeline
// so they animate in perfect sync. Same decision, two windows.
export default function Theater() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [view, setView] = useState('split'); // 'split' | 'adjuster' | 'customer'

  const { claim: resolved } = useClaim(id);
  const claim = resolved || mockClaims[0]; // safe default while a live claim loads
  const timeline = timelines[claim.id] || timelines['CLM-2026-4521'];

  // Scripted mock — always runs, always the demo-safe fallback.
  const mock = useAgentTimeline(timeline, {
    autoStart: true,
    speed: 1,
    baseTimeISO: incidentBase(claim)
  });

  // Real backend audit — only fetches when CLAIM_AUDIT_URL is set (or ?live=1 forces intent).
  const wantLive = CLAIM_AUDIT_URL && claim.guid && (params.get('live') !== '0');
  const audit = useClaimAudit(claim.guid, { enabled: !!wantLive });

  // HYBRID merge: real rows drive the steps they cover; mock backfills the rest.
  const live = audit.live;

  // REAL Dataverse claim → drive the console from the actual agent audit rows
  // (polled), so the pipeline reflects the real agents finishing, not a script.
  const isDv = !!(resolved && resolved.dataverse);
  const dvFeed = useDvAudit(claim.id, { enabled: isDv });

  const t = isDv ? dvFeed : (live ? mergeLiveOverMock(audit, mock) : mock);
  const realtime = isDv || live; // genuinely live → no play/speed controls

  return (
    <div className="fixed inset-0 bg-slate-100 text-slate-900 overflow-y-auto">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1500px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/handler/queue" className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1 shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Queue
            </Link>
            <span className="text-slate-300">·</span>
            <span className="text-xs uppercase tracking-wider text-slate-700 font-semibold whitespace-nowrap">Live Decision Console</span>
            <LiveBadge live={live || isDv} wantLive={!!wantLive} />
          </div>
          <div className="text-center hidden md:block">
            <p className="font-mono text-xs text-slate-400">{claim.id}</p>
            <p className="text-sm font-semibold text-slate-900">{claim.customer} · {claim.lossType}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ViewToggle view={view} setView={setView} />
            {!realtime && view !== 'customer' && <SpeedSelector speed={mock.speed} setSpeed={mock.setSpeed} />}
            {!realtime && (
              <button
                onClick={mock.playing ? mock.pause : (mock.progress >= 1 ? mock.restart : mock.play)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5"
              >
                {mock.progress >= 1 ? '↻ Replay' : mock.playing ? '⏸ Pause' : '▶ Play'}
              </button>
            )}
          </div>
        </div>
        <ProgressBar progress={t.progress} />
      </header>

      <main className="max-w-[1500px] mx-auto px-6 py-8">
        <div className={
          view === 'split' ? 'grid lg:grid-cols-[400px_1fr] gap-6 items-start'
          : view === 'customer' ? 'flex justify-center'
          : ''
        }>
          {view !== 'adjuster' && <PolicyholderPane t={t} claim={claim} />}
          {view !== 'customer' && <AdjusterPane t={t} claim={claim} live={realtime} mock={mock} navigate={navigate} />}
        </div>
      </main>
    </div>
  );
}

/* ---------- Policyholder (natural app) pane ---------- */
function PolicyholderPane({ t, claim }) {
  return (
    <div>
      <PaneLabel tone="brand" eyebrow="Policyholder" title={`${claim.customer.split(' ')[0]}'s app — what she sees`} />
      <PhoneFrame time="9:46">
        <div className="px-5 pt-5 pb-6 flex flex-col gap-4 min-h-full">
          <div className="flex items-center gap-3">
            <div className="relative">
              <SaraAvatar size={11} ring />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white pulse-dot" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">Sara is on it</p>
              <p className="text-[11px] text-slate-500 min-h-[14px]">{t.narrate || 'Reviewing your claim…'}</p>
            </div>
            <span className="ml-auto text-[10px] font-mono text-slate-400">+{((t.elapsed || 0) / 1000).toFixed(1)}s</span>
          </div>

          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-150" style={{ width: `${t.progress * 100}%` }} />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-3">What's happening</p>
            <AgentFlow variant="customer" agents={t.agents} subs={t.subs} latencies={t.latencies} summaries={t.summaries} />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2">
            <span>🔍</span>
            <span>Every step is logged in your <strong>Glass Box audit trail</strong>. You'll see exactly what was checked and why.</span>
          </div>

          {t.verdict && <VerdictBubble verdict={t.verdict} />}

          <p className="mt-auto text-center text-[11px] text-slate-400">
            Don't close this screen — we'll move you forward as soon as Sara is done.
          </p>
        </div>
      </PhoneFrame>
    </div>
  );
}

/* ---------- Adjuster (forensic console) pane ---------- */
function AdjusterPane({ t, claim, live, mock, navigate }) {
  return (
    <div>
      <PaneLabel tone="accent" eyebrow="Adjuster" title="Live decision console — forensic view" />
      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Agent pipeline</p>
              <p className="text-xs font-mono">
                {live ? <span className="text-emerald-600 font-semibold">● live · Dataverse</span> : <span className="text-slate-400">T+{((mock.elapsed || 0) / 1000).toFixed(1)}s</span>}
              </p>
            </div>
            <AgentFlow variant="handler" agents={t.agents} subs={t.subs} latencies={t.latencies} summaries={t.summaries} />
          </div>

          {t.verdict && <VerdictCard verdict={t.verdict} claim={claim} navigate={navigate} />}
        </section>

        <GlassBoxLiveFeed log={t.log} />
      </div>
    </div>
  );
}

function PaneLabel({ eyebrow, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-2 h-2 rounded-full bg-brand-500 pulse-dot" />
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{eyebrow}</span>
      <span className="text-slate-300">·</span>
      <span className="text-xs text-slate-600">{title}</span>
    </div>
  );
}

function ViewToggle({ view, setView }) {
  const opts = [
    { k: 'split', label: 'Split' },
    { k: 'adjuster', label: 'Adjuster' },
    { k: 'customer', label: 'Policyholder' }
  ];
  return (
    <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-[11px] font-semibold">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => setView(o.k)}
          className={`px-2.5 py-1 rounded transition-colors ${view === o.k ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Real audit state takes precedence per-agent; mock backfills any agent/sub the
 * backend hasn't logged yet.
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
    elapsed: mock.elapsed,
    narrate: audit.narrate || mock.narrate,
    latencies: { ...mock.latencies, ...audit.latencies },
    summaries: { ...mock.summaries, ...audit.summaries },
    log: audit.log.length ? audit.log : mock.log,
    verdict,
    progress: verdict ? 1 : Math.min(0.95, doneCount / 5)
  };
}

function LiveBadge({ live, wantLive }) {
  if (live) {
    return (
      <span className="ml-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" /> LIVE
      </span>
    );
  }
  if (wantLive) {
    return (
      <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-semibold">
        connecting…
      </span>
    );
  }
  return (
    <span className="ml-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" /> live replay
    </span>
  );
}

function SpeedSelector({ speed, setSpeed }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-[11px] font-mono">
      {[0.5, 1, 2].map((s) => (
        <button
          key={s}
          onClick={() => setSpeed(s)}
          className={`px-2 py-1 rounded transition-colors ${speed === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
        >
          {s}×
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ progress }) {
  return (
    <div className="h-0.5 bg-slate-200">
      <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-100" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

function VerdictCard({ verdict, claim, navigate }) {
  const tone = {
    1: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', label: 'Auto-approved' },
    2: { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   label: 'Adjuster review' },
    3: { bg: 'bg-rose-50',    border: 'border-rose-300',    text: 'text-rose-700',    label: 'Live escalation' }
  }[verdict.tier];

  return (
    <div className={`rounded-2xl p-6 border-2 ${tone.bg} ${tone.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs uppercase tracking-wider font-semibold ${tone.text} mb-1`}>Final · Tier {verdict.tier} · {tone.label}</p>
          <p className="text-2xl font-bold text-slate-900">{verdict.recommendation}{verdict.amount && ` · $${verdict.amount.toLocaleString()}`}</p>
          {verdict.confidence > 0 && <p className="text-sm text-slate-500 mt-1">Confidence {verdict.confidence}%</p>}
        </div>
        <button
          onClick={() => navigate(`/handler/claim/${claim.id}`)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold whitespace-nowrap"
        >
          Open standard view →
        </button>
      </div>
    </div>
  );
}

function VerdictBubble({ verdict }) {
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

function incidentBase(claim) {
  const map = {
    'CLM-2026-4521': '2026-05-04T09:46:00',
    'CLM-2026-4520': '2026-05-04T08:12:00',
    'CLM-2026-4519': '2026-05-04T07:55:00'
  };
  return map[claim.id];
}
