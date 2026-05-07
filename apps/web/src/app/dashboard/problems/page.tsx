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
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100 mb-1">Today's Problems</h2>
        <p className="text-xs font-mono text-slate-600">
          {recommendations.length > 0
            ? `${recommendations.length} problems matched to your weakest concepts`
            : 'Sync your Codeforces account to get recommendations'}
        </p>
      </div>
      <ProblemsRow recommendations={recommendations} />
    </div>
  );
}
