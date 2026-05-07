'use client';
import { useEffect, useState } from 'react';
import { estimateRating, fetchActualRating, ratingGapMessage } from '@/lib/rating-estimator';

interface Props {
  strengths: Record<string, number>;
  cfHandle?: string;
}

export default function RatingCard({ strengths, cfHandle }: Props) {
  const [actual, setActual] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);

  const estimated = estimateRating(strengths);

  useEffect(() => {
    if (!cfHandle || estimated === 0) return;
    setFetching(true);
    fetchActualRating(cfHandle)
      .then(setActual)
      .finally(() => setFetching(false));
  }, [cfHandle, estimated]);

  if (estimated === 0) return null;

  const gap = actual != null ? estimated - actual : null;
  const gapColor = gap == null ? 'var(--text-muted)' : gap > 0 ? 'var(--accent)' : 'var(--danger)';

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '20px',
    }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Estimated rating</p>
      <p style={{ color: 'var(--accent)', fontSize: 36, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
        ~{estimated.toLocaleString()}
      </p>

      {fetching && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Fetching CF rating…</p>
      )}

      {!fetching && actual != null && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
            Actual: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{actual.toLocaleString()}</span>
            {gap != null && (
              <span style={{ color: gapColor, marginLeft: 8 }}>
                {gap > 0 ? `+${gap}` : gap}
              </span>
            )}
          </p>
          {gap != null && (
            <p style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4, marginTop: 6 }}>
              {ratingGapMessage(estimated, actual)}
            </p>
          )}
        </>
      )}

      {!fetching && actual == null && cfHandle && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Could not fetch actual rating</p>
      )}

      {!cfHandle && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sync CF handle to compare</p>
      )}
    </div>
  );
}
