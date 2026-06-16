import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';

export default function HandlerLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('aielites.handler');
    if (!raw) navigate('/handler/signin');
    else setUser(JSON.parse(raw));
  }, [navigate]);

  const signOut = () => {
    localStorage.removeItem('aielites.handler');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white text-slate-900 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/handler/queue" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-sm font-bold">AE</div>
            <div>
              <p className="font-semibold text-sm leading-none">AI Elites</p>
              <p className="text-[10px] text-slate-500">Adjuster Console</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              to="/handler/queue"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`
              }
            >
              Queue
            </NavLink>
            <NavLink
              to="/handler/theater/CLM-2026-4520"
              className="px-3 py-1.5 rounded-md text-brand-600 hover:bg-slate-100 inline-flex items-center gap-1.5 font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 pulse-dot" />
              Live Console
            </NavLink>
            <a href="#" className="px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">Reports</a>
            <a href="#" className="px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">Glass Box</a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
              {user.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <button onClick={signOut} className="text-xs text-slate-500 hover:text-slate-900">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
