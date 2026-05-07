'use client';
import { useState } from 'react';
import ExplainPanel from './explain-panel';

interface Props {
  conceptId: string;
  conceptName: string;
  strength: number;
}

export default function DrillExplainButton({ conceptId, conceptName, strength }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--accent-surface)', border: '1px solid var(--accent)',
          borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
          color: 'var(--accent)', fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        ✦ Explain this concept
      </button>

      {open && (
        <ExplainPanel
          conceptId={conceptId}
          conceptName={conceptName}
          strength={strength}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
