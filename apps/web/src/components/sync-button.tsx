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

  const configs = {
    idle: {
      label: 'Sync',
      cls: 'border-[#2a2a3e] text-slate-300 hover:border-indigo-500 hover:text-indigo-300',
    },
    loading: {
      label: 'Syncing…',
      cls: 'border-indigo-800 text-indigo-400 cursor-not-allowed',
    },
    done: {
      label: `↑ ${synced?.toLocaleString()} synced`,
      cls: 'border-emerald-800 text-emerald-400',
    },
    error: {
      label: 'Sync failed',
      cls: 'border-red-900 text-red-400',
    },
  }[state];

  return (
    <button
      disabled={state === 'loading'}
      onClick={handleSync}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono
        transition-all duration-200 ${configs.cls}
      `}
    >
      {state === 'loading' && (
        <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
      )}
      {configs.label}
    </button>
  );
}
