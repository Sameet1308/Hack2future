import { useNavigate, Link } from 'react-router-dom';

/**
 * Mock SSO. In production, this page is unreachable because
 * staticwebapp.config.json restricts /handler/* to the 'claimsHandler'
 * role and unauthenticated users are redirected to /.auth/login/aad.
 *
 * For the hackathon demo, clicking the button just stamps a fake
 * handler session into localStorage and forwards to /handler/queue.
 */
export default function HandlerSignIn() {
  const navigate = useNavigate();

  const signIn = () => {
    localStorage.setItem(
      'aielites.handler',
      JSON.stringify({
        name: 'Mike Patel',
        email: 'mike.patel@aielites.com',
        role: 'Senior Claims Adjuster',
        loggedInAt: new Date().toISOString()
      })
    );
    navigate('/handler/queue');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 text-slate-900 flex flex-col">
      <header className="px-8 py-6 max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">AE</div>
          <div>
            <p className="font-semibold tracking-tight leading-none">AI Elites</p>
            <p className="text-[10px] text-slate-500">Adjuster Console</p>
          </div>
        </Link>
        <Link to="/" className="text-xs text-slate-500 hover:text-slate-900">← Back to landing</Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="bg-white text-slate-900 rounded-3xl p-10 w-full max-w-md shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-elite-accent/10 text-elite-accent flex items-center justify-center mb-5">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-1">Adjuster sign-in</h1>
          <p className="text-sm text-slate-500 mb-6">Use your AI Elites Microsoft 365 account.</p>

          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 rounded-xl text-sm transition-colors"
          >
            <MicrosoftLogo />
            Sign in with Microsoft
          </button>

          <div className="border-t border-slate-100 mt-6 pt-5">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-600">Hackathon mode:</strong> this button mocks the SSO flow and grants a demo Adjuster session.
              In production, this page redirects to <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">/.auth/login/aad</code>{' '}
              (Microsoft Entra ID via Azure Static Web Apps built-in auth) — see{' '}
              <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">staticwebapp.config.json</code>.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-8 py-5 text-center text-xs text-slate-400">
        © AI Elites · Powered by Glass Box AI
      </footer>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23">
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}
