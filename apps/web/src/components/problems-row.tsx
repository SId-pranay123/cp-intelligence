'use client';
import { useState } from 'react';

interface Problem { id: string; title: string; link: string; difficulty: string; source: string; }
interface Recommendation { problem: Problem; concept_name: string; reason: string; }
interface Props { recommendations: Recommendation[]; }

function ConfidenceRating({ conceptName, problemId, onRated }: { conceptName: string; problemId: string; onRated?: (r: number) => void }) {
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
          problemId,
        }),
      });
      setDone(true);
      onRated?.(r);
    } finally {
      setLoading(false);
    }
  }

  if (done) return <span style={{ color: 'var(--accent)', fontSize: 13 }}>✓ Rated {selected}/5</span>;

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Rate confidence after solving</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            disabled={loading}
            onClick={() => rate(r)}
            style={{
              width: 32, height: 32, borderRadius: 6,
              border: selected === r ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: selected === r ? 'var(--accent-surface)' : 'transparent',
              color: selected === r ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
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
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No recommendations yet.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>Sync your Codeforces account to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {recommendations.map((rec, i) => {
        const diff = rec.problem.difficulty?.toLowerCase() ?? 'unknown';
        const diffColor: Record<string, string> = {
          easy: 'var(--accent)', medium: 'var(--warning)', hard: 'var(--danger)', expert: '#a78bfa', unknown: 'var(--text-muted)'
        };
        const dc = diffColor[diff] ?? 'var(--text-muted)';

        return (
          <div key={`${rec.problem.id}-${i}`} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{
                background: 'var(--accent-surface)', border: '1px solid var(--accent)', borderRadius: 20,
                padding: '3px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 500,
              }}>
                {rec.concept_name}
              </span>
              <span style={{
                color: dc, fontSize: 12,
                background: 'var(--bg-base)', border: `1px solid ${dc}44`,
                borderRadius: 12, padding: '3px 10px',
              }}>
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </span>
            </div>

            <h3 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              {rec.problem.title}
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              {rec.reason}
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <ConfidenceRating conceptName={rec.concept_name} problemId={rec.problem.id} />
              <a
                href={rec.problem.link}
                target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Solve on CF ↗
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
