import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame.jsx';
import { SaraAvatar } from '../components/SaraHeader.jsx';
import { getLatestClaim, writeAnalysis } from '../api/claims.js';

// Live AI photo damage assessment. The policyholder adds a photo of the damage;
// it's sent to Azure OpenAI GPT-4.1 (vision) via the notify server, which returns
// a real structured assessment — parts, severity, and an estimated repair range.
export default function DamageAssess() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | analyzing | done | error
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evidence, setEvidence] = useState([]); // [{name, dataUrl}] — police report, etc.
  const evidenceRef = useRef(null);

  // Read additional evidence files (police report, documents) → data URLs.
  const onPickEvidence = (e) => {
    const files = [...(e.target.files || [])];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setEvidence((prev) => [...prev, { name: file.name, dataUrl: reader.result }]);
      reader.readAsDataURL(file);
    });
  };

  // Attach the photo analysis + evidence to Sara's REAL Dataverse claim (the one
  // she just created in the chat), then move forward carrying that real claim number.
  const submit = async () => {
    setSubmitting(true);
    try {
      const claim = await getLatestClaim();                       // Sara's real Dataverse claim
      if (claim?.guid) await writeAnalysis(claim.guid, result, preview, evidence);  // analysis + photo + evidence
      navigate('/customer/success', { state: { claimId: claim?.id } });
    } catch {
      navigate('/customer/success');
    }
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);
      analyze(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async (dataUrl) => {
    setStatus('analyzing');
    setResult(null);
    try {
      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      const data = await res.json();
      if (data.error) { setErrMsg(data.error); setStatus('error'); return; }
      setResult(data);
      setStatus('done');
    } catch (err) {
      setErrMsg(String(err.message || err));
      setStatus('error');
    }
  };

  return (
    <PhoneFrame time="9:43">
      <div className="px-5 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center gap-3 sticky top-0 z-20">
        <SaraAvatar size={9} />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">Add a photo of the damage</p>
          <p className="text-[11px] text-slate-500">Sara will assess it instantly</p>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4 min-h-full">
        {/* Sara's message */}
        <div className="flex gap-2.5">
          <SaraAvatar size={8} />
          <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-3 text-sm text-slate-700 max-w-[85%]">
            Hi Sarah — so sorry about the accident. Add a photo of the damage and I'll take a look right away.
          </div>
        </div>

        {/* Upload / preview */}
        <button
          onClick={() => fileRef.current?.click()}
          className="relative w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center"
          style={{ minHeight: preview ? 'auto' : '180px' }}
        >
          {preview ? (
            <img src={preview} alt="Damage" className="w-full object-cover max-h-56" />
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </div>
              <p className="text-sm font-medium text-slate-700">Tap to add a photo</p>
              <p className="text-xs text-slate-400 mt-0.5">of your vehicle's damage</p>
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />

        {preview && status !== 'analyzing' && (
          <button onClick={() => fileRef.current?.click()} className="text-xs text-brand-600 font-medium -mt-2">
            Choose a different photo
          </button>
        )}

        {/* Analyzing */}
        {status === 'analyzing' && (
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin" />
            <p className="text-sm text-brand-800 font-medium">Sara is analyzing your photo with AI…</p>
          </div>
        )}

        {/* Result */}
        {status === 'done' && result && <Assessment result={result} />}

        {/* Error */}
        {status === 'error' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            Couldn't analyze that photo. {errMsg && <span className="block text-xs mt-1 opacity-70">{errMsg}</span>}
            <span className="block text-xs mt-1">Make sure the notify server is running (<code>npm run notify</code>).</span>
          </div>
        )}

        {/* Add other evidence — police report, documents */}
        {status === 'done' && (
          <div>
            <button onClick={() => evidenceRef.current?.click()} className="w-full text-sm text-brand-600 font-medium border border-dashed border-slate-300 rounded-xl py-2.5 hover:bg-slate-50">
              + Add police report or other documents
            </button>
            <input ref={evidenceRef} type="file" accept="image/*,application/pdf" multiple onChange={onPickEvidence} className="hidden" />
            {evidence.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {evidence.map((f, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">📎 {f.name}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {status === 'done' && (
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors mt-1"
          >
            {submitting ? 'Creating your claim…' : 'Submit claim with evidence'}
          </button>
        )}

        <p className="mt-auto text-center text-[10px] text-slate-400">Assessment by Azure OpenAI GPT-4.1 · vision</p>
      </div>
    </PhoneFrame>
  );
}

function Assessment({ result }) {
  const sev = result.severity || 'N/A';
  const tone = {
    Minor: 'bg-emerald-100 text-emerald-700',
    Moderate: 'bg-amber-100 text-amber-700',
    Severe: 'bg-rose-100 text-rose-700',
    'N/A': 'bg-slate-100 text-slate-600'
  }[sev] || 'bg-slate-100 text-slate-600';
  const hasEstimate = (result.estimate_high || 0) > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI damage assessment</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tone}`}>{sev}</span>
      </div>

      {result.vehicle && <p className="text-sm font-medium text-slate-900">{result.vehicle}</p>}
      {result.summary && <p className="text-sm text-slate-600 mt-1 leading-snug">{result.summary}</p>}

      {Array.isArray(result.damaged_parts) && result.damaged_parts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {result.damaged_parts.map((p, i) => (
            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md">{p}</span>
          ))}
        </div>
      )}

      {hasEstimate && (
        <div className="mt-4 bg-slate-50 rounded-xl p-3 flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500">Estimated repair</p>
            <p className="text-2xl font-bold text-slate-900">
              ${Number(result.estimate_low).toLocaleString()}–${Number(result.estimate_high).toLocaleString()}
            </p>
          </div>
          {typeof result.confidence === 'number' && (
            <span className="text-xs text-slate-500">{result.confidence}% confidence</span>
          )}
        </div>
      )}
    </div>
  );
}
