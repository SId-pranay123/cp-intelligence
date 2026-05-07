'use client';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

function applyTheme(t: Theme) {
  const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
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

  const label = { dark: '🌙', light: '☀️', system: '💻' }[theme];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 4, color: '#8b949e' }}
        title="Toggle theme"
      >
        {label}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', bottom: '100%', right: 0, marginBottom: 4, zIndex: 20,
            background: '#1c2128', border: '1px solid #30363d', borderRadius: 8,
            overflow: 'hidden', minWidth: 100,
          }}>
            {(['dark', 'light', 'system'] as Theme[]).map((t) => (
              <button key={t} onClick={() => select(t)} style={{
                display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left',
                background: theme === t ? '#0d2818' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: theme === t ? '#10b981' : '#8b949e',
                fontSize: 13,
              }}>
                {{ dark: '🌙 Dark', light: '☀️ Light', system: '💻 System' }[t]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
