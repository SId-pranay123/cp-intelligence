'use client';
import { useState, useEffect, FormEvent } from 'react';

interface Target {
  id: string;
  companyName: string;
  tags: string[];
}

export default function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/targets');
      if (res.ok) setTargets(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setAdding(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim(), tags }),
      });
      if (res.ok) {
        const newTarget = await res.json();
        setTargets(prev => [...prev, newTarget]);
        setCompanyName('');
        setTagsInput('');
        setShowForm(false);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/targets/${id}`, { method: 'DELETE' });
    if (res.ok) setTargets(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>COMPANY TARGETS</p>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20,
            border: '1px solid var(--accent)',
            background: 'transparent', color: 'var(--accent)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          + Add company
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} style={{
          background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 10, padding: 20,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>Company name</label>
            <input
              required value={companyName} onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. Google, Meta, Jane Street"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>Focus areas (comma-separated)</label>
            <input
              value={tagsInput} onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. DP Heavy, Graph algorithms, Hard problems"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit" disabled={adding}
              style={{
                padding: '8px 20px', borderRadius: 8,
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: adding ? 'not-allowed' : 'pointer',
                opacity: adding ? 0.7 : 1,
              }}
            >
              {adding ? 'Adding…' : 'Add target'}
            </button>
            <button
              type="button" onClick={() => setShowForm(false)}
              style={{
                padding: '8px 20px', borderRadius: 8,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Target list */}
      {loading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
        </div>
      ) : targets.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 6 }}>No company targets yet.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add companies you're targeting to track your readiness.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {targets.map(t => (
            <div key={t.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>{t.companyName}</h3>
                <button
                  onClick={() => handleDelete(t.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px',
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '0%', background: 'var(--accent)', borderRadius: 2 }} />
              </div>
              {t.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {t.tags.map(tag => (
                    <span key={tag} style={{
                      background: 'var(--bg-base)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '4px 10px',
                      color: 'var(--text-secondary)', fontSize: 12,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
