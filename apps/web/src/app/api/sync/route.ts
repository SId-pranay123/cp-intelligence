import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_URL ?? 'http://localhost:3001';

// Vercel hobby plan allows up to 60s — sync needs it (CF API + bulk DB upserts)
export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  const token = cookies().get('cp_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  console.log('[sync] starting fetch to', API);
  const start = Date.now();

  let res: Response;
  try {
    res = await fetch(`${API}/codeforces/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    console.error('[sync] fetch failed after', Date.now() - start, 'ms:', err);
    return NextResponse.json({ error: 'Sync request timed out or failed', detail: String(err) }, { status: 504 });
  }

  console.log('[sync] got response', res.status, 'after', Date.now() - start, 'ms');
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
