'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { formatAuthError } from '@/lib/auth-error';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import { ClikdWordmark } from '@/components/brand/ClikdLogo';

/**
 * Request a password reset. Tries Supabase Auth first, then better-auth
 * so existing clikd: accounts (Postgres user table) still get a link.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const trimmed = email.trim().toLowerCase();
    const origin = window.location.origin;
    const redirectTo = `${origin}/api/auth/callback?next=/update-password`;

    try {
      const supabase = getBrowserSupabase();
      if (supabase) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          trimmed,
          { redirectTo }
        );
        if (resetError) {
          console.warn('[forgot-password] supabase reset', resetError.message);
        }
      }

      const { error: betterError } = await authClient.requestPasswordReset({
        email: trimmed,
        redirectTo: `${origin}/update-password`,
      });
      if (betterError) {
        console.warn('[forgot-password] better-auth reset', betterError);
      }

      setSent(true);
      toast.success('If an account exists for that email, we sent a reset link.');
    } catch (err) {
      setError(formatAuthError(err, 'Could not send reset email'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="nc-app nc-app-shell flex min-h-screen w-full items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center mb-8">
          <ClikdWordmark showMark={false} textClassName="text-2xl" className="min-h-0 gap-0" />
        </div>

        {sent ? (
          <div className="nc-glass rounded-[1.5rem] p-7 space-y-4">
            <h1 className="text-xl font-display font-extrabold text-[#2c3340]">
              Check your email
            </h1>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">
              If an account exists for <span className="font-bold text-zinc-800">{email}</span>,
              we sent a link to set a new password. It may take a minute to arrive.
            </p>
            <Link
              href="/account/signin"
              className="inline-flex items-center justify-center h-12 w-full rounded-full bg-[var(--nc-coral)] text-sm font-extrabold text-white hover:opacity-90"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              void onSubmit(e);
            }}
            className="nc-glass rounded-[1.5rem] p-7 flex flex-col gap-4"
          >
            <div>
              <h1 className="text-xl font-display font-extrabold text-[#2c3340]">
                Forgot password?
              </h1>
              <p className="text-sm text-zinc-400 font-medium mt-0.5">
                Enter your email and we will send a reset link.
              </p>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:border-[var(--nc-coral)] focus:ring-2 focus:ring-[#f2eeff] transition-all placeholder:text-zinc-300 min-h-[44px]"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 min-h-[44px] rounded-full text-sm font-extrabold text-white bg-[var(--nc-coral)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm text-zinc-400">
              <Link
                href="/account/signin"
                className="font-black text-[var(--nc-coral)] hover:opacity-80"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
