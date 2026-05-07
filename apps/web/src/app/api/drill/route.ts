import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_URL ?? 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const token = cookies().get('cp_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const conceptId = req.nextUrl.searchParams.get('conceptId') ?? '';
  const res = await fetch(
    `${API}/recommendations/concept-problems?conceptId=${encodeURIComponent(conceptId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
