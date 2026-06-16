import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Thin coral progress bar that flashes on every route change — the small
// production detail that makes an app feel responsive and enterprise-grade.
export default function TopProgress() {
  const loc = useLocation();
  const [w, setW] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    setW(12);
    const t = [
      setTimeout(() => setW(72), 90),
      setTimeout(() => setW(100), 300),
      setTimeout(() => setShow(false), 560),
      setTimeout(() => setW(0), 620)
    ];
    return () => t.forEach(clearTimeout);
  }, [loc.pathname]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none">
      <div
        className="h-full bg-brand-600 transition-all duration-200 ease-out"
        style={{ width: `${w}%`, opacity: show ? 1 : 0, boxShadow: '0 0 8px rgba(244,80,28,.5)' }}
      />
    </div>
  );
}
