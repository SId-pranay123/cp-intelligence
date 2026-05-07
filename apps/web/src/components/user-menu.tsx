'use client';
import { useState } from 'react';

export default function UserMenu({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false);

  async function logout() {
    setOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/auth';
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Account"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--accent-surface)',
          border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {initials}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, overflow: 'hidden', minWidth: 130,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <button
              onClick={logout}
              style={{
                display: 'block', width: '100%', padding: '10px 16px',
                textAlign: 'left', background: 'none', border: 'none',
                color: 'var(--danger)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
