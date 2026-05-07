'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', sys);
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) ?? 'dark';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function select(t: Theme) {
    setTheme(t);
    setOpen(false);
    localStorage.setItem('theme', t);
    applyTheme(t);
  }

  const icons: Record<Theme, React.ReactNode> = {
    dark: <IconMoon />,
    light: <IconSun />,
    system: <IconSystem />,
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-7 h-7 rounded text-slate-500 hover:text-slate-300 hover:bg-[#1a1a2a] transition-colors"
        title="Toggle theme"
      >
        {icons[theme]}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 z-20 w-32 bg-[#0d0d15] border border-[#2a2a3e] rounded-lg shadow-xl overflow-hidden">
            {(['dark', 'light', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => select(t)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono transition-colors
                  ${theme === t
                    ? 'text-indigo-400 bg-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a2a]'}
                `}
              >
                <span className="flex-shrink-0">{icons[t]}</span>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.22 3.22l1.06 1.06M11.72 11.72l1.06 1.06M3.22 12.78l1.06-1.06M11.72 4.28l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 108 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSystem() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
