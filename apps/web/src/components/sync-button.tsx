'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [synced, setSynced] = useState<number | null>(null);
  const router = useRouter();

  async function handleSync() {
    setState('loading');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Sync failed');
      setSynced(data.synced as number);
      setState('done');
      router.refresh();
      setTimeout(() => setState('idle'), 5000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const label = {
    idle: 'Sync CF',
    loading: 'Syncing…',
    done: `↑ ${synced?.toLocaleString()} synced`,
    error: 'Sync failed',
  }[state];

  const borderColor = state === 'error' ? 'var(--danger)' : 'var(--accent)';
  const textColor = state === 'error' ? 'var(--danger)' : 'var(--accent)';

  return (
    <button
      disabled={state === 'loading'}
      onClick={handleSync}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 20,
        border: `1px solid ${borderColor}`,
        background: 'transparent',
        color: textColor,
        fontSize: 13, fontWeight: 500,
        cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        opacity: state === 'loading' ? 0.7 : 1,
        transition: 'all 0.2s',
      }}
    >
      {state === 'loading' ? (
        <span style={{
          width: 12, height: 12, border: '2px solid var(--accent)',
          borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block',
          animation: 'spin 0.8s linear infinite',
        }} />
      ) : (
        <span>↻</span>
      )}
      {label}
    </button>
  );
}
