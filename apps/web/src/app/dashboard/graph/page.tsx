import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import KnowledgeGraph from '@/components/knowledge-graph';

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

export default async function GraphPage() {
  const token = cookies().get('cp_token')!.value;
  const strengths = await getStrengths(token);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100 mb-1">Knowledge Graph</h2>
        <p className="text-xs font-mono text-slate-600">71 concepts · dependency edges · node color = skill strength</p>
      </div>
      <KnowledgeGraph strengths={strengths} />
    </div>
  );
}
