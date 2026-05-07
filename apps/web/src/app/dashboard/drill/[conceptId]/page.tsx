import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { CONCEPT_GROUPS } from '@/lib/concepts';
import DrillExplainButton from '@/components/drill-explain-button';

interface DrillProblem {
  id: string;
  title: string;
  difficulty: string;
  link: string;
  source: string;
  solved: boolean;
  confidenceRating: number | null;
}

interface ConceptProblemsResponse {
  conceptId: string;
  problems: DrillProblem[];
}

interface RawSkillProfile {
  concepts?: Array<{ concept_id: string; strength: number }>;
}

function buildMeta() {
  const map: Record<string, { name: string; group: string }> = {};
  for (const g of CONCEPT_GROUPS)
    for (const c of g.concepts) map[c.id] = { name: c.name, group: g.label };
  return map;
}

const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };

const DIFF_COLOR: Record<string, string> = {
  easy: 'var(--accent)',
  medium: 'var(--warning)',
  hard: 'var(--danger)',
  expert: '#a78bfa',
};

export default async function DrillPage({
  params,
}: {
  params: { conceptId: string };
}) {
  const { conceptId } = params;
  const token = cookies().get('cp_token')!.value;
  const meta = buildMeta();
  const concept = meta[conceptId];
  if (!concept) notFound();

  const [profile, drillData] = await Promise.all([
    apiFetch<RawSkillProfile>('/recommendations/skill-profile', token).catch(() => ({ concepts: [] })),
    apiFetch<ConceptProblemsResponse>(
      `/recommendations/concept-problems?conceptId=${encodeURIComponent(conceptId)}`,
      token,
    ).catch(() => ({ conceptId, problems: [] })),
  ]);

  const strengthMap: Record<string, number> = {};
  for (const c of profile.concepts ?? []) strengthMap[c.concept_id] = c.strength;
  const strength = Math.round(strengthMap[conceptId] ?? 0);

  const problems = drillData.problems;
  const solved = problems.filter((p) => p.solved).length;
  const total = problems.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Back */}
      <Link
        href="/dashboard/heatmap"
        style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        ← Back to heatmap
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>
            {concept.group.toUpperCase()}
          </p>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            {concept.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
            {total} problems · {solved} solved · {total - solved} remaining
          </p>
          <DrillExplainButton conceptId={conceptId} conceptName={concept.name} strength={strength} />
        </div>

        {/* Strength gauge */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '16px 24px', textAlign: 'center', minWidth: 120,
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>STRENGTH</p>
          <p style={{
            fontSize: 40, fontWeight: 700, lineHeight: 1,
            color: strength >= 75 ? 'var(--accent)' : strength >= 40 ? 'var(--warning)' : 'var(--danger)',
          }}>
            {strength}
          </p>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${strength}%`, background: 'var(--accent)', borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {/* Problem list */}
      {total === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No problems found for this concept.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>Try syncing your Codeforces account to populate problems.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px',
            padding: '10px 20px', borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)',
          }}>
            <span>PROBLEM</span>
            <span style={{ textAlign: 'center' }}>DIFFICULTY</span>
            <span style={{ textAlign: 'center' }}>STATUS</span>
            <span style={{ textAlign: 'right' }}>LINK</span>
          </div>

          {problems.map((p, i) => {
            const diff = p.difficulty?.toLowerCase() ?? 'unknown';
            const dc = DIFF_COLOR[diff] ?? 'var(--text-muted)';

            return (
              <div
                key={p.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px',
                  alignItems: 'center', padding: '14px 20px',
                  borderBottom: i < problems.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: p.solved ? 0.75 : 1,
                }}
              >
                {/* Title */}
                <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: p.solved ? 400 : 500 }}>
                  {p.solved && <span style={{ color: 'var(--accent)', marginRight: 8 }}>✓</span>}
                  {p.title}
                </span>

                {/* Difficulty */}
                <span style={{
                  textAlign: 'center', fontSize: 12, color: dc,
                  background: 'var(--bg-base)', border: `1px solid ${dc}44`,
                  borderRadius: 12, padding: '2px 8px', justifySelf: 'center',
                }}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </span>

                {/* Status */}
                <span style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  {p.solved
                    ? p.confidenceRating != null
                      ? <span style={{ color: 'var(--accent)' }}>Rated {p.confidenceRating}/5</span>
                      : <span>Solved</span>
                    : <span>—</span>
                  }
                </span>

                {/* Link */}
                <a
                  href={p.link}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    textAlign: 'right', fontSize: 13, color: 'var(--accent)',
                    textDecoration: 'none', fontWeight: 500,
                  }}
                >
                  Solve ↗
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
