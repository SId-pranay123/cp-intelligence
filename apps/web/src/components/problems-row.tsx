'use client';

import { useState } from 'react';

interface Problem {
  id: string;
  title: string;
  link: string;
  difficulty: string;
  source: string;
}

interface Recommendation {
  problem: Problem;
  concept_name: string;
  reason: string;
}

interface Props {
  recommendations: Recommendation[];
}

const DIFF_STYLE: Record<string, string> = {
  easy: 'text-emerald-400 border-emerald-900 bg-emerald-950',
  medium: 'text-amber-400 border-amber-900 bg-amber-950',
  hard: 'text-red-400 border-red-900 bg-red-950',
  expert: 'text-purple-400 border-purple-900 bg-purple-950',
  unknown: 'text-slate-400 border-slate-800 bg-slate-900',
};

function ConfidenceBar({ problemId, conceptName }: { problemId: string; conceptName: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function rate(r: number) {
    setSelected(r);
    setLoading(true);
    try {
      await fetch('/api/confidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: conceptName.toLowerCase().replace(/\s+/g, '-'),
          confidenceRating: r,
        }),
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-xs font-mono text-emerald-500 mt-auto">
        ✓ rated {selected}/5
      </p>
    );
  }

  return (
    <div className="mt-auto pt-4 border-t border-[#1a1a2a]">
      <p className="text-[10px] font-mono text-slate-600 mb-2 uppercase tracking-wide">
        Rate confidence
      </p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            disabled={loading}
            onClick={() => rate(r)}
            className={`
              w-8 h-8 rounded border text-xs font-mono font-semibold
              transition-all duration-150
              ${selected === r
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'border-[#2a2a3e] text-slate-500 hover:border-indigo-600 hover:text-indigo-400'
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProblemsRow({ recommendations }: Props) {
  if (recommendations.length === 0) {
    return (
      <div className="border border-[#1a1a2a] rounded-lg p-10 text-center">
        <p className="text-slate-500 text-sm">No recommendations yet.</p>
        <p className="text-slate-600 text-xs mt-1">Sync your Codeforces account to get started.</p>
      </div>
    );
  }

  return (
    <div className="scroll-x">
      <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
        {recommendations.map((rec, i) => {
          const diff = rec.problem.difficulty?.toLowerCase() ?? 'unknown';
          const diffStyle = DIFF_STYLE[diff] ?? DIFF_STYLE.unknown;

          return (
            <div
              key={`${rec.problem.id}-${i}`}
              className="
                flex flex-col bg-[#111119] border border-[#1a1a2a]
                rounded-lg p-5 hover:border-[#2a2a3e] transition-colors
              "
              style={{ width: 300, minHeight: 260 }}
            >
              {/* Concept tag */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded">
                  {rec.concept_name}
                </span>
                <span className={`text-[10px] font-mono border px-2 py-0.5 rounded ${diffStyle}`}>
                  {rec.problem.difficulty}
                </span>
              </div>

              {/* Problem title */}
              <a
                href={rec.problem.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-slate-100 hover:text-indigo-300 transition-colors leading-snug mb-2 group"
              >
                {rec.problem.title}
                <span className="text-slate-600 group-hover:text-indigo-400 ml-1 text-sm">↗</span>
              </a>

              {/* AI reason */}
              <p className="text-xs text-slate-500 italic leading-relaxed flex-1">
                &ldquo;{rec.reason}&rdquo;
              </p>

              <ConfidenceBar problemId={rec.problem.id} conceptName={rec.concept_name} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
