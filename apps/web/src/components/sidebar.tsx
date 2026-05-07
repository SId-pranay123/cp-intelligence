'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './theme-toggle';

const navItems = [
  { href: '/dashboard',          label: 'Dashboard',        icon: '⊞', exact: true },
  { href: '/dashboard/heatmap',  label: 'Skill heatmap',    icon: '⠿', exact: false },
  { href: '/dashboard/graph',    label: 'Knowledge graph',  icon: '◎', exact: false },
  { href: '/dashboard/problems', label: "Today's problems", icon: null, exact: false },
  { href: '/dashboard/progress', label: 'Progress',         icon: '↗', exact: false },
  { href: '/dashboard/targets',  label: 'Company targets',  icon: '◎', exact: false },
];

export default function Sidebar({ handle }: { handle?: string }) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 240,
      minHeight: 'calc(100vh - 56px)',
      borderRight: '1px solid var(--border)',
      background: 'var(--bg-base)',
      position: 'fixed',
      top: 56,
      left: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 12,
    }}>
      {/* CF handle badge */}
      {handle && (
        <div style={{ padding: '0 16px 12px' }}>
          <a
            href={`https://codeforces.com/profile/${handle}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              textDecoration: 'none',
              background: 'var(--accent-surface)',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              padding: '4px 10px',
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700 }}>CF</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{handle}</span>
          </a>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {navItems.map(({ href, label, icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                paddingLeft: icon ? 10 : 36,
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--bg-card)' : 'transparent',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              {icon && (
                <span style={{
                  fontSize: 13,
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  width: 16, textAlign: 'center', flexShrink: 0,
                }}>
                  {icon}
                </span>
              )}
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 8px 20px', borderTop: '1px solid var(--border)' }}>
        <Link
          href="/setup"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 6, textDecoration: 'none',
            fontSize: 14, color: 'var(--text-secondary)',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>⚙</span>
          Settings
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 0' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>THEME</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
