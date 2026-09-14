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
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F9F8F6] text-[#2C2621] p-4 relative z-10">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="min-h-11 inline-flex items-center">
            <ClikdWordmark showMark textClassName="text-2xl" className="min-h-0" />
          </Link>
        </div>

        {sent ? (
          <div className="rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-7 space-y-4 shadow-none">
            <h1 className="font-playfair text-2xl font-medium text-[#2C2621] tracking-tight">
              Check your email
            </h1>
            <p className="text-sm text-[#8A857D] font-medium leading-relaxed">
              If an account exists for{' '}
              <span className="font-medium text-[#2C2621]">{email}</span>, we sent a link to
              set a new password. It may take a minute to arrive.
            </p>
            <Link
              href="/account/signin"
              className="inline-flex items-center justify-center min-h-12 w-full rounded-xl bg-[#2C3B2E] text-sm font-medium text-[#F9F8F6] hover:bg-[#243228] transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              void onSubmit(e);
            }}
            className="rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-7 flex flex-col gap-4 shadow-none"
          >
            <div>
              <h1 className="font-playfair text-2xl font-medium text-[#2C2621] tracking-tight">
                Forgot password?
              </h1>
              <p className="text-sm text-[#8A857D] font-medium mt-1">
                Enter your email and we will send a reset link.
              </p>
            </div>

            <label className="flex flex-col gap-1.5 text-[10px] font-inter font-medium text-[#8A857D] uppercase tracking-[0.14em]">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="min-h-11 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-4 py-3 text-sm text-[#2C2621] font-medium outline-none focus:border-[#2C3B2E] focus:ring-2 focus:ring-[rgba(44,59,46,0.12)] transition-all placeholder:text-[#8A857D]/70"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-[rgba(184,92,56,0.08)] border border-[rgba(184,92,56,0.2)] px-4 py-3 text-sm font-medium text-[#B85C38]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 rounded-xl text-sm font-medium text-[#F9F8F6] bg-[#2C3B2E] hover:bg-[#243228] transition-colors disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm text-[#8A857D]">
              <Link
                href="/account/signin"
                className="font-medium text-[#2C3B2E] hover:underline"
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
