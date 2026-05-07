'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CONCEPT_GROUPS } from '@/lib/concepts';
import ExplainPanel, { useExplainPanel } from './explain-panel';

interface Props { strengths: Record<string, number>; }

function badgeStyle(s: number | undefined): React.CSSProperties {
  const score = s ?? 0;
  if (score === 0) return { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
  if (score < 25) return { background: '#0d2818', color: '#6ee7b7', border: '1px solid #065f46' };
  if (score < 50) return { background: '#064e3b', color: '#34d399', border: '1px solid #059669' };
  if (score < 75) return { background: '#065f46', color: '#a7f3d0', border: '1px solid #10b981' };
  return { background: '#047857', color: '#d1fae5', border: '1px solid #34d399' };
}

export default function SkillHeatmap({ strengths }: Props) {
  const { open, props, explain, close } = useExplainPanel();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data</span>
        {[
          { label: '0–25', bg: '#0d2818', color: '#6ee7b7', border: '#065f46' },
          { label: '25–50', bg: '#064e3b', color: '#34d399', border: '#059669' },
          { label: '50–75', bg: '#065f46', color: '#a7f3d0', border: '#10b981' },
          { label: '75–100', bg: '#047857', color: '#d1fae5', border: '#34d399' },
        ].map(({ label, bg, color, border }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1px solid ${border}`, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          </span>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
        {CONCEPT_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 24 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>{group.label}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.concepts.map((c) => {
                const s = strengths[c.id];
                const score = s !== undefined && s > 0 ? Math.round(s) : 0;
                const isHovered = hoveredId === c.id;

                return (
                  <div
                    key={c.id}
                    style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <Link
                      href={`/dashboard/drill/${c.id}`}
                      title={`Drill ${c.name} — ${score > 0 ? score + '%' : 'no data'}`}
                      style={{
                        ...badgeStyle(s),
                        borderRadius: isHovered ? '6px 0 0 6px' : 6,
                        padding: '6px 12px',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        textDecoration: 'none',
                        display: 'inline-block',
                        transition: 'border-radius 0.1s',
                      }}
                    >
                      {c.name}{score > 0 ? ` ${score}` : ''}
                    </Link>

                    {isHovered && (
                      <button
                        onClick={() => explain({ conceptId: c.id, conceptName: c.name, strength: score })}
                        title="AI explanation"
                        style={{
                          ...badgeStyle(s),
                          borderLeft: 'none',
                          borderRadius: '0 6px 6px 0',
                          padding: '6px 8px',
                          fontSize: 12,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                        }}
                      >
                        ?
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {open && props && (
        <ExplainPanel
          conceptId={props.conceptId}
          conceptName={props.conceptName}
          strength={props.strength}
          onClose={close}
        />
      )}
    </div>
  );
}
