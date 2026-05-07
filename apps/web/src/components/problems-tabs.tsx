'use client';
import { useState } from 'react';
import ProblemsRow from './problems-row';

interface Problem { id: string; title: string; link: string; difficulty: string; source: string; }
interface Recommendation { problem: Problem; concept_name: string; reason: string; }
interface ReviewItem { problem: Problem; concept_name: string; reason: string; last_confidence: number | null; }
interface UpcomingItem {
  problem: { id: string; title: string; link: string; difficulty: string };
  last_confidence: number | null;
  nextReviewAt: string;
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

export default function ProblemsTabs({ recommendations, initialReviews, initialUpcoming }: Props) {
  const [tab, setTab] = useState<'recommendations' | 'review'>('recommendations');
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
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

      {tab === 'recommendations' && <ProblemsRow recommendations={recommendations} />}

      {tab === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Due now */}
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

              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 12 }}>
                    UPCOMING — {upcoming.length}
                  </p>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    {upcoming.map((u, i) => {
                      const days = daysUntil(u.nextReviewAt);
                      const diff = u.problem.difficulty?.toLowerCase() ?? 'unknown';
                      const diffColor: Record<string, string> = { easy: 'var(--accent)', medium: 'var(--warning)', hard: 'var(--danger)', expert: '#a78bfa' };
                      const dc = diffColor[diff] ?? 'var(--text-muted)';
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
  const diffColor: Record<string, string> = { easy: 'var(--accent)', medium: 'var(--warning)', hard: 'var(--danger)', expert: '#a78bfa' };
  const dc = diffColor[diff] ?? 'var(--text-muted)';

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
