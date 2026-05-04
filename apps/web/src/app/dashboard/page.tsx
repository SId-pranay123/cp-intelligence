import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ProgressSection from '@/components/progress-section';
import WeaknessHeatmap from '@/components/weakness-heatmap';
import DailyRecommendations from '@/components/daily-recommendations';
import SyncButton from '@/components/sync-button';

interface SkillProfile {
  strengths: Record<string, number>;
  cfHandle?: string;
}

// Shape the Go processor actually returns via NestJS
interface RawSkillProfile {
  user_id: string;
  concepts?: Array<{ concept_id: string; concept_name: string; strength: number }>;
}

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

async function getProfile(token: string): Promise<SkillProfile> {
  try {
    const raw = await apiFetch<RawSkillProfile>('/recommendations/skill-profile', token);
    const strengths: Record<string, number> = {};
    for (const c of raw.concepts ?? []) {
      strengths[c.concept_id] = c.strength;
    }
    return { strengths };
  } catch {
    return { strengths: {} };
  }
}

async function getRecommendations(token: string): Promise<Recommendation[]> {
  try {
    const data = await apiFetch<RecommendationsResponse>('/recommendations', token);
    return data.recommendations ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const token = cookies().get('cp_token')?.value;
  if (!token) redirect('/auth');

  const [profile, recommendations] = await Promise.all([
    getProfile(token),
    getRecommendations(token),
  ]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-100">CP Intelligence</h1>
            {profile.cfHandle && (
              <p className="text-xs text-gray-500 mt-0.5">
                Tracking{' '}
                <a
                  href={`https://codeforces.com/profile/${profile.cfHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  {profile.cfHandle}
                </a>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <SyncButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <ProgressSection strengths={profile.strengths} />
        <WeaknessHeatmap strengths={profile.strengths} />
        <DailyRecommendations recommendations={recommendations} />
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="px-4 py-1.5 rounded text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
      >
        Log out
      </button>
    </form>
  );
}
