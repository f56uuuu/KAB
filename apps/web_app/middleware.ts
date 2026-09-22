import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/// Every request through here re-validates the session server-side (never
/// trusting a client-side "am I logged in" flag) and keeps the Supabase
/// auth cookie fresh, exactly like the admin dashboard's requireAdmin guard
/// does for Server Components — this is the equivalent for edge middleware.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isProtected = path.startsWith('/home') || path.startsWith('/ride');
  const isLoginPage = path.startsWith('/login');

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/home/:path*', '/ride/:path*', '/login'],
};
