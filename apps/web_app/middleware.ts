import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Pages anyone can open. Everything else needs a real Supabase session (validated server-side).
const PUBLIC = ['/welcome', '/login', '/admin/login', '/superadmin', '/auth'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const path = request.nextUrl.pathname;

  // first launch: language picker before anything else
  if (path === '/' || path === '/login') {
    if (!request.cookies.get('kap_lang')?.value) {
      return NextResponse.redirect(new URL('/welcome', request.url));
    }
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

  if (path === '/') {
    return NextResponse.redirect(new URL(user ? '/home' : '/login', request.url));
  }
  if (!user && !isPublic) {
    const to = path.startsWith('/admin') ? '/admin/login' : '/login';
    const url = new URL(to, request.url);
    if (path !== '/home') url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/home', request.url));
  }
  return response;
}

export const config = {
  // everything except static assets, Next internals and the map API route
  matcher: ['/((?!_next/|api/|favicon|icon|apple-icon|manifest|sw.js|icon-512.png|.*\\.(?:png|jpg|svg|webp|ico)$).*)'],
};
