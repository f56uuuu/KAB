'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/// Admin login is email+password (not the phone/OTP flow customers use) —
/// separate credential path on purpose: a leaked customer OTP flow should
/// never be a way into Super Admin (section 113/114 isolation).
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    // Server-side layout guard (requireAdmin) will bounce back to /login
    // if this user isn't an active admin_users row — this client redirect
    // is just the happy-path shortcut.
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-secondary mb-1">KAP Admin</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to the Super Admin dashboard</p>

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-ink font-semibold rounded-xl py-3 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
