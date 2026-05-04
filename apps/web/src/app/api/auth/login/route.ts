import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const token: string = data.accessToken;
  const response = NextResponse.json({ ok: true });
  response.cookies.set('cp_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
