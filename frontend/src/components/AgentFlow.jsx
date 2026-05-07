/**
 * Visual flow of the 5 agents. Used in both Handler Theater (dark, technical)
 * and Customer Processing (light, friendly).
 *
 * variant: 'handler' | 'customer'
 * agents:  state map { INTAKE: 'idle'|'running'|'done'|'flagged'|'escalated' }
 * subs:    state map for validation sub-checks
 */

import { customerLabels } from '../data/agentTimelines.js';

const SUB_LIST = ['NOAA', 'NHTSA', 'ISO', 'NICB', 'DMV', 'Telematics', 'EstimateRule'];

export default function AgentFlow({ variant = 'handler', agents, subs, latencies = {}, summaries = {} }) {
  const isHandler = variant === 'handler';

  return (
    <div className={`${isHandler ? 'text-white' : 'text-slate-800'} flex flex-col items-center gap-3 w-full`}>
      {/* INTAKE */}
      <AgentCard
        variant={variant}
        title={isHandler ? 'Intake Agent' : customerLabels.INTAKE.name}
        sub={isHandler ? 'Copilot Studio' : null}
        state={agents.INTAKE}
        latency={latencies.INTAKE}
        summary={summaries.INTAKE}
        wide
      />

      <Connector active={agents.INTAKE === 'done' || agents.INTAKE === 'flagged'} variant={variant} />

      {/* PARALLEL ROW: EXTRACTION | POLICY | VALIDATION */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <AgentCard
          variant={variant}
          title={isHandler ? 'Extraction' : customerLabels.EXTRACTION.name}
          sub={isHandler ? 'Doc Intelligence' : null}
          state={agents.EXTRACTION}
          latency={latencies.EXTRACTION}
          summary={summaries.EXTRACTION}
        />
        <AgentCard
          variant={variant}
          title={isHandler ? 'Policy' : customerLabels.POLICY.name}
          sub={isHandler ? 'AI Search RAG' : null}
          state={agents.POLICY}
          latency={latencies.POLICY}
          summary={summaries.POLICY}
        />
        <AgentCard
          variant={variant}
          title={isHandler ? 'Validation' : customerLabels.VALIDATION.name}
          sub={isHandler ? '7 external checks' : null}
          state={agents.VALIDATION}
          latency={latencies.VALIDATION}
          summary={summaries.VALIDATION}
        />
      </div>

      {/* Validation sub-checks (handler only) */}
      {isHandler && (
        <div className="w-full bg-white/5 rounded-xl p-3 border border-white/10">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-semibold">Validation sub-checks</p>
          <div className="grid grid-cols-7 gap-1.5">
            {SUB_LIST.map((s) => (
              <SubChip key={s} name={s} state={subs[s]} summary={summaries[s]} />
            ))}
          </div>
        </div>
      )}

      <Connector
        active={['EXTRACTION', 'POLICY', 'VALIDATION'].some((a) => agents[a] === 'done' || agents[a] === 'flagged')}
        variant={variant}
      />

      {/* ADJUDICATION */}
      <AgentCard
        variant={variant}
        title={isHandler ? 'Adjudication Agent' : customerLabels.ADJUDICATION.name}
        sub={isHandler ? 'Azure OpenAI' : null}
        state={agents.ADJUDICATION}
        latency={latencies.ADJUDICATION}
        summary={summaries.ADJUDICATION}
        wide
      />
    </div>
  );
}

function AgentCard({ variant, title, sub, state, latency, summary, wide }) {
  const isHandler = variant === 'handler';
  const tone = stateTone(state, isHandler);

  return (
    <div className={`relative rounded-2xl p-4 transition-all duration-300 ${tone.bg} ${tone.border} ${wide ? 'w-full' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className={`font-semibold text-sm ${tone.title}`}>{title}</p>
        <StateBadge state={state} isHandler={isHandler} />
      </div>
      {sub && <p className={`text-[11px] mb-2 ${isHandler ? 'text-slate-400' : 'text-slate-500'}`}>{sub}</p>}
      {summary && state !== 'idle' && state !== 'running' && (
        <p className={`text-xs leading-snug ${isHandler ? 'text-slate-200' : 'text-slate-700'}`}>{summary}</p>
      )}
      {state === 'running' && (
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isHandler ? 'bg-blue-400' : 'bg-brand-500'} pulse-dot`} />
          <span className={`text-[11px] ${isHandler ? 'text-blue-300' : 'text-brand-600'}`}>processing…</span>
        </div>
      )}
      {latency != null && state !== 'running' && (
        <p className={`text-[10px] font-mono mt-1 ${isHandler ? 'text-slate-400' : 'text-slate-400'}`}>{latency.toFixed(1)}s</p>
      )}
    </div>
  );
}

