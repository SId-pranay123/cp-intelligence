import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_URL ?? 'http://localhost:3001';

export async function GET() {
  const token = cookies().get('cp_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const res = await fetch(`${API}/targets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const token = cookies().get('cp_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await req.json();
  const res = await fetch(`${API}/targets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
