import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Sidebar from '@/components/sidebar';
import SyncButton from '@/components/sync-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('cp_token')?.value;
  if (!token) redirect('/auth');

  let cfHandle: string | undefined;
  try {
    const data = await apiFetch<{ codeforcesHandle?: string }>('/auth/me', token);
    cfHandle = data.codeforcesHandle ?? undefined;
  } catch {}

  return (
    <div className="flex min-h-screen bg-[#06060a]">
      <Sidebar handle={cfHandle} />

      <div className="ml-52 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-3.5 border-b border-[#1a1a2a] bg-[#06060a]/90 backdrop-blur">
          <span className="text-sm font-semibold text-slate-200">Dashboard</span>
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

        <main className="flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
