'use client';
import { useState, useRef, useEffect } from 'react';
import ProblemsRow from './problems-row';
import { CONCEPT_GROUPS } from '@/lib/concepts';

interface Problem { id: string; title: string; link: string; difficulty: string; source: string; }
interface Recommendation { problem: Problem; concept_name: string; reason: string; }
interface ReviewItem { problem: Problem; concept_name: string; reason: string; last_confidence: number | null; }
interface UpcomingItem {
  problem: { id: string; title: string; link: string; difficulty: string };
  last_confidence: number | null;
  nextReviewAt: string;
}

interface DrillProblem {
  id: string; title: string; difficulty: string; link: string; source: string;
  solved: boolean; confidenceRating: number | null;
}

interface Props {
  recommendations: Recommendation[];
  initialReviews: ReviewItem[];
  initialUpcoming: UpcomingItem[];
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Flat list of all concepts for the picker
const ALL_CONCEPTS = CONCEPT_GROUPS.flatMap((g) =>
  g.concepts.map((c) => ({ ...c, group: g.label }))
);

const DIFF_COLOR: Record<string, string> = {
  easy: 'var(--accent)', medium: 'var(--warning)', hard: 'var(--danger)', expert: '#a78bfa',
};

function ConceptPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? ALL_CONCEPTS.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.group.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_CONCEPTS;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  const selectedConcepts = ALL_CONCEPTS.filter((c) => selected.includes(c.id));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Tag + input row */}
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 12px', cursor: 'text', minHeight: 40,
        }}
      >
        {selectedConcepts.map((c) => (
          <span
            key={c.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--accent-surface)', border: '1px solid var(--accent)',
              borderRadius: 6, padding: '2px 8px',
              color: 'var(--accent)', fontSize: 12, fontWeight: 500,
            }}
          >
            {c.name}
            <button
              onClick={(e) => { e.stopPropagation(); toggle(c.id); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? 'Filter by concept (e.g. Graph, DP)…' : ''}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 13, flex: 1, minWidth: 160,
          }}
        />
        {selected.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange([]); setQuery(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, zIndex: 20, maxHeight: 280, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {CONCEPT_GROUPS.map((group) => {
            const groupConcepts = group.concepts.filter((c) =>
              query.trim()
                ? c.name.toLowerCase().includes(query.toLowerCase()) ||
                  group.label.toLowerCase().includes(query.toLowerCase())
                : true
            );
            if (groupConcepts.length === 0) return null;
            return (
              <div key={group.label}>
                <p style={{
                  color: 'var(--text-muted)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em', padding: '10px 14px 4px',
                }}>
                  {group.label.toUpperCase()}
                </p>
                {groupConcepts.map((c) => {
                  const isSelected = selected.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px', cursor: 'pointer',
                        background: isSelected ? 'var(--accent-surface)' : 'transparent',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        fontSize: 13,
                      }}
                    >
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#fff',
                      }}>
                        {isSelected ? '✓' : ''}
                      </span>
                      {c.name}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 14px' }}>No concepts match</p>
          )}
        </div>
      )}
    </div>
  );
}

