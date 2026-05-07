'use client';
import { useState, useEffect, useCallback } from 'react';

interface ExplainPanelProps {
  conceptId: string;
  conceptName: string;
  strength: number;
}

function cacheKey(conceptId: string, strength: number) {
  return `explain:${conceptId}:${Math.floor(strength / 10)}`;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      nodes.push(
        <p key={i} style={{
          color: 'var(--text-primary)', fontSize: 13, fontWeight: 700,
          marginTop: nodes.length > 0 ? 20 : 0, marginBottom: 6,
        }}>
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.trim() !== '') {
      const isMono = /^\s{2,}/.test(line);
      nodes.push(
        <p key={i} style={{
          color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, margin: 0,
          fontFamily: isMono ? 'monospace' : 'inherit',
          whiteSpace: isMono ? 'pre' : 'normal',
        }}>
          {line}
        </p>
      );
    }
  }

  return nodes;
}

export function useExplainPanel() {
  const [open, setOpen] = useState(false);
  const [props, setProps] = useState<ExplainPanelProps | null>(null);

  const explain = useCallback((p: ExplainPanelProps) => {
    setProps(p);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return { open, props, explain, close };
}

export default function ExplainPanel({
  conceptId,
  conceptName,
  strength,
  onClose,
}: ExplainPanelProps & { onClose: () => void }) {
  const key = cacheKey(conceptId, strength);
  const cached = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;

  const [text, setText] = useState<string>(cached ?? '');
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;

    let cancelled = false;

    async function stream() {
      try {
        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conceptId, conceptName, strength }),
        });
        if (!res.body || cancelled) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          accumulated += decoder.decode(value, { stream: true });
          setText(accumulated);
        }
        if (!cancelled) sessionStorage.setItem(key, accumulated);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void stream();
    return () => { cancelled = true; };
  }, [conceptId, conceptName, strength, key, cached]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(0,0,0,0.3)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, zIndex: 50,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
        animation: 'slideInRight 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>
              AI EXPLAINER
            </p>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: 0 }}>
              {conceptName}
            </h2>
            {strength > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                Your strength: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{strength}/100</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 18, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && text === '' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[80, 55, 90, 65, 75, 50].map((w, i) => (
                <div key={i} style={{
                  height: 14, borderRadius: 4,
                  background: 'var(--border)',
                  width: `${w}%`,
                  animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
                }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {renderMarkdown(text)}
              {loading && (
                <span style={{
                  display: 'inline-block', width: 8, height: 14,
                  background: 'var(--accent)', borderRadius: 2,
                  animation: 'pulse 0.8s ease-in-out infinite', marginTop: 4,
                }} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Powered by Groq · Cached for this session
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </>
  );
}
