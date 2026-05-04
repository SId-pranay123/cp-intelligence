'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const [handle, setHandle] = useState('');
  const [step, setStep] = useState<'handle' | 'syncing' | 'done' | 'error'>('handle');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setStep('syncing');

    try {
      // Set CF handle
      const setRes = await fetch('/api/codeforces/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });
      if (!setRes.ok) {
        const d = await setRes.json();
        throw new Error(d.message ?? 'Failed to set handle');
      }

      // Trigger first sync
      const syncRes = await fetch('/api/sync', { method: 'POST' });
      if (!syncRes.ok) {
        const d = await syncRes.json();
        throw new Error(d.message ?? 'Sync failed');
      }

      setStep('done');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-100">Set Up Your Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Connect your Codeforces account to get started</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          {step === 'done' ? (
            <div className="text-center py-4">
              <p className="text-green-400 font-medium">Sync complete!</p>
              <p className="text-sm text-gray-500 mt-1">Redirecting to dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Codeforces Handle
                </label>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. tourist"
                  disabled={step === 'syncing'}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-950 border border-red-900 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={step === 'syncing'}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {step === 'syncing' && (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                )}
                {step === 'syncing' ? 'Syncing submissions…' : 'Connect & Sync'}
              </button>

              {step === 'syncing' && (
                <p className="text-xs text-gray-500 text-center">
                  This may take a moment for large submission histories.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