function FilteredProblems({ conceptIds }: { conceptIds: string[] }) {
  const [problems, setProblems] = useState<(DrillProblem & { conceptName: string })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (conceptIds.length === 0) { setProblems([]); return; }
    setLoading(true);
    let cancelled = false;

    async function fetchAll() {
      try {
        const results = await Promise.all(
          conceptIds.map((id) =>
            fetch(`/api/drill?conceptId=${encodeURIComponent(id)}`)
              .then((r) => r.json())
              .then((d) => {
                const conceptName = ALL_CONCEPTS.find((c) => c.id === id)?.name ?? id;
                return (d.problems ?? []).map((p: DrillProblem) => ({ ...p, conceptName }));
              })
              .catch(() => [])
          )
        );
        if (!cancelled) {
          // Merge, deduplicate by problem id (keep first occurrence), unsolved first
          const seen = new Set<string>();
          const merged: (DrillProblem & { conceptName: string })[] = [];
          for (const batch of results) {
            for (const p of batch) {
              if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
            }
          }
          setProblems(merged);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAll();
    return () => { cancelled = true; };
  }, [conceptIds.join(',')]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 24, height: 80,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No problems found for the selected concepts.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {problems.map((p) => {
        const diff = p.difficulty?.toLowerCase() ?? 'unknown';
        const dc = DIFF_COLOR[diff] ?? 'var(--text-muted)';
        return (
          <div key={p.id} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{
                background: 'var(--accent-surface)', border: '1px solid var(--accent)',
                borderRadius: 20, padding: '3px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 500,
              }}>
                {p.conceptName}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {p.solved && (
                  <span style={{ color: 'var(--accent)', fontSize: 12 }}>
                    ✓ {p.confidenceRating != null ? `Rated ${p.confidenceRating}/5` : 'Solved'}
                  </span>
                )}
                <span style={{
                  color: dc, fontSize: 12,
                  background: 'var(--bg-base)', border: `1px solid ${dc}44`,
                  borderRadius: 12, padding: '3px 10px',
                }}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </span>
              </div>
            </div>

            <h3 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
              {p.title}
            </h3>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a
                href={p.link}
                target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
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

export default function ProblemsTabs({ recommendations, initialReviews, initialUpcoming }: Props) {
  const [tab, setTab] = useState<'recommendations' | 'review'>('recommendations');
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [focusedConcepts, setFocusedConcepts] = useState<string[]>([]);
  const upcoming = initialUpcoming;

  function dismissReview(problemId: string) {
    setReviews((prev) => prev.filter((r) => r.problem.id !== problemId));
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: 20,
    border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const reviewBadgeCount = reviews.length + upcoming.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 24, padding: 4, alignSelf: 'flex-start',
      }}>
        <button style={tabStyle(tab === 'recommendations')} onClick={() => setTab('recommendations')}>
          Recommendations
        </button>
        <button style={tabStyle(tab === 'review')} onClick={() => setTab('review')}>
          Review queue
          {reviewBadgeCount > 0 && (
            <span style={{
              marginLeft: 8,
              background: tab === 'review' ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
              color: '#fff', borderRadius: 10, padding: '1px 7px',
              fontSize: 11, fontWeight: 700,
            }}>
              {reviewBadgeCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ConceptPicker selected={focusedConcepts} onChange={setFocusedConcepts} />
          {focusedConcepts.length > 0
            ? <FilteredProblems conceptIds={focusedConcepts} />
            : <ProblemsRow recommendations={recommendations} />
          }
        </div>
      )}

      {tab === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {reviews.length === 0 && upcoming.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No reviews scheduled yet.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                Rate your confidence after solving problems — they&apos;ll resurface here on schedule.
              </p>
            </div>
          ) : (
            <>
              {reviews.length > 0 && (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 12 }}>
                    DUE TODAY — {reviews.length}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {reviews.map((rev) => (
                      <ReviewCard
                        key={rev.problem.id}
                        item={rev}
                        onDismiss={() => dismissReview(rev.problem.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {upcoming.length > 0 && (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 12 }}>
                    UPCOMING — {upcoming.length}
                  </p>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    {upcoming.map((u, i) => {
                      const days = daysUntil(u.nextReviewAt);
                      const diff = u.problem.difficulty?.toLowerCase() ?? 'unknown';
                      const dc = DIFF_COLOR[diff] ?? 'var(--text-muted)';
                      return (
                        <div
                          key={u.problem.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 20px',
                            borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                              color: dc, fontSize: 11,
                              background: 'var(--bg-base)', border: `1px solid ${dc}44`,
                              borderRadius: 10, padding: '2px 8px', flexShrink: 0,
                            }}>
                              {diff.charAt(0).toUpperCase() + diff.slice(1)}
                            </span>
                            <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{u.problem.title}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                            {u.last_confidence != null && (
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Rated {u.last_confidence}/5</span>
                            )}
                            <span style={{
                              color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                              fontFamily: 'monospace', minWidth: 80, textAlign: 'right',
                            }}>
                              in {days} day{days !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ item, onDismiss }: {
  item: ReviewItem;
  onDismiss: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const diff = item.problem.difficulty?.toLowerCase() ?? 'unknown';
  const dc = DIFF_COLOR[diff] ?? 'var(--text-muted)';

  async function rate(r: number) {
    setRating(r);
    setLoading(true);
    try {
      await fetch('/api/confidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: 'review',
          confidenceRating: r,
          problemId: item.problem.id,
        }),
      });
      setDone(true);
      setTimeout(onDismiss, 1200);
    } finally {
      setLoading(false);
    }
  }

  const BASE_DAYS = [0, 1, 2, 4, 8, 16];

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          background: 'var(--accent-surface)', border: '1px solid var(--accent)',
          borderRadius: 20, padding: '3px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 500,
        }}>
          ↻ Review
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.last_confidence != null && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Last rated {item.last_confidence}/5</span>
          )}
          <span style={{
            color: dc, fontSize: 12,
            background: 'var(--bg-base)', border: `1px solid ${dc}44`,
            borderRadius: 12, padding: '3px 10px',
          }}>
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </span>
        </div>
      </div>

      <h3 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {item.problem.title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
        {item.reason}
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {done ? (
          <span style={{ color: 'var(--accent)', fontSize: 13 }}>
            ✓ Rated {rating}/5 — next review in {BASE_DAYS[rating ?? 3]} days
          </span>
        ) : (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Rate confidence after reviewing</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  disabled={loading}
                  onClick={() => rate(r)}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    border: rating === r ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: rating === r ? 'var(--accent-surface)' : 'transparent',
                    color: rating === r ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
        <a
          href={item.problem.link}
          target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
        >
          Open ↗
        </a>
      </div>
    </div>
  );
}
