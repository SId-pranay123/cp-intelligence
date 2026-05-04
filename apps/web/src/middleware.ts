import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('cp_token')?.value;
  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/setup');

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (pathname === '/auth' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/setup/:path*', '/auth'],
};
