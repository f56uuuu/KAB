import { NextResponse, type NextRequest } from 'next/server';

// Temporary testing gate: a simple session cookie set by /login.
// Replace with real Supabase auth (phone OTP) once an SMS provider is configured.
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get('kap_session')?.value);
  const path = request.nextUrl.pathname;

  const isProtected = path.startsWith('/home') || path.startsWith('/ride');
  const isLoginPage = path.startsWith('/login');

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isLoginPage && hasSession) {
    return NextResponse.redirect(new URL('/home', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/home/:path*', '/ride/:path*', '/login'],
};
