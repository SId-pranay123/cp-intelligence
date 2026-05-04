import { TOTAL_CONCEPTS } from '@/lib/concepts';

interface Props {
  strengths: Record<string, number>;
}

export default function StatCards({ strengths }: Props) {
  const entries = Object.entries(strengths ?? {});
  const mastered = entries.filter(([, s]) => s >= 80).length;
  const inProgress = entries.filter(([, s]) => s >= 40 && s < 80).length;
  const notStarted = TOTAL_CONCEPTS - entries.filter(([, s]) => s >= 40).length;
  const avgStrength =
    entries.length > 0
      ? Math.round(entries.reduce((sum, [, s]) => sum + s, 0) / entries.length)
      : 0;

  const cards = [
    {
      label: 'Mastered',
      sublabel: 'strength ≥ 80',
      value: mastered,
      suffix: `/ ${TOTAL_CONCEPTS}`,
      color: 'text-emerald-400',
      bar: 'bg-emerald-500',
      pct: (mastered / TOTAL_CONCEPTS) * 100,
    },
    {
      label: 'In Progress',
      sublabel: 'strength 40–79',
      value: inProgress,
      suffix: `/ ${TOTAL_CONCEPTS}`,
      color: 'text-amber-400',
      bar: 'bg-amber-500',
      pct: (inProgress / TOTAL_CONCEPTS) * 100,
    },
    {
      label: 'Not Started',
      sublabel: 'strength < 40',
      value: notStarted,
      suffix: `/ ${TOTAL_CONCEPTS}`,
      color: 'text-slate-400',
      bar: 'bg-slate-600',
      pct: (notStarted / TOTAL_CONCEPTS) * 100,
    },
    {
      label: 'Avg Strength',
      sublabel: 'across all concepts',
      value: avgStrength,
      suffix: '%',
      color: 'text-indigo-400',
      bar: 'bg-indigo-500',
      pct: avgStrength,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(({ label, sublabel, value, suffix, color, bar, pct }) => (
        <div
          key={label}
          className="bg-[#111119] border border-[#1a1a2a] rounded-lg p-5 flex flex-col gap-4"
        >
          <div>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">{label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{sublabel}</p>
          </div>
          <div>
            <p className={`font-mono text-3xl font-semibold ${color}`}>
              {value}
              <span className="text-base font-normal text-slate-600 ml-1.5">{suffix}</span>
            </p>
          </div>
          <div className="h-0.5 bg-[#1a1a2a] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${bar}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
