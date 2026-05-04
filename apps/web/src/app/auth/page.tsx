'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'login' | 'register';

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = tab === 'register'
        ? { email, username, password }
        : { email, password };

      const res = await fetch(`/api/auth/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message ?? 'Failed');
        throw new Error(msg);
      }
      router.refresh();
      router.push(tab === 'register' ? '/setup' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#0d0d15] border-r border-[#1a1a2a] p-12">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <span className="text-[10px] font-mono text-indigo-400 tracking-widest uppercase">CP</span>
            <span className="w-px h-3 bg-[#2a2a3e]" />
            <span className="text-sm font-semibold text-slate-200">Intelligence</span>
          </div>

          <h2 className="text-4xl font-semibold text-slate-100 leading-[1.2] mb-6">
            Know exactly<br />
            what to practice<br />
            next.
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
            Syncs your Codeforces history, scores 71 DSA concepts,
            and surfaces the problems that move your weakest skills forward.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-3">
          {[
            '71-concept knowledge graph',
            'Submission-based strength scoring',
            'AI-generated problem reasoning',
            'Dependency-aware recommendations',
          ].map((f) => (
            <div key={f} className="flex items-center gap-3 text-sm text-slate-500">
              <span className="w-1 h-1 rounded-full bg-indigo-500 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>

        {/* Grid decoration */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#818cf8 1px, transparent 1px), linear-gradient(90deg, #818cf8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-8 bg-[#06060a]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <p className="text-xs font-mono text-indigo-400 tracking-widest uppercase">
              CP Intelligence
            </p>
          </div>

          <h3 className="text-xl font-semibold text-slate-100 mb-1">
            {tab === 'login' ? 'Welcome back' : 'Create account'}
          </h3>
          <p className="text-sm text-slate-500 mb-8">
            {tab === 'login'
              ? 'Sign in to your account'
              : 'Start tracking your CP skills'}
          </p>

          {/* Tabs */}
          <div className="flex mb-6 bg-[#111119] border border-[#1a1a2a] rounded p-0.5 gap-0.5">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setUsername(''); }}
                className={`
                  flex-1 py-1.5 rounded text-xs font-mono font-medium transition-all
                  ${tab === t
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                  }
                `}
              >
                {t === 'login' ? 'Log In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <Field label="Username">
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_handle"
                  className={inputCls}
                />
              </Field>
            )}

            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>

            {error && (
              <div className="border border-red-900 bg-red-950 rounded px-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full bg-indigo-600 hover:bg-indigo-500
                disabled:bg-indigo-900 disabled:cursor-not-allowed
                text-white rounded py-2.5 text-sm font-medium
                transition-colors mt-2
              "
            >
              {loading
                ? 'Please wait…'
                : tab === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputCls = `
  w-full bg-[#111119] border border-[#1a1a2a] hover:border-[#2a2a3e]
  focus:border-indigo-600 focus:outline-none
  rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600
  font-mono transition-colors
`.trim();

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
