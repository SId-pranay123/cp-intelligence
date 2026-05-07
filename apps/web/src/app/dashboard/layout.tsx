import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Sidebar from '@/components/sidebar';
import SyncButton from '@/components/sync-button';
import UserMenu from '@/components/user-menu';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('cp_token')?.value;
  if (!token) redirect('/auth');

  let cfHandle: string | undefined;
  let initials = 'U';
  try {
    const data = await apiFetch<{ codeforcesHandle?: string; username?: string }>('/auth/me', token);
    cfHandle = data.codeforcesHandle ?? undefined;
    if (data.username) initials = data.username.slice(0, 2).toUpperCase();
  } catch {}

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Top navbar */}
      <header style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-base)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16 }}>CP </span>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>Intelligence</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SyncButton />
          <UserMenu initials={initials} />
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar handle={cfHandle} />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px 40px', maxWidth: 'calc(100% - 240px)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
