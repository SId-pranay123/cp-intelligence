import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { CONCEPT_GROUPS } from '@/lib/concepts';

interface RawSkillProfile {
  concepts?: Array<{ concept_id: string; concept_name: string; strength: number }>;
}

async function getStrengths(token: string): Promise<Record<string, number>> {
  try {
    const raw = await apiFetch<RawSkillProfile>('/recommendations/skill-profile', token);
    const strengths: Record<string, number> = {};
    for (const c of raw.concepts ?? []) strengths[c.concept_id] = c.strength;
    return strengths;
  } catch { return {}; }
}

const TOTAL = 71;

function buildNameMap() {
  const map: Record<string, string> = {};
  for (const g of CONCEPT_GROUPS) for (const c of g.concepts) map[c.id] = c.name;
  return map;
}

export default async function OverviewPage() {
  const token = cookies().get('cp_token')!.value;
  const strengths = await getStrengths(token);
  const nameMap = buildNameMap();

  const entries = Object.entries(strengths);
  const mastered = entries.filter(([, s]) => s >= 80).length;
  const inProgress = entries.filter(([, s]) => s >= 40 && s < 80).length;
  const notStarted = TOTAL - entries.filter(([, s]) => s >= 40).length;
  const avg = entries.length > 0 ? Math.round(entries.reduce((sum, [, s]) => sum + s, 0) / entries.length) : 0;

  const top5 = [...entries].sort(([, a], [, b]) => b - a).slice(0, 5);

  const statCards = [
    { label: 'Mastered', sub: 'concepts >80', value: mastered, color: 'var(--accent)' },
    { label: 'In progress', sub: 'concepts 40–80', value: inProgress, color: 'var(--warning)' },
    { label: 'Not started', sub: 'concepts <40', value: notStarted, color: 'var(--text-muted)' },
    { label: 'Avg strength', sub: 'all concepts', value: avg, color: 'var(--accent)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* OVERVIEW */}
      <section>
        <SectionLabel label="OVERVIEW" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {statCards.map(({ label, sub, value, color }) => (
            <div key={label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '20px',
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>{label}</p>
              <p style={{ color, fontSize: 36, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>{value}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STRONGEST CONCEPTS */}
      {top5.length > 0 && (
        <section>
          <SectionLabel label="STRONGEST CONCEPTS" />
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {top5.map(([id, score], i) => (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 20px',
                borderBottom: i < top5.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ color: 'var(--text-primary)', fontSize: 14, width: 140, flexShrink: 0 }}>
                  {nameMap[id] ?? id}
                </span>
                <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: 'var(--accent)', borderRadius: 2 }} />
                </div>
                <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600, width: 32, textAlign: 'right' }}>
                  {Math.round(score)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECENT ACTIVITY */}
      <section>
        <SectionLabel label="RECENT ACTIVITY" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                Sync your Codeforces account to see activity.
              </p>
            </div>
          ) : (
            <>
              <ActivityCard
                dot="var(--accent)"
                text={<>Profile synced — <strong style={{ color: 'var(--text-primary)' }}>{entries.length} concepts</strong> scored</>}
                time="just now"
              />
              <ActivityCard
                dot="var(--accent)"
                text={<>Avg strength <strong style={{ color: 'var(--accent)' }}>{avg}%</strong> across all practiced concepts</>}
                time=""
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ActivityCard({ dot, text, time }: { dot: string; text: React.ReactNode; time: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{text}</span>
      </div>
      {time && <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>{time}</span>}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 12 }}>{label}</p>;
}
