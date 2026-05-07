import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import SkillHeatmap from '@/components/skill-heatmap';

interface RawSkillProfile {
  concepts?: Array<{ concept_id: string; strength: number }>;
}

async function getStrengths(token: string): Promise<Record<string, number>> {
  try {
    const raw = await apiFetch<RawSkillProfile>('/recommendations/skill-profile', token);
    const strengths: Record<string, number> = {};
    for (const c of raw.concepts ?? []) strengths[c.concept_id] = c.strength;
    return strengths;
  } catch {
    return {};
  }
}

export default async function HeatmapPage() {
  const token = cookies().get('cp_token')!.value;
  const strengths = await getStrengths(token);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>SKILL HEATMAP</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>All 71 concepts grouped by category</p>
      </div>
      <SkillHeatmap strengths={strengths} />
    </div>
  );
}
