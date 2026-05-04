'use client';

import { CONCEPT_GROUPS } from '@/lib/concepts';

interface Props {
  strengths: Record<string, number>;
}

function cellStyle(s: number | undefined): string {
  if (s === undefined || s === 0) return 'strength-none';
  if (s < 40) return 'strength-low';
  if (s < 70) return 'strength-mid-low';
  if (s < 85) return 'strength-mid';
  return 'strength-high';
}

export default function SkillHeatmap({ strengths }: Props) {
  const data = strengths ?? {};

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
        <span>Strength:</span>
        {[
          { label: 'No data', cls: 'strength-none' },
          { label: '0–40', cls: 'strength-low' },
          { label: '40–70', cls: 'strength-mid-low' },
          { label: '70–85', cls: 'strength-mid' },
          { label: '85+', cls: 'strength-high' },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm border ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {CONCEPT_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.concepts.map((c) => {
              const s = data[c.id];
              return (
                <div
                  key={c.id}
                  title={`${c.name}: ${s !== undefined && s > 0 ? Math.round(s) + '%' : 'no data'}`}
                  className={`
                    flex flex-col items-center justify-center
                    rounded border cursor-default select-none
                    transition-all hover:scale-105 hover:z-10
                    ${cellStyle(s)}
                  `}
                  style={{ width: 88, height: 64 }}
                >
                  <span className="text-[10px] font-medium leading-tight px-2 text-center w-full truncate">
                    {c.name}
                  </span>
                  <span className="font-mono text-sm font-semibold mt-1">
                    {s !== undefined && s > 0 ? `${Math.round(s)}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