function SubChip({ name, state, summary }) {
  const colors = {
    idle:    'bg-white/5 text-slate-500 border-white/5',
    running: 'bg-blue-500/15 text-blue-200 border-blue-400/40 animate-pulse',
    done:    'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
    flagged: 'bg-amber-500/20 text-amber-200 border-amber-400/50'
  };
  return (
    <div className={`rounded-lg px-2 py-1.5 border text-center transition-colors ${colors[state] || colors.idle}`} title={summary || ''}>
      <p className="text-[10px] font-semibold leading-none">{name}</p>
      {state !== 'idle' && summary && (
        <p className="text-[9px] mt-1 leading-tight truncate">{summary}</p>
      )}
    </div>
  );
}

function StateBadge({ state, isHandler }) {
  if (state === 'idle') return null;
  if (state === 'running') {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isHandler ? 'bg-blue-500/20 text-blue-200' : 'bg-brand-100 text-brand-700'}`}>
        running
      </span>
    );
  }
  if (state === 'done') {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isHandler ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>
        ✓
      </span>
    );
  }
  if (state === 'flagged') {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isHandler ? 'bg-amber-500/25 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
        ⚠ flagged
      </span>
    );
  }
  if (state === 'escalated') {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isHandler ? 'bg-rose-500/25 text-rose-200' : 'bg-rose-100 text-rose-700'}`}>
        escalated
      </span>
    );
  }
  return null;
}

function Connector({ active, variant }) {
  const isHandler = variant === 'handler';
  return (
    <div className={`w-px h-5 ${active ? (isHandler ? 'bg-emerald-400' : 'bg-brand-500') : (isHandler ? 'bg-white/15' : 'bg-slate-300')} transition-colors`} />
  );
}

function stateTone(state, isHandler) {
  const map = {
    idle: isHandler
      ? { bg: 'bg-white/5',           border: 'border border-white/10', title: 'text-slate-300' }
      : { bg: 'bg-white',             border: 'border border-slate-200', title: 'text-slate-700' },
    running: isHandler
      ? { bg: 'bg-blue-500/10',       border: 'border border-blue-400/40', title: 'text-blue-200' }
      : { bg: 'bg-brand-50',          border: 'border-2 border-brand-300', title: 'text-brand-700' },
    done: isHandler
      ? { bg: 'bg-emerald-500/10',    border: 'border border-emerald-400/40', title: 'text-emerald-200' }
      : { bg: 'bg-emerald-50',        border: 'border border-emerald-300', title: 'text-emerald-700' },
    flagged: isHandler
      ? { bg: 'bg-amber-500/15',      border: 'border border-amber-400/50', title: 'text-amber-200' }
      : { bg: 'bg-amber-50',          border: 'border-2 border-amber-300', title: 'text-amber-700' },
    escalated: isHandler
      ? { bg: 'bg-rose-500/15',       border: 'border border-rose-400/50', title: 'text-rose-200' }
      : { bg: 'bg-rose-50',           border: 'border-2 border-rose-300', title: 'text-rose-700' }
  };
  return map[state] || map.idle;
}
