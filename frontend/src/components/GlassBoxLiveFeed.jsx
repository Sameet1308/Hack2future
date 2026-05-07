import { useEffect, useRef } from 'react';

export default function GlassBoxLiveFeed({ log, total }) {
  const ref = useRef(null);

  // Auto-scroll to bottom as new entries appear
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);

  return (
    <aside className="bg-slate-950/60 border border-white/10 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
          </svg>
          Glass Box live feed
        </h2>
        <span className="text-[10px] text-slate-400 font-mono">{log.length}{total != null ? ` / ${total}` : ''}</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">
        Each line is regulatory-grade evidence — Colorado SB21-169, NAIC AI Bulletin.
      </p>
      <div ref={ref} className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[300px]">
        {log.length === 0 && (
          <p className="text-xs text-slate-500 italic">Waiting for first agent to log…</p>
        )}
        {log.map((e) => (
          <div
            key={e.idx}
            className={`bg-white/5 rounded-lg p-2.5 border-l-2 ${e.flag ? 'border-amber-400' : 'border-emerald-400/60'} animate-in fade-in slide-in-from-bottom-2`}
            style={{ animationDuration: '300ms' }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className={`text-[11px] font-semibold ${e.flag ? 'text-amber-300' : 'text-emerald-300'}`}>{e.agent}</p>
              <p className="text-[10px] text-slate-500 font-mono">{e.ts}</p>
            </div>
            <p className="text-[11px] text-slate-200 leading-snug">{e.text}</p>
            {e.cite && <p className="text-[10px] text-amber-300 mt-1 font-mono">→ {e.cite}</p>}
          </div>
        ))}
      </div>
    </aside>
  );
}
