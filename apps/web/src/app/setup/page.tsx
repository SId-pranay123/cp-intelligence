'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'handle' | 'syncing' | 'done';

export default function SetupPage() {
  const [step, setStep] = useState<Step>('handle');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setStep('syncing');

    try {
      // Step 1 — set handle
      const setRes = await fetch('/api/codeforces/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });
      if (!setRes.ok) {
        const d = await setRes.json();
        const msg = Array.isArray(d.message) ? d.message.join(', ') : (d.message ?? 'Failed to set handle');
        throw new Error(msg);
      }

      // Step 2 — trigger sync
      const syncRes = await fetch('/api/sync', { method: 'POST' });
      if (!syncRes.ok) {
        const d = await syncRes.json();
        throw new Error(d.message ?? d.error ?? 'Sync failed');
      }
      const syncData = await syncRes.json();
      setSyncedCount(syncData.synced as number);
      setStep('done');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('handle');
    }
  }

  return (
    <div className="min-h-screen bg-[#06060a] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="mb-12 text-center">
          <p className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase mb-2">
            CP Intelligence
          </p>
          <h1 className="text-2xl font-semibold text-slate-100">Connect Codeforces</h1>
          <p className="text-sm text-slate-500 mt-2">
            We&apos;ll import your full submission history to compute your skill profile.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {['Handle', 'Sync', 'Done'].map((label, i) => {
            const stepIdx = step === 'handle' ? 0 : step === 'syncing' ? 1 : 2;
            const active = i === stepIdx;
            const done = i < stepIdx;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-7 h-7 rounded-full border flex items-center justify-center
                      text-[11px] font-mono font-semibold transition-all
                      ${done
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : active
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-[#111119] border-[#2a2a3e] text-slate-600'
                      }
                    `}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] font-mono mt-1.5 ${active ? 'text-indigo-400' : done ? 'text-emerald-500' : 'text-slate-600'}`}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-px mx-3 mb-4 ${done ? 'bg-emerald-800' : 'bg-[#1a1a2a]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Panel */}
        <div className="bg-[#111119] border border-[#1a1a2a] rounded-lg p-7">
          {step === 'handle' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                  Codeforces Handle
                </label>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. tourist or pranay.2"
                  className="
                    w-full bg-[#0d0d15] border border-[#1a1a2a] hover:border-[#2a2a3e]
                    focus:border-indigo-600 focus:outline-none rounded
                    px-4 py-3 text-sm font-mono text-slate-200 placeholder-slate-600
                    transition-colors
                  "
                />
                <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
                  Your Codeforces username — we'll verify it exists before syncing.
                </p>
              </div>

              {error && (
                <div className="border border-red-900 bg-red-950 rounded px-4 py-3">
                  <p className="text-xs text-red-400 font-mono">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="
                  w-full bg-indigo-600 hover:bg-indigo-500
                  text-white rounded py-3 text-sm font-medium
                  transition-colors
                "
              >
                Connect & Sync
              </button>
            </form>
          )}

          {step === 'syncing' && (
            <div className="py-6 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-slate-200 font-medium">Importing submissions…</p>
                <p className="text-slate-500 text-sm mt-1">
                  This takes 5–30 seconds depending on your submission history.
                </p>
              </div>
              <div className="space-y-2">
                {['Fetching Codeforces API', 'Populating problems table', 'Processing submissions'].map(
                  (label, i) => (
                    <div key={label} className="flex items-center gap-3 text-xs font-mono text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                      {label}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400 text-xl">
                ✓
              </div>
              <div>
                <p className="text-slate-100 font-semibold">Sync complete</p>
                {syncedCount !== null && (
                  <p className="text-slate-500 text-sm mt-1">
                    <span className="font-mono text-emerald-400">{syncedCount.toLocaleString()}</span> submissions imported
                  </p>
                )}
                <p className="text-slate-600 text-xs mt-3">Redirecting to dashboard…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
