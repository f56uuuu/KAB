import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

// Email confirmation / magic links land here: swap the code for a session, then continue.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') || '/home';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/home';

  if (code) {
    const store = cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      ...(next.startsWith('/admin') ? { cookieOptions: { name: 'sb-kap-admin' } } : {}),
      cookies: {
        get: (name: string) => store.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => store.set({ name, value, ...options }),
        remove: (name: string, options: CookieOptions) => store.set({ name, value: '', ...options }),
      },
    });
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
