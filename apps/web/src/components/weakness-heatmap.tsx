'use client';

import { CONCEPT_GROUPS } from '@/lib/concepts';

interface Props {
  strengths: Record<string, number>; // conceptId → strength 0–100
}

function strengthClass(s: number | undefined): string {
  if (s === undefined || s === 0) return 'bg-gray-800 text-gray-500 border-gray-700';
  if (s < 20) return 'bg-red-950 text-red-300 border-red-900';
  if (s < 40) return 'bg-red-800 text-red-100 border-red-700';
  if (s < 60) return 'bg-yellow-700 text-yellow-100 border-yellow-600';
  if (s < 80) return 'bg-green-700 text-green-100 border-green-600';
  return 'bg-green-500 text-white border-green-400';
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
      <span>Strength:</span>
      {[
        { label: '0–20', cls: 'bg-red-950 border-red-900' },
        { label: '20–40', cls: 'bg-red-800 border-red-700' },
        { label: '40–60', cls: 'bg-yellow-700 border-yellow-600' },
        { label: '60–80', cls: 'bg-green-700 border-green-600' },
        { label: '80–100', cls: 'bg-green-500 border-green-400' },
        { label: 'No data', cls: 'bg-gray-800 border-gray-700' },
      ].map(({ label, cls }) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`inline-block w-3 h-3 rounded border ${cls}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function WeaknessHeatmap({ strengths }: Props) {
  const data = strengths ?? {};
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">Skill Heatmap</h2>
        <Legend />
      </div>

      <div className="space-y-5">
        {CONCEPT_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.concepts.map((c) => {
                const s = data[c.id];
                return (
                  <div
                    key={c.id}
                    title={`${c.name}: ${s !== undefined ? Math.round(s) + '%' : 'no data'}`}
                    className={`
                      flex flex-col items-center justify-center
                      w-24 h-16 rounded border text-center cursor-default
                      transition-opacity hover:opacity-90
                      ${strengthClass(s)}
                    `}
                  >
                    <span className="text-[10px] font-medium leading-tight px-1 truncate w-full text-center">
                      {c.name}
                    </span>
                    <span className="text-sm font-bold mt-0.5">
                      {s !== undefined ? `${Math.round(s)}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
