'use client';
import { useState, FormEvent } from 'react';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = mode === 'register' ? { email, username, password } : { email, password };
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message ?? 'Failed');
        throw new Error(msg);
      }
      window.location.href = mode === 'register' ? '/setup' : '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-base)' }}>
      {/* Left brand panel */}
      <div style={{
        width: '55%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 64px', borderRight: '1px solid var(--border)',
      }} className="hidden lg:flex">
        <div style={{ maxWidth: 420 }}>
          <div style={{ marginBottom: 40 }}>
            <span style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 700 }}>CP </span>
            <span style={{ color: 'var(--accent)', fontSize: 28, fontWeight: 700 }}>Intelligence</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, lineHeight: 1.6, marginBottom: 40 }}>
            Your personalized competitive programming coach. Know exactly what to practice next.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              'Knowledge graph of 71 DSA concepts',
              'Syncs your Codeforces history automatically',
              'AI-powered daily recommendations',
              'Track real skill growth over time',
            ].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 32px', background: 'var(--bg-surface)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Start tracking your CP skills'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 6 }}>Username</label>
                <input
                  type="text" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+"
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="your_handle"
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 6 }}>Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 6 }}>Password</label>
              <input
                type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                background: loading ? 'var(--border)' : 'var(--accent)',
                color: loading ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: 8, padding: '12px',
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8,
              }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: 14 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};
