import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import ProblemsRow from '@/components/problems-row';

interface Problem {
  id: string;
  title: string;
  link: string;
  difficulty: string;
  source: string;
}

interface Recommendation {
  problem: Problem;
  concept_name: string;
  reason: string;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
}

async function getRecommendations(token: string): Promise<Recommendation[]> {
  try {
    const data = await apiFetch<RecommendationsResponse>('/recommendations', token);
    return data.recommendations ?? [];
  } catch {
    return [];
  }
}

export default async function ProblemsPage() {
  const token = cookies().get('cp_token')!.value;
  const recommendations = await getRecommendations(token);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>TODAY&apos;S PROBLEMS</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
          {recommendations.length > 0
            ? `${recommendations.length} problems matched to your weakest concepts`
            : 'Sync your Codeforces account to get recommendations'}
        </p>
      </div>
      <ProblemsRow recommendations={recommendations} />
    </div>
  );
}
