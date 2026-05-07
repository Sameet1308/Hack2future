import { Link, useNavigate } from 'react-router-dom';

export default function SaraHeader({ backTo = -1 }) {
  const navigate = useNavigate();
  const goBack = () => (typeof backTo === 'string' ? navigate(backTo) : navigate(backTo));

  return (
    <div className="px-6 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center gap-3 sticky top-0 z-20">
      <button onClick={goBack} className="text-slate-500" aria-label="Back">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex items-center gap-2 flex-1">
        <SaraAvatar size={8} />
        <div className="leading-tight">
          <p className="text-xs font-semibold text-slate-900">Sara is with you</p>
          <p className="text-[10px] text-emerald-600">● Online</p>
        </div>
      </div>
      <Link to="/customer/dashboard" className="text-xs text-brand-600 font-medium">Talk to person</Link>
    </div>
  );
}

export function SaraAvatar({ size = 12, ring = false }) {
  const dim = `${size * 4}px`;
  return (
    <div className="relative inline-block" style={{ width: dim, height: dim }}>
      <img
        src="https://randomuser.me/api/portraits/women/44.jpg"
        alt="Sara Bennett"
        className={`w-full h-full rounded-full object-cover ${ring ? 'ring-4 ring-brand-50' : ''}`}
        onError={(e) => {
          const fallback = document.createElement('div');
          fallback.className = `w-full h-full rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 ${ring ? 'ring-4 ring-brand-50' : ''}`;
          fallback.style.fontSize = `${size * 1.5}px`;
          fallback.innerText = 'SB';
          e.currentTarget.replaceWith(fallback);
        }}
      />
    </div>
  );
}
