export default function ProgressBar({ step, total = 5, secondsLeft }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="px-6 pt-4">
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-slate-500">Step {step} of {total}</span>
        {secondsLeft != null && (
          <span className="text-slate-400">~{secondsLeft} seconds left</span>
        )}
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
