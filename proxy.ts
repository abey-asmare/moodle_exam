import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isPublicPath(pathname: string) {
  // Shared routes always public
  if (pathname.startsWith('/s')) return true;
  // Shared API endpoints always public
  if (pathname.startsWith('/api/examinations/shared/')) return true;
  // Login page and API always public
  if (['/login', '/api/auth/login'].includes(pathname)) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths – allow without token
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  const VALID_TOKEN = process.env.ACCESS_TOKEN; // should be set in production

  // Authenticated – allow
  if (token && token === VALID_TOKEN) {
    return NextResponse.next();
  }

  // Not authenticated – handle differently for exam view route
  const examViewPattern = /^\/examination\/\d+$/;
  if (examViewPattern.test(pathname)) {
    // Extract exam ID and redirect to shared version
    const examId = pathname.split('/').pop(); // e.g. "10"
    return NextResponse.redirect(new URL(`/s/examination/${examId}`, request.url));
  }

  // All other protected routes – redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/auth/login).*)'],
};