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

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: 'bg-green-900 text-green-300',
  medium: 'bg-yellow-900 text-yellow-300',
  hard: 'bg-red-900 text-red-300',
  expert: 'bg-purple-900 text-purple-300',
  unknown: 'bg-gray-800 text-gray-400',
};

function RatingButtons({ problemId, conceptName }: { problemId: string; conceptName: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  async function rate(r: number) {
    setLoading(true);
    setActive(r);
    try {
      await fetch('/api/confidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId: conceptName.toLowerCase().replace(/\s+/g, '-'), confidenceRating: r }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <p className="text-xs text-green-400 mt-2">
        ✓ Confidence recorded for {conceptName}
      </p>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 mb-1.5">Rate your confidence after solving:</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            disabled={loading}
            onClick={() => rate(r)}
            className={`
              w-8 h-8 rounded text-sm font-semibold transition-all
              ${active === r ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {r}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-1">1 = confused · 5 = very confident</p>
    </div>
  );
}

export default function DailyRecommendations({ recommendations }: Props) {
  if (recommendations.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Today&apos;s Problems</h2>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center text-gray-500">
          No recommendations yet — sync your Codeforces account to get started.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-100 mb-4">
        Today&apos;s Problems
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({recommendations.length} problems)
        </span>
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {recommendations.map((rec, i) => {
          const diffClass = DIFFICULTY_BADGE[rec.problem.difficulty] ?? DIFFICULTY_BADGE.unknown;
          return (
            <div
              key={`${rec.problem.id}-${i}`}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors"
            >
              {/* Concept badge */}
              <div className="flex items-start justify-between gap-2">
                <span className="inline-block bg-indigo-900 text-indigo-300 text-xs font-medium px-2 py-0.5 rounded">
                  {rec.concept_name}
                </span>
              </div>

              {/* Problem title + difficulty */}
              <div>
                <a
                  href={rec.problem.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-gray-100 hover:text-indigo-400 transition-colors leading-snug"
                >
                  {rec.problem.title} ↗
                </a>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffClass}`}>
                    {rec.problem.difficulty}
                  </span>
                  <span className="text-xs text-gray-600">{rec.problem.source}</span>
                </div>
              </div>

              {/* AI reason */}
              <p className="text-xs text-gray-400 italic leading-relaxed flex-1">
                &ldquo;{rec.reason}&rdquo;
              </p>

              {/* Confidence rating */}
              <RatingButtons problemId={rec.problem.id} conceptName={rec.concept_name} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
