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
      // Refresh server component data
      router.refresh();
      setTimeout(() => setState('idle'), 4000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const label = {
    idle: 'Sync CF',
    loading: 'Syncing…',
    done: `Synced ${synced} submissions`,
    error: 'Sync failed',
  }[state];

  const cls = {
    idle: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    loading: 'bg-indigo-800 text-indigo-300 cursor-not-allowed',
    done: 'bg-green-700 text-green-100',
    error: 'bg-red-800 text-red-100',
  }[state];

  return (
    <button
      disabled={state === 'loading'}
      onClick={handleSync}
      className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${cls}`}
    >
      {state === 'loading' && (
        <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
      )}
      {label}
    </button>
  );
}
