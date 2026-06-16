export default function GlassBoxPanel({ claim }) {
  return (
    <aside className="bg-white border border-slate-200 shadow-card text-slate-900 rounded-2xl p-5 sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
          </svg>
          Glass Box audit trail
        </h2>
        <span className="text-[10px] text-slate-400">{claim.glassBox.length} entries</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-4">
        Every AI decision below is regulatory-grade evidence (Colorado SB21-169, NAIC AI Bulletin).
      </p>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {claim.glassBox.map((entry, i) => (
          <div key={i} className="bg-slate-50 rounded-lg p-3 border-l-2 border-brand-400">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-brand-700">{entry.agent}</p>
              <p className="text-[10px] text-slate-400 font-mono">{entry.ts}</p>
            </div>
            <p className="text-xs text-slate-800 mb-1">{entry.action}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">{entry.explanation}</p>
            {entry.policyRef && (
              <p className="text-[10px] text-brand-600 mt-1.5 font-mono">→ {entry.policyRef}</p>
            )}
          </div>
        ))}
      </div>

      <button className="mt-4 w-full text-xs text-slate-500 hover:text-slate-900 py-2 border-t border-slate-100">
        Export full trail (PDF)
      </button>
    </aside>
  );
}
