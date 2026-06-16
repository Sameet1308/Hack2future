import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-slate-50 text-slate-900">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo />
        <a href="#" className="text-xs text-slate-500 hover:text-slate-900">About AI Elites</a>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 bg-brand-50 border border-brand-100 rounded-full text-xs font-semibold tracking-wide text-brand-700 mb-5">
            Powered by Glass Box AI
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Insurance claims, settled in <span className="text-brand-600">minutes</span>.
          </h1>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto">
            Every AI decision is logged, explained and auditable. Choose how you'd like to sign in.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Link
            to="/customer/login"
            className="group bg-white border border-slate-200 rounded-3xl p-8 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1">I'm a customer</h2>
            <p className="text-sm text-slate-500 mb-4">File a claim, check status, talk to Sara.</p>
            <span className="text-brand-600 font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Continue
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </Link>

          <Link
            to="/handler/signin"
            className="group bg-white border border-slate-200 rounded-3xl p-8 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-5">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12l2-2 4 4 8-8 4 4M3 18h18" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1">I'm an AI Elites employee</h2>
            <p className="text-sm text-slate-500 mb-4">Sign in to the Adjuster Console.</p>
            <span className="text-slate-700 font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Sign in with Microsoft
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 mt-12">
          © AI Elites · Customer app and Adjuster Console served from one Static Web App ·
          Handler routes SSO-protected via Microsoft Entra ID in production
        </p>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">AE</div>
      <div>
        <p className="font-semibold tracking-tight leading-none">AI Elites</p>
        <p className="text-[10px] text-slate-500">Insurance, reimagined</p>
      </div>
    </div>
  );
}
