import { TOTAL_CONCEPTS } from '@/lib/concepts';

interface Props {
  strengths: Record<string, number>;
}

export default function ProgressSection({ strengths }: Props) {
  const entries = Object.entries(strengths ?? {});
  const mastered = entries.filter(([, s]) => s >= 60).length;
  const learning = entries.filter(([, s]) => s > 0 && s < 60).length;
  const pct = TOTAL_CONCEPTS > 0 ? Math.round((mastered / TOTAL_CONCEPTS) * 100) : 0;

  const avgStrength =
    entries.length > 0
      ? Math.round(entries.reduce((sum, [, s]) => sum + s, 0) / entries.length)
      : 0;

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">Progress</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Stat label="Mastered (≥60%)" value={mastered} suffix={`/ ${TOTAL_CONCEPTS}`} color="text-green-400" />
        <Stat label="In Progress" value={learning} color="text-yellow-400" />
        <Stat label="Not Started" value={TOTAL_CONCEPTS - mastered - learning} color="text-gray-500" />
        <Stat label="Avg Strength" value={avgStrength} suffix="%" color="text-indigo-400" />
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{mastered} concepts mastered</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
