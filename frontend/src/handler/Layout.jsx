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
      <header className="bg-elite-deep text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/handler/queue" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-elite-accent flex items-center justify-center text-sm font-bold">AE</div>
            <div>
              <p className="font-semibold text-sm leading-none">AI Elites</p>
              <p className="text-[10px] text-slate-400">Adjuster Console</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              to="/handler/queue"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'}`
              }
            >
              Queue
            </NavLink>
            <a href="#" className="px-3 py-1.5 rounded-md text-slate-300 hover:bg-white/5">Reports</a>
            <a href="#" className="px-3 py-1.5 rounded-md text-slate-300 hover:bg-white/5">Glass Box</a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-elite-accent text-white flex items-center justify-center text-xs font-semibold">
              {user.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <button onClick={signOut} className="text-xs text-slate-300 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
