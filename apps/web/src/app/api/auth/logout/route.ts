import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/auth', req.url));
  response.cookies.delete('cp_token');
  return response;
}
