import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Sidebar from '@/components/sidebar';
import SyncButton from '@/components/sync-button';
import StatCards from '@/components/stat-cards';
import KnowledgeGraph from '@/components/knowledge-graph';
import SkillHeatmap from '@/components/skill-heatmap';
import ProblemsRow from '@/components/problems-row';

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

async function getProfile(token: string): Promise<{ strengths: Record<string, number> }> {
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

async function getCfHandle(token: string): Promise<string | undefined> {
  try {
    const data = await apiFetch<{ codeforcesHandle?: string }>('/auth/me', token);
    return data.codeforcesHandle;
  } catch {
    return undefined;
  }
}

export default async function DashboardPage() {
  const token = cookies().get('cp_token')?.value;
  if (!token) redirect('/auth');

  const [profile, recommendations, cfHandle] = await Promise.all([
    getProfile(token),
    getRecommendations(token),
    getCfHandle(token),
  ]);

  const { strengths } = profile;
  const lastSynced = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex min-h-screen bg-[#06060a]">
      <Sidebar handle={cfHandle} />

      {/* Main content — offset by sidebar width */}
      <div className="ml-52 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 border-b border-[#1a1a2a] bg-[#06060a]/80 backdrop-blur">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-200">Dashboard</h2>
            <span className="text-[11px] font-mono text-slate-600">
              Last synced {lastSynced}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <SyncButton />
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors px-2 py-1.5"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        {/* Page sections */}
        <main className="flex-1 px-8 py-8 space-y-12">
          {/* Stats */}
          <section id="stats">
            <SectionLabel label="Overview" />
            <StatCards strengths={strengths} />
          </section>

          {/* Knowledge graph */}
          <section id="graph">
            <SectionLabel label="Knowledge Graph" sub="71 concepts · dependency edges · node color = skill strength" />
            <KnowledgeGraph strengths={strengths} />
          </section>

          {/* Heatmap */}
          <section id="heatmap">
            <SectionLabel label="Skill Heatmap" sub="All 71 concepts grouped by category" />
            <SkillHeatmap strengths={strengths} />
          </section>

          {/* Today's problems */}
          <section id="problems">
            <SectionLabel
              label="Today's Problems"
              sub={recommendations.length > 0 ? `${recommendations.length} recommendations` : undefined}
            />
            <ProblemsRow recommendations={recommendations} />
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <h2 className="text-base font-semibold text-slate-100">{label}</h2>
      {sub && <span className="text-xs font-mono text-slate-600">{sub}</span>}
    </div>
  );
}
