'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './theme-toggle';

const sections = [
  { href: '/dashboard',          label: 'Overview',         icon: IconOverview,  exact: true },
  { href: '/dashboard/graph',    label: 'Knowledge Graph',  icon: IconGraph,     exact: false },
  { href: '/dashboard/heatmap',  label: 'Skill Heatmap',    icon: IconHeatmap,   exact: false },
  { href: '/dashboard/problems', label: "Today's Problems", icon: IconProblems,  exact: false },
];

export default function Sidebar({ handle }: { handle?: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 flex flex-col border-r border-[#1a1a2a] bg-[#0d0d15] z-30">
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-5 border-b border-[#1a1a2a]">
        <p className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase">CP</p>
        <h1 className="text-sm font-semibold text-slate-100 leading-tight">Intelligence</h1>
        {handle ? (
          <a
            href={`https://codeforces.com/profile/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 group"
          >
            <span className="text-[9px] font-mono font-semibold text-indigo-500 uppercase tracking-widest">CF</span>
            <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-200 transition-colors truncate max-w-[120px]">
              {handle}
            </span>
          </a>
        ) : (
          <p className="text-[11px] font-mono text-slate-600 mt-2">No handle set</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {sections.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors text-left
                ${active
                  ? 'bg-indigo-500/10 text-slate-100 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#111119] border border-transparent'}
              `}
            >
              <span className={`transition-colors ${active ? 'text-indigo-400' : 'text-slate-600 group-hover:text-indigo-400'}`}>
                <Icon />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-[#1a1a2a] space-y-2">
        <Link
          href="/setup"
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Setup / Sync CF
        </Link>
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function IconOverview() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconGraph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="3" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6.5" y1="4.5" x2="4" y2="11.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9.5" y1="4.5" x2="12" y2="11.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="13" x2="11" y2="13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconHeatmap() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
      <rect x="5" y="1" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="9" y="1" width="3" height="3" rx="0.5" fill="currentColor" opacity="1" />
      <rect x="13" y="1" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.8" />
      <rect x="1" y="5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="5" y="5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.9" />
      <rect x="9" y="5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="13" y="5" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.7" />
      <rect x="1" y="9" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
      <rect x="5" y="9" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="9" y="9" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.8" />
      <rect x="13" y="9" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function IconProblems() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
