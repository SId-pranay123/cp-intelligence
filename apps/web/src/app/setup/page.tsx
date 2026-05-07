'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'handle' | 'syncing' | 'done';

export default function SetupPage() {
  const [step, setStep] = useState<Step>('handle');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (step === 'syncing') {
      setProgress(0);
      let p = 0;
      progressRef.current = setInterval(() => {
        p += Math.random() * 4;
        if (p >= 90) { clearInterval(progressRef.current!); p = 90; }
        setProgress(p);
      }, 400);
    } else if (step === 'done') {
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [step]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setStep('syncing');

    try {
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

      const syncRes = await fetch('/api/sync', { method: 'POST' });
      if (!syncRes.ok) {
        const d = await syncRes.json();
        throw new Error(d.message ?? d.error ?? 'Sync failed');
      }
      const syncData = await syncRes.json();
      setSyncedCount(syncData.synced as number);
      setStep('done');
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('handle');
    }
  }

  const stepIndex = step === 'handle' ? 0 : step === 'syncing' ? 1 : 2;

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 600 }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 48 }}>
          {['Handle', 'Sync', 'Done'].map((label, i) => {
            const active = i === stepIndex;
            const done = i < stepIndex;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 600,
                    background: done ? '#10b981' : active ? '#0d2818' : '#161b22',
                    border: `2px solid ${done ? '#10b981' : active ? '#10b981' : '#30363d'}`,
                    color: done ? '#fff' : active ? '#10b981' : '#484f58',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                </div>
                {i < 2 && (
                  <div style={{
                    width: 120, height: 1,
                    background: done ? '#10b981' : '#30363d',
                    margin: '0 0 0 0',
                    flexShrink: 0,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f0f6fc', marginBottom: 10 }}>
            Connect your Codeforces account
          </h1>
          <p style={{ fontSize: 14, color: '#8b949e' }}>
            We&apos;ll sync your submission history to build your skill profile
          </p>
        </div>

        {/* Handle input step */}
        {step === 'handle' && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 12, marginBottom: error ? 16 : 0 }}>
              <input
                type="text"
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. tourist or pranay.2"
                style={{
                  flex: 1,
                  background: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 15,
                  fontFamily: 'monospace',
                  color: '#f0f6fc',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: '1px solid #484f58',
                  background: '#1c2128',
                  color: '#f0f6fc',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Verify & sync
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 12, background: '#2d1f1f', border: '1px solid #5c2626', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
              </div>
            )}
          </form>
        )}

        {/* Syncing step */}
        {(step === 'syncing' || step === 'done') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#8b949e', fontSize: 14 }}>
                {step === 'done' ? 'Sync complete' : 'Syncing submissions...'}
              </span>
              {syncedCount !== null && (
                <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>
                  {syncedCount.toLocaleString()} found
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, background: '#30363d', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: '#10b981',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ color: '#6e7681', fontSize: 13, textAlign: 'center' }}>
              {step === 'done'
                ? 'Redirecting to dashboard…'
                : 'Computing skill scores across 71 concept nodes'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
