import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { CONCEPT_GROUPS } from '@/lib/concepts';

interface RawSkillProfile {
  concepts?: Array<{ concept_id: string; strength: number }>;
}

async function getStrengths(token: string): Promise<Record<string, number>> {
  try {
    const raw = await apiFetch<RawSkillProfile>('/recommendations/skill-profile', token);
    const strengths: Record<string, number> = {};
    for (const c of raw.concepts ?? []) strengths[c.concept_id] = c.strength;
    return strengths;
  } catch { return {}; }
}

function buildNameMap() {
  const map: Record<string, string> = {};
  for (const g of CONCEPT_GROUPS) for (const c of g.concepts) map[c.id] = c.name;
  return map;
}

export default async function ProgressPage() {
  const token = cookies().get('cp_token')!.value;
  const strengths = await getStrengths(token);
  const nameMap = buildNameMap();

  const entries = Object.entries(strengths);
  const avg = entries.length > 0 ? Math.round(entries.reduce((sum, [, s]) => sum + s, 0) / entries.length) : 0;
  const top5 = [...entries].sort(([, a], [, b]) => b - a).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>PROGRESS OVER TIME</p>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>30-DAY SKILL DIFF</p>
        </div>
        {top5.length > 0 ? top5.map(([id, score], i) => (
          <div key={id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: i < top5.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{nameMap[id] ?? id}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'line-through' }}>0</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>→</span>
              <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>{Math.round(score)}</span>
            </div>
          </div>
        )) : (
          <p style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>Sync to see progress data.</p>
        )}
        {avg > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Avg strength</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'line-through' }}>0</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>→</span>
              <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>{avg}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
