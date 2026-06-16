/**
 * Visual flow of the 5 agents. Light + coral theme across both surfaces.
 * The actively-running agent gets a coral ring pulse, a spinner, and a sliding
 * "processing" bar so you can always see which stage is live.
 *
 * variant: 'handler' | 'customer'  (controls labels only; colors are shared)
 * agents:  state map { INTAKE: 'idle'|'running'|'done'|'flagged'|'escalated' }
 */

import { customerLabels } from '../data/agentTimelines.js';

const SUB_LIST = ['NOAA', 'NHTSA', 'ISO', 'NICB', 'DMV', 'Telematics', 'EstimateRule'];

export default function AgentFlow({ variant = 'handler', agents, subs, latencies = {}, summaries = {} }) {
  const isHandler = variant === 'handler';

  return (
    <div className="text-slate-800 flex flex-col items-center gap-3 w-full">
      <AgentCard title={isHandler ? 'Intake Agent' : customerLabels.INTAKE.name} sub={isHandler ? 'Copilot Studio' : null}
        state={agents.INTAKE} latency={latencies.INTAKE} summary={summaries.INTAKE} wide />

      <Connector active={done(agents.INTAKE)} />

      <div className="grid grid-cols-3 gap-3 w-full">
        <AgentCard title={isHandler ? 'Extraction' : customerLabels.EXTRACTION.name} sub={isHandler ? 'GPT-4.1 vision' : null}
          state={agents.EXTRACTION} latency={latencies.EXTRACTION} summary={summaries.EXTRACTION} />
        <AgentCard title={isHandler ? 'Policy' : customerLabels.POLICY.name} sub={isHandler ? 'Azure AI Search' : null}
          state={agents.POLICY} latency={latencies.POLICY} summary={summaries.POLICY} />
        <AgentCard title={isHandler ? 'Validation' : customerLabels.VALIDATION.name} sub={isHandler ? 'external checks' : null}
          state={agents.VALIDATION} latency={latencies.VALIDATION} summary={summaries.VALIDATION} />
      </div>

      {isHandler && subs && (
        <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-semibold">Validation sub-checks (sandbox)</p>
          <div className="grid grid-cols-7 gap-1.5">
            {SUB_LIST.map((s) => <SubChip key={s} name={s} state={subs[s]} summary={summaries[s]} />)}
          </div>
        </div>
      )}

      <Connector active={['EXTRACTION', 'POLICY', 'VALIDATION'].some((a) => done(agents[a]))} />

      <AgentCard title={isHandler ? 'Adjudication Agent' : customerLabels.ADJUDICATION.name} sub={isHandler ? 'Azure OpenAI GPT-4.1' : null}
        state={agents.ADJUDICATION} latency={latencies.ADJUDICATION} summary={summaries.ADJUDICATION} wide />
    </div>
  );
}

const done = (s) => s === 'done' || s === 'flagged' || s === 'escalated';

function AgentCard({ title, sub, state, latency, summary, wide }) {
  const tone = stateTone(state);
  const running = state === 'running';
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-white transition-all duration-300 ${tone.border} ${wide ? 'w-full' : ''} ${running ? 'ring-run' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className={`font-semibold text-sm ${tone.title}`}>{title}</p>
        <StateBadge state={state} />
      </div>
      {sub && <p className="text-[11px] mb-2 text-slate-500">{sub}</p>}
      {summary && !running && state !== 'idle' && <p className="text-xs leading-snug text-slate-600">{summary}</p>}
      {running && (
        <div className="flex items-center gap-2 mt-1">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-200 border-t-brand-600 spin" />
          <span className="text-[11px] font-medium text-brand-600">Processing…</span>
        </div>
      )}
      {latency != null && !running && <p className="text-[10px] font-mono mt-1 text-slate-400">{latency.toFixed(1)}s</p>}
      {running && <span className="proc-bar" />}
    </div>
  );
}

function SubChip({ name, state, summary }) {
  const colors = {
    idle:    'bg-white text-slate-400 border-slate-200',
    running: 'bg-brand-50 text-brand-700 border-brand-300 animate-pulse',
    done:    'bg-emerald-50 text-emerald-700 border-emerald-300',
    flagged: 'bg-amber-50 text-amber-700 border-amber-300'
  };
  return (
    <div className={`rounded-lg px-2 py-1.5 border text-center transition-colors ${colors[state] || colors.idle}`} title={summary || ''}>
      <p className="text-[10px] font-semibold leading-none">{name}</p>
      {state && state !== 'idle' && summary && <p className="text-[9px] mt-1 leading-tight truncate">{summary}</p>}
    </div>
  );
}

function StateBadge({ state }) {
  if (!state || state === 'idle') return null;
  const map = {
    running:   { c: 'bg-brand-100 text-brand-700', t: 'running' },
    done:      { c: 'bg-emerald-100 text-emerald-700', t: '✓ done' },
    flagged:   { c: 'bg-amber-100 text-amber-700', t: '⚠ flagged' },
    escalated: { c: 'bg-rose-100 text-rose-700', t: 'escalated' }
  }[state];
  if (!map) return null;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${map.c}`}>{map.t}</span>;
}

function Connector({ active }) {
  return <div className={`w-px h-5 transition-colors ${active ? 'bg-brand-500' : 'bg-slate-300'}`} />;
}

function stateTone(state) {
  const map = {
    idle:      { border: 'border border-slate-200', title: 'text-slate-700' },
    running:   { border: 'border-2 border-brand-400', title: 'text-brand-700' },
    done:      { border: 'border border-emerald-300', title: 'text-emerald-700' },
    flagged:   { border: 'border-2 border-amber-300', title: 'text-amber-700' },
    escalated: { border: 'border-2 border-rose-300', title: 'text-rose-700' }
  };
  return map[state] || map.idle;
}
