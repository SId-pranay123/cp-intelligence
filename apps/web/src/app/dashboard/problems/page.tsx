import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import ProblemsTabs from '@/components/problems-tabs';

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

interface ReviewItem {
  problem: Problem;
  concept_name: string;
  reason: string;
  last_confidence: number | null;
}

interface UpcomingItem {
  problem: { id: string; title: string; link: string; difficulty: string };
  last_confidence: number | null;
  nextReviewAt: string;
}

async function getRecommendations(token: string): Promise<Recommendation[]> {
  try {
    const data = await apiFetch<{ recommendations: Recommendation[] }>('/recommendations', token);
    return data.recommendations ?? [];
  } catch {
    return [];
  }
}

async function getReviewQueue(token: string): Promise<{ reviews: ReviewItem[]; upcoming: UpcomingItem[] }> {
  try {
    return await apiFetch<{ reviews: ReviewItem[]; upcoming: UpcomingItem[] }>(
      '/recommendations/review-queue',
      token,
    );
  } catch {
    return { reviews: [], upcoming: [] };
  }
}

export default async function ProblemsPage() {
  const token = cookies().get('cp_token')!.value;

  const [recommendations, { reviews, upcoming }] = await Promise.all([
    getRecommendations(token),
    getReviewQueue(token),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
          TODAY&apos;S PROBLEMS
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
          {recommendations.length > 0
            ? `${recommendations.length} problems matched to your weakest concepts`
            : 'Sync your Codeforces account to get recommendations'}
          {reviews.length > 0 && ` · ${reviews.length} due for review`}
        </p>
      </div>
      <ProblemsTabs
        recommendations={recommendations}
        initialReviews={reviews}
        initialUpcoming={upcoming}
      />
    </div>
  );
}
