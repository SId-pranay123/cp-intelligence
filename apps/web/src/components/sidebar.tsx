'use client';

import Link from 'next/link';

const sections = [
  { id: 'stats', label: 'Overview', icon: IconOverview },
  { id: 'graph', label: 'Knowledge Graph', icon: IconGraph },
  { id: 'heatmap', label: 'Skill Heatmap', icon: IconHeatmap },
  { id: 'problems', label: "Today's Problems", icon: IconProblems },
];

export default function Sidebar({ handle }: { handle?: string }) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 flex flex-col border-r border-[#1a1a2a] bg-[#0d0d15] z-30">
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-5 border-b border-[#1a1a2a]">
        <p className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase mb-1">CP</p>
        <h1 className="text-sm font-semibold text-slate-100 leading-tight">Intelligence</h1>
        {handle && (
          <p className="text-[11px] text-slate-500 mt-1 font-mono truncate">{handle}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-slate-400 hover:text-slate-100 hover:bg-[#111119] transition-colors text-left group"
          >
            <span className="text-slate-600 group-hover:text-indigo-400 transition-colors">
              <Icon />
            </span>
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom: CF link */}
      {handle && (
        <div className="px-5 py-4 border-t border-[#1a1a2a]">
          <a
            href={`https://codeforces.com/profile/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-500 hover:text-indigo-400 transition-colors font-mono"
          >
            cf/{handle} ↗
          </a>
        </div>
      )}
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
